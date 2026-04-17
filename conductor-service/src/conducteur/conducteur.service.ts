import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conducteur } from './entities/conducteur.entity';
import { Assignation } from './entities/assignation.entity';
import { CreateConducteurDto } from './dto/create-conducteur.dto';
import { UpdateConducteurDto } from './dto/update-conducteur.dto';
import { StatutAssignation } from './enums/statut-assignation.enum';
import { DriverProducerService } from '../kafka/driver-producer.service';

@Injectable()
export class ConducteurService {
  constructor(
    @InjectRepository(Conducteur)
    private readonly conducteurRepository: Repository<Conducteur>,
    @InjectRepository(Assignation)
    private readonly assignationRepository: Repository<Assignation>,
    private readonly driverProducer: DriverProducerService,
  ) {}

  async findAll(): Promise<Conducteur[]> {
    return this.conducteurRepository.find({ relations: ['assignations'] });
  }

  async findById(id: string): Promise<Conducteur> {
    const conducteur = await this.conducteurRepository.findOne({
      where: { id },
      relations: ['assignations'],
    });
    if (!conducteur) {
      throw new NotFoundException(`Conducteur non trouvé avec l'id : ${id}`);
    }
    return conducteur;
  }

  async create(dto: CreateConducteurDto): Promise<Conducteur> {
    const dateValidite = new Date(dto.dateValiditePermis);
    if (dateValidite <= new Date()) {
      throw new BadRequestException(
        'La date de validité du permis doit être dans le futur',
      );
    }

    const existing = await this.conducteurRepository.findOne({
      where: { numeroPermis: dto.numeroPermis },
    });
    if (existing) {
      throw new ConflictException(
        `Le numéro de permis ${dto.numeroPermis} est déjà enregistré`,
      );
    }

    const conducteur = this.conducteurRepository.create({
      nom: dto.nom,
      prenom: dto.prenom,
      numeroPermis: dto.numeroPermis,
      categoriePermis: dto.categoriePermis,
      dateValiditePermis: dateValidite,
      keycloakUserId: dto.keycloakUserId,
      username: dto.username,
      actif: dto.actif ?? true,
    });

    const saved = await this.conducteurRepository.save(conducteur);

    await this.driverProducer.sendEvent({
      eventType: 'driver.created',
      conducteurId: saved.id,
      nom: `${saved.nom} ${saved.prenom}`,
      vehiculeId: null,
      message: `Conducteur créé : ${saved.nom} ${saved.prenom}`,
    });

    return saved;
  }

  async update(id: string, dto: UpdateConducteurDto): Promise<Conducteur> {
    const conducteur = await this.findById(id);

    if (dto.dateValiditePermis) {
      const dateValidite = new Date(dto.dateValiditePermis);
      if (dateValidite <= new Date()) {
        throw new BadRequestException(
          'La date de validité du permis doit être dans le futur',
        );
      }
      conducteur.dateValiditePermis = dateValidite;
    }

    if (dto.numeroPermis && dto.numeroPermis !== conducteur.numeroPermis) {
      const existing = await this.conducteurRepository.findOne({
        where: { numeroPermis: dto.numeroPermis },
      });
      if (existing) {
        throw new ConflictException(
          `Le numéro de permis ${dto.numeroPermis} est déjà enregistré`,
        );
      }
    }

    const { dateValiditePermis: _, ...rest } = dto as any;
    Object.assign(conducteur, rest);

    return this.conducteurRepository.save(conducteur);
  }

  async delete(id: string): Promise<void> {
    const conducteur = await this.findById(id);
    await this.conducteurRepository.remove(conducteur);
  }

  async assigner(conducteurId: string, vehiculeId: string): Promise<Assignation> {
    const conducteur = await this.findById(conducteurId);

    const enCours = await this.assignationRepository.find({
      where: {
        conducteur: { id: conducteurId },
        statut: StatutAssignation.EN_COURS,
      },
      relations: ['conducteur'],
    });

    for (const a of enCours) {
      a.statut = StatutAssignation.TERMINEE;
      a.dateRetour = new Date();
      await this.assignationRepository.save(a);
    }

    const assignation = this.assignationRepository.create({
      vehiculeId,
      conducteur,
      dateDepart: new Date(),
      statut: StatutAssignation.EN_COURS,
    });

    const saved = await this.assignationRepository.save(assignation);

    await this.driverProducer.sendEvent({
      eventType: 'driver.assigned',
      conducteurId,
      nom: `${conducteur.nom} ${conducteur.prenom}`,
      vehiculeId,
      message: `Conducteur ${conducteur.nom} assigné au véhicule ${vehiculeId}`,
    });

    return saved;
  }

  async desassigner(conducteurId: string): Promise<void> {
    const conducteur = await this.findById(conducteurId);

    const enCours = await this.assignationRepository.find({
      where: {
        conducteur: { id: conducteurId },
        statut: StatutAssignation.EN_COURS,
      },
      relations: ['conducteur'],
    });

    if (enCours.length === 0) {
      throw new BadRequestException(
        `Le conducteur ${conducteurId} n'a aucune assignation en cours`,
      );
    }

    // --- CORRECTION : Récupérer l'ID du véhicule avant l'envoi Kafka ---
    const vehiculeIdConcerne = enCours[0].vehiculeId;

    for (const a of enCours) {
      a.statut = StatutAssignation.TERMINEE;
      a.dateRetour = new Date();
      await this.assignationRepository.save(a);
    }

    // --- CORRECTION : vehiculeId n'est plus null ---
    await this.driverProducer.sendEvent({
      eventType: 'driver.unassigned',
      conducteurId,
      nom: `${conducteur.nom} ${conducteur.prenom}`,
      vehiculeId: vehiculeIdConcerne,
      message: `Conducteur ${conducteur.nom} désassigné du véhicule ${vehiculeIdConcerne}`,
    });
  }

  async findMesAssignations(keycloakUserId: string): Promise<Assignation[]> {
    const conducteur = await this.conducteurRepository.findOne({
      where: { keycloakUserId },
      relations: ['assignations'],
    });
    if (!conducteur) return [];
    return conducteur.assignations ?? [];
  }

  async syncKeycloakUserId(keycloakUserId: string, username: string): Promise<void> {
    const alreadySynced = await this.conducteurRepository.findOne({ where: { keycloakUserId } });
    if (alreadySynced) return;

    const conducteur = await this.conducteurRepository.findOne({ where: { username } });
    if (!conducteur) return;

    conducteur.keycloakUserId = keycloakUserId;
    await this.conducteurRepository.save(conducteur);
  }

  async desassignerParVehicule(vehiculeId: string): Promise<void> {
    const assignations = await this.assignationRepository.find({
      where: { vehiculeId, statut: StatutAssignation.EN_COURS },
    });

    for (const a of assignations) {
      a.statut = StatutAssignation.TERMINEE;
      a.dateRetour = new Date();
      await this.assignationRepository.save(a);
    }

    if (assignations.length > 0) {
      console.log(
        `[SAGA] ${assignations.length} assignation(s) terminée(s) suite à la suppression du véhicule ${vehiculeId}`,
      );
    }
  }
}
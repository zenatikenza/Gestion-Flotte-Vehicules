import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Intervention } from './entities/intervention.entity';
import { CreateInterventionDto } from './dto/create-intervention.dto';
import { UpdateInterventionDto } from './dto/update-intervention.dto'; // Vérifie que ce DTO existe
import { StatutIntervention } from './enums/statut-intervention.enum';
import { MaintenanceProducerService } from '../kafka/maintenance-producer.service';

@Injectable()
export class InterventionService {
  constructor(
    @InjectRepository(Intervention)
    private readonly interventionRepository: Repository<Intervention>,
    private readonly maintenanceProducer: MaintenanceProducerService,
  ) {}

  // 1. Trouver tout (avec filtres optionnels)
  async findAll(filters?: {
    statut?: StatutIntervention;
    technicienId?: string;
  }): Promise<Intervention[]> {
    const where: Record<string, unknown> = {};
    if (filters?.statut) where['statut'] = filters.statut;
    if (filters?.technicienId) where['technicienId'] = filters.technicienId;
    return this.interventionRepository.find({
      where: Object.keys(where).length > 0 ? where : undefined,
      order: { datePlanifiee: 'ASC' },
    });
  }

  // 2. Trouver par ID
  async findById(id: string): Promise<Intervention> {
    const intervention = await this.interventionRepository.findOne({ where: { id } });
    if (!intervention) throw new NotFoundException('Intervention non trouvée');
    return intervention;
  }

  // 3. Trouver par véhicule (Immatriculation)
  async findByVehicule(vehiculeImmat: string): Promise<Intervention[]> {
    return this.interventionRepository.find({
      where: { vehiculeImmat },
      order: { datePlanifiee: 'ASC' },
    });
  }

  // 4. Créer (avec SAGA Kafka)
  async create(dto: CreateInterventionDto): Promise<Intervention> {
    const interventionData = this.interventionRepository.create({
      vehiculeImmat: dto.vehiculeImmat,
      technicienId: dto.technicienId,
      type: dto.type,
      datePlanifiee: new Date(dto.datePlanifiee),
      statut: dto.statut ?? StatutIntervention.PLANIFIEE,
      cout: dto.cout,
      description: dto.description,
    });

    const saved = await this.interventionRepository.save(interventionData);

    await this.maintenanceProducer.sendEvent({
      eventType: 'maintenance.created',
      interventionId: saved.id,
      vehicle_id: 0,
      vehicleImmat: saved.vehiculeImmat,
      type: saved.type,
      statut: saved.statut,
      message: `Intervention créée pour le véhicule ${saved.vehiculeImmat}`,
    });

    return saved;
  }

  // 5. Mettre à jour
  async update(id: string, dto: UpdateInterventionDto): Promise<Intervention> {
    const intervention = await this.findById(id);

    if (
      intervention.statut === StatutIntervention.TERMINEE ||
      intervention.statut === StatutIntervention.ANNULEE
    ) {
      throw new BadRequestException(
        `Impossible de modifier une intervention en statut ${intervention.statut}`,
      );
    }

    // Extraire et convertir les champs Date avant l'Object.assign pour éviter
    // que la string brute ne remplace l'objet Date correctement typé.
    const { datePlanifiee, dateRealisation, ...rest } = dto;
    Object.assign(intervention, rest);

    if (datePlanifiee) intervention.datePlanifiee = new Date(datePlanifiee);
    if (dateRealisation) intervention.dateRealisation = new Date(dateRealisation);

    const saved = await this.interventionRepository.save(intervention);

    await this.maintenanceProducer.sendEvent({
      eventType: 'maintenance.updated',
      interventionId: saved.id,
      vehicle_id: (dto as any).vehicle_id || 0,
      vehicleImmat: saved.vehiculeImmat,
      type: saved.type,
      statut: saved.statut,
      message: `Intervention ${id} mise à jour`,
    });

    return saved;
  }

  // 6. Démarrer
  async demarrer(id: string, technicienNom?: string, technicienPrenom?: string): Promise<Intervention> {
    const intervention = await this.findById(id);

    if (intervention.statut !== StatutIntervention.PLANIFIEE) {
      throw new BadRequestException(
        'Seule une intervention planifiée peut être démarrée',
      );
    }

    intervention.statut = StatutIntervention.EN_COURS;
    if (technicienNom) intervention.technicienNom = technicienNom;
    if (technicienPrenom) intervention.technicienPrenom = technicienPrenom;
    const saved = await this.interventionRepository.save(intervention);

    await this.maintenanceProducer.sendEvent({
      eventType: 'maintenance.started',
      interventionId: saved.id,
      vehicle_id: 0,
      vehicleImmat: saved.vehiculeImmat,
      type: saved.type,
      statut: saved.statut,
      message: `Intervention démarrée`,
    });

    return saved;
  }

  // 7. Terminer
  async terminer(id: string, cout?: number, technicienNom?: string, technicienPrenom?: string): Promise<Intervention> {
    const intervention = await this.findById(id);

    if (
      intervention.statut === StatutIntervention.TERMINEE ||
      intervention.statut === StatutIntervention.ANNULEE
    ) {
      throw new BadRequestException(
        `Impossible de terminer une intervention en statut ${intervention.statut}`,
      );
    }

    intervention.statut = StatutIntervention.TERMINEE;
    intervention.dateRealisation = new Date();
    intervention.dateTraitement = new Date();
    if (cout !== undefined) intervention.cout = cout;
    if (technicienNom) intervention.technicienNom = technicienNom;
    if (technicienPrenom) intervention.technicienPrenom = technicienPrenom;

    const saved = await this.interventionRepository.save(intervention);

    await this.maintenanceProducer.sendEvent({
      eventType: 'maintenance.completed',
      interventionId: saved.id,
      vehicle_id: 0,
      vehicleImmat: saved.vehiculeImmat,
      type: saved.type,
      statut: saved.statut,
      message: `Intervention terminée`,
    });

    return saved;
  }

  // 7. Annuler
  async annuler(id: string): Promise<Intervention> {
    const intervention = await this.findById(id);

    if (
      intervention.statut === StatutIntervention.TERMINEE ||
      intervention.statut === StatutIntervention.ANNULEE
    ) {
      throw new BadRequestException(
        `Impossible d'annuler une intervention en statut ${intervention.statut}`,
      );
    }

    intervention.statut = StatutIntervention.ANNULEE;
    const saved = await this.interventionRepository.save(intervention);

    await this.maintenanceProducer.sendEvent({
      eventType: 'maintenance.cancelled',
      interventionId: saved.id,
      vehicle_id: 0,
      vehicleImmat: saved.vehiculeImmat,
      type: saved.type,
      statut: saved.statut,
      message: `Intervention annulée`,
    });

    return saved;
  }

  // 8. Supprimer
  async delete(id: string): Promise<void> {
    const intervention = await this.findById(id);

    if (intervention.statut === StatutIntervention.EN_COURS) {
      throw new BadRequestException(
        'Impossible de supprimer une intervention en cours',
      );
    }

    await this.interventionRepository.remove(intervention);
  }

  // 9. Pour la SAGA (Annulation auto)
  async annulerParVehicule(vehiculeImmat: string): Promise<void> {
    const interventions = await this.interventionRepository.find({
      where: [
        { vehiculeImmat, statut: StatutIntervention.PLANIFIEE },
        { vehiculeImmat, statut: StatutIntervention.EN_COURS },
      ],
    });

    for (const intervention of interventions) {
      intervention.statut = StatutIntervention.ANNULEE;
      await this.interventionRepository.save(intervention);
    }
  }
}
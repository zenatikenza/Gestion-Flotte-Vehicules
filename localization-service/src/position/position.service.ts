import {
  Injectable,
  NotFoundException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Position } from './entities/position.entity';
import { CreatePositionDto } from './dto/create-position.dto';
import { GeofencingService } from '../geofencing/geofencing.service';
import { LocationProducerService } from '../kafka/location-producer.service';
import { GpsSimulatorService } from '../simulation/gps-simulator.service';

@Injectable()
export class PositionService implements OnModuleInit {
  private readonly logger = new Logger(PositionService.name);

  constructor(
    @InjectRepository(Position)
    private readonly positionRepository: Repository<Position>,
    private readonly geofencingService: GeofencingService,
    private readonly locationProducer: LocationProducerService,
    private readonly gpsSimulator: GpsSimulatorService,
  ) {}

  /**
   * Fournit la référence de ce service au simulateur GPS après
   * l'initialisation du module (évite la dépendance circulaire au constructeur).
   */
  onModuleInit(): void {
    this.gpsSimulator.setPositionService(this);
  }

  /**
   * Sauvegarde une position GPS, vérifie le géofencing,
   * puis publie les événements Kafka correspondants.
   */
  async savePosition(dto: CreatePositionDto): Promise<Position> {
    // 1. Vérification géofencing
    const { enZoneAutorisee, distanceKm } = this.geofencingService.checkPosition(
      dto.latitude,
      dto.longitude,
    );

    // 2. Persistance en base
    const position = this.positionRepository.create({
      vehiculeId: dto.vehiculeId,
      latitude: dto.latitude,
      longitude: dto.longitude,
      vitesse: dto.vitesse ?? 0,
      enZoneAutorisee,
    });
    const saved = await this.positionRepository.save(position);

    // 3. Publication sur location-updates
    await this.locationProducer.sendLocationUpdate({
      vehiculeId: saved.vehiculeId,
      latitude: saved.latitude,
      longitude: saved.longitude,
      vitesse: saved.vitesse,
      enZoneAutorisee,
      horodatage: saved.horodatage.toISOString(),
    });

    // 4. Alerte géofencing si hors zone
    if (!enZoneAutorisee) {
      await this.locationProducer.sendGeofencingAlert({
        vehiculeId: saved.vehiculeId,
        latitude: saved.latitude,
        longitude: saved.longitude,
        distanceKm,
        message: `Véhicule ${saved.vehiculeId} hors zone autorisée (${distanceKm.toFixed(1)} km de Paris)`,
        severity: distanceKm > 100 ? 'CRITICAL' : 'WARNING',
        timestamp: saved.horodatage.toISOString(),
      });
    }

    return saved;
  }

  /** Retourne la dernière position connue d'un véhicule. */
  async findLatest(vehiculeId: string): Promise<Position> {
    const position = await this.positionRepository.findOne({
      where: { vehiculeId },
      order: { horodatage: 'DESC' },
    });

    if (!position) {
      throw new NotFoundException(
        `Aucune position trouvée pour le véhicule ${vehiculeId}`,
      );
    }
    return position;
  }

  /**
   * Retourne l'historique des positions d'un véhicule sur une période.
   * Optimisé pour TimescaleDB en prod (range scan sur la colonne horodatage).
   */
  async findByRange(
    vehiculeId: string,
    debut: Date,
    fin: Date,
  ): Promise<Position[]> {
    return this.positionRepository.find({
      where: {
        vehiculeId,
        horodatage: Between(debut, fin),
      },
      order: { horodatage: 'ASC' },
    });
  }

  /** Retourne toutes les dernières positions (une par véhicule actif). */
  async findAllLatest(): Promise<Position[]> {
    // Sous-requête : MAX(horodatage) par vehiculeId
    return this.positionRepository
      .createQueryBuilder('p')
      .where(
        `p.horodatage = (
          SELECT MAX(p2.horodatage)
          FROM position p2
          WHERE p2.vehicule_id = p.vehicule_id
        )`,
      )
      .orderBy('p.horodatage', 'DESC')
      .getMany();
  }
}

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Kafka, Producer, Partitioners } from 'kafkajs';

export interface LocationUpdateEvent {
  vehiculeId: string;
  latitude: number;
  longitude: number;
  vitesse: number;
  enZoneAutorisee: boolean;
  horodatage: string;
}

export interface GeofencingAlertEvent {
  vehiculeId: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  message: string;
  severity: 'WARNING' | 'CRITICAL';
  timestamp: string;
}

/**
 * Producteur Kafka du localization-service.
 *
 * Topics publiés :
 *   - location-updates       : mise à jour GPS toutes les 5 s par véhicule actif
 *   - system-notifications   : alerte géofencing quand un véhicule sort de la zone
 */
@Injectable()
export class LocationProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LocationProducerService.name);
  private readonly kafka: Kafka;
  private readonly producer: Producer;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'localization-service-producer',
      brokers: [process.env.KAFKA_BROKERS || 'localhost:9092'],
    });
    this.producer = this.kafka.producer({
      createPartitioner: Partitioners.LegacyPartitioner,
    });
  }

  async onModuleInit(): Promise<void> {
    await this.producer.connect();
    this.logger.log('[Kafka] Producer localization-service connecté');
  }

  async onModuleDestroy(): Promise<void> {
    await this.producer.disconnect();
  }

  /** Publie la position GPS d'un véhicule sur location-updates */
  async sendLocationUpdate(event: LocationUpdateEvent): Promise<void> {
    await this.producer.send({
      topic: 'location-updates',
      messages: [
        {
          key: event.vehiculeId,
          value: JSON.stringify(event),
        },
      ],
    });
    this.logger.debug(
      `>>> [Kafka] location-updates : véhicule ${event.vehiculeId} ` +
      `(${event.latitude.toFixed(4)}, ${event.longitude.toFixed(4)})`,
    );
  }

  /**
   * Publie une alerte géofencing sur system-notifications.
   * Appelé quand un véhicule sort du cercle de 50 km autour de Paris.
   */
  async sendGeofencingAlert(event: GeofencingAlertEvent): Promise<void> {
    await this.producer.send({
      topic: 'system-notifications',
      messages: [
        {
          key: event.vehiculeId,
          value: JSON.stringify({
            type: 'GEOFENCING_ALERT',
            ...event,
          }),
        },
      ],
    });
    this.logger.warn(
      `!!! [Kafka] ALERTE GÉOFENCING : véhicule ${event.vehiculeId} ` +
      `à ${event.distanceKm.toFixed(1)} km de Paris`,
    );
  }
}

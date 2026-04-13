import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Kafka, Consumer } from 'kafkajs';
import { GpsSimulatorService } from '../simulation/gps-simulator.service';

/**
 * Consommateur Kafka — topic vehicle-events.
 *
 * Rôle : maintenir la liste des véhicules actifs dans le simulateur GPS.
 *   - vehicle_created  → ajoute le véhicule à la simulation
 *   - vehicle_deleted  → retire le véhicule de la simulation
 *   - vehicle_updated  (statut AVAILABLE)  → réactive le véhicule
 *   - vehicle_updated  (statut MAINTENANCE) → suspend la simulation
 */
@Injectable()
export class VehicleEventConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(VehicleEventConsumer.name);
  private readonly kafka: Kafka;
  private readonly consumer: Consumer;

  constructor(private readonly gpsSimulator: GpsSimulatorService) {
    this.kafka = new Kafka({
      clientId: 'localization-service-consumer',
      brokers: [process.env.KAFKA_BROKERS || 'localhost:9092'],
    });
    this.consumer = this.kafka.consumer({
      groupId: 'localization-fleet-group',
    });
  }

  async onModuleInit(): Promise<void> {
    await this.consumer.connect();
    await this.consumer.subscribe({
      topic: 'vehicle-events',
      fromBeginning: false,
    });

    await this.consumer.run({
      eachMessage: async ({ message }) => {
        try {
          const event = JSON.parse(message.value.toString());
          const vehiculeId = String(event.vehicle_id ?? event.vehiculeId ?? '');

          if (!vehiculeId) return;

          const eventType: string = event.event_type ?? event.eventType ?? '';

          switch (eventType) {
            case 'vehicle_created':
            case 'VEHICLE_CREATED':
              this.gpsSimulator.addVehicle(vehiculeId);
              break;

            case 'vehicle_deleted':
            case 'VEHICLE_DELETED':
              this.gpsSimulator.removeVehicle(vehiculeId);
              break;

            case 'vehicle_updated':
            case 'VEHICLE_UPDATED': {
              const status: string = event.status ?? event.statut ?? '';
              if (status === 'AVAILABLE' || status === 'DISPONIBLE') {
                this.gpsSimulator.addVehicle(vehiculeId);
              } else if (status === 'MAINTENANCE' || status === 'EN_MAINTENANCE') {
                this.gpsSimulator.removeVehicle(vehiculeId);
              }
              break;
            }

            default:
              this.logger.debug(`[KAFKA] Événement vehicle ignoré : ${eventType}`);
          }
        } catch (err) {
          this.logger.error('[KAFKA] Erreur traitement vehicle-events :', err.message);
        }
      },
    });

    this.logger.log('[Kafka] Consumer localization-service abonné à vehicle-events');
  }

  async onModuleDestroy(): Promise<void> {
    await this.consumer.disconnect();
  }
}

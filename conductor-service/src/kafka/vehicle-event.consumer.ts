import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Consumer } from 'kafkajs';
import { ConducteurService } from '../conducteur/conducteur.service';

@Injectable()
export class VehicleEventConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly kafka: Kafka;
  private readonly consumer: Consumer;

  constructor(private readonly conducteurService: ConducteurService) {
    this.kafka = new Kafka({
      clientId: 'conductor-service-consumer',
      brokers: [(process.env.KAFKA_BROKERS || 'localhost:9092')],
    });
    this.consumer = this.kafka.consumer({
      groupId: 'conductor-fleet-group',
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
          console.log(
            `[KAFKA CONSUMER] Événement vehicle reçu : ${event.event_type || event.eventType}`,
          );

          // SAGA : si un véhicule est supprimé, désassigner automatiquement
          if (event.event_type === 'vehicle_deleted' && event.vehicle_id) {
            await this.conducteurService.desassignerParVehicule(
              String(event.vehicle_id),
            );
          }
        } catch (err) {
          console.error('[KAFKA CONSUMER] Erreur de traitement du message :', err);
        }
      },
    });

    console.log('[Kafka] Consumer conductor-service abonné à vehicle-events');
  }

  async onModuleDestroy(): Promise<void> {
    await this.consumer.disconnect();
  }
}

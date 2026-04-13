import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Producer, Partitioners } from 'kafkajs';
import { MaintenanceEvent } from './maintenance-event.dto';

@Injectable()
export class MaintenanceProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly kafka: Kafka;
  private readonly producer: Producer;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'maintenance-service-producer',
      brokers: [(process.env.KAFKA_BROKERS || 'localhost:9092')],
    });
    this.producer = this.kafka.producer({
      createPartitioner: Partitioners.LegacyPartitioner,
    });
  }

  async onModuleInit(): Promise<void> {
    await this.producer.connect();
    console.log('[Kafka] Producer maintenance-service connecté');
  }

  async onModuleDestroy(): Promise<void> {
    await this.producer.disconnect();
  }

  async sendEvent(event: MaintenanceEvent): Promise<void> {
    const payload: MaintenanceEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    await this.producer.send({
      topic: 'maintenance-alerts',
      messages: [
        {
          key: event.interventionId,
          value: JSON.stringify(payload),
        },
      ],
    });

    console.log(
      `>>> [Kafka] Événement envoyé sur maintenance-alerts : ${event.eventType} — ${event.message}`,
    );
  }
}

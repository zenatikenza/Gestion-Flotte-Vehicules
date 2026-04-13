import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Producer, Partitioners } from 'kafkajs';
import { DriverEvent } from './driver-event.dto';

@Injectable()
export class DriverProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly kafka: Kafka;
  private readonly producer: Producer;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'conductor-service-producer',
      brokers: [(process.env.KAFKA_BROKERS || 'localhost:9092')],
    });
    this.producer = this.kafka.producer({
      createPartitioner: Partitioners.LegacyPartitioner,
    });
  }

  async onModuleInit(): Promise<void> {
    await this.producer.connect();
    console.log('[Kafka] Producer conductor-service connecté');
  }

  async onModuleDestroy(): Promise<void> {
    await this.producer.disconnect();
  }

  async sendEvent(event: DriverEvent): Promise<void> {
    const payload: DriverEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    await this.producer.send({
      topic: 'driver-events',
      messages: [
        {
          key: event.conducteurId,
          value: JSON.stringify(payload),
        },
      ],
    });

    console.log(
      `>>> [Kafka] Événement envoyé sur driver-events : ${event.eventType} — ${event.message}`,
    );
  }
}

import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
  Logger,
} from '@nestjs/common';
import { Kafka, Consumer } from 'kafkajs';
import { PubSub } from 'graphql-subscriptions';
import { PUB_SUB } from './pubsub.provider';

/** Nom de l'événement PubSub utilisé par la Subscription GraphQL */
export const POSITION_UPDATED_EVENT = 'position_updated';

/**
 * Consommateur Kafka dans l'api-gateway.
 *
 * Écoute le topic `location-updates` publié par le localization-service,
 * puis re-publie chaque message dans le PubSub en mémoire.
 * Le resolver LocationResolver.positionEnTempsReel() s'abonne au PubSub
 * et filtre les événements par vehiculeId avant de les envoyer au client WebSocket.
 */
@Injectable()
export class LocationKafkaConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LocationKafkaConsumer.name);
  private readonly kafka: Kafka;
  private readonly consumer: Consumer;

  constructor(@Inject(PUB_SUB) private readonly pubSub: PubSub) {
    this.kafka = new Kafka({
      clientId: 'api-gateway-location-consumer',
      brokers: [process.env.KAFKA_BROKERS || 'localhost:9092'],
    });
    this.consumer = this.kafka.consumer({
      groupId: 'api-gateway-location-group',
    });
  }

  async onModuleInit(): Promise<void> {
    await this.consumer.connect();
    await this.consumer.subscribe({
      topic: 'location-updates',
      fromBeginning: false,
    });

    await this.consumer.run({
      eachMessage: async ({ message }) => {
        try {
          const payload = JSON.parse(message.value.toString());

          // Normalise le payload pour correspondre au type GraphQL Position
          const position = {
            vehiculeId:      payload.vehiculeId,
            latitude:        payload.latitude,
            longitude:       payload.longitude,
            vitesse:         payload.vitesse ?? 0,
            horodatage:      payload.horodatage,
            enZoneAutorisee: payload.enZoneAutorisee ?? true,
          };

          // Publie dans le PubSub → déclenche la Subscription WebSocket
          await this.pubSub.publish(POSITION_UPDATED_EVENT, {
            positionEnTempsReel: position,
          });

          this.logger.debug(
            `[PubSub] position_updated → véhicule ${position.vehiculeId}`,
          );
        } catch (err) {
          this.logger.error(
            `[KAFKA] Erreur traitement location-updates : ${err.message}`,
          );
        }
      },
    });

    this.logger.log('[Kafka] api-gateway abonné à location-updates');
  }

  async onModuleDestroy(): Promise<void> {
    await this.consumer.disconnect();
  }
}

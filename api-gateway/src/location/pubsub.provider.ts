import { PubSub } from 'graphql-subscriptions';

/** Token d'injection pour le PubSub partagé */
export const PUB_SUB = 'PUB_SUB';

/**
 * Instance PubSub en mémoire partagée entre le consommateur Kafka
 * (LocationKafkaConsumer) et le resolver GraphQL (LocationResolver).
 *
 * En production avec plusieurs répliques, remplacer par un PubSub Redis
 * (package `graphql-redis-subscriptions`) pour propager les événements
 * entre les instances de l'api-gateway.
 */
export const pubSubProvider = {
  provide: PUB_SUB,
  useValue: new PubSub(),
};

import { Module } from '@nestjs/common';
import { LocationResolver } from './location.resolver';
import { LocationKafkaConsumer } from './location-kafka.consumer';
import { LocalizationClient } from '../clients/localization.client';
import { pubSubProvider } from './pubsub.provider';

/**
 * Module de localisation GPS dans l'api-gateway.
 *
 * Fournit :
 *   - LocationResolver          : Queries positionActuelle, historiquePositions + Subscription
 *   - LocationKafkaConsumer     : consomme location-updates → pubSub.publish()
 *   - LocalizationClient        : client HTTP vers localization-service:8084
 *   - pubSubProvider            : PubSub in-memory partagé
 */
@Module({
  providers: [
    LocationResolver,
    LocationKafkaConsumer,
    LocalizationClient,
    pubSubProvider,
  ],
  exports: [LocalizationClient],
})
export class LocationModule {}

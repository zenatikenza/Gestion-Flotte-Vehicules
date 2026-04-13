import {
  Resolver,
  Query,
  Subscription,
  Args,
  Context,
} from '@nestjs/graphql';
import { Inject } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { LocalizationClient } from '../clients/localization.client';
import { PUB_SUB } from './pubsub.provider';
import { POSITION_UPDATED_EVENT } from './location-kafka.consumer';

/**
 * Resolver GraphQL pour les opérations de localisation GPS.
 *
 * Queries :
 *   positionActuelle(vehiculeId)                     → dernière position (REST → localization-service)
 *   historiquePositions(vehiculeId, debut, fin)       → historique (REST → localization-service)
 *
 * Subscription :
 *   positionEnTempsReel(vehiculeId)                  → WebSocket, alimenté par Kafka PubSub
 */
@Resolver('Position')
export class LocationResolver {
  constructor(
    private readonly localizationClient: LocalizationClient,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  private extractToken(ctx: any): string | undefined {
    return ctx?.req?.headers?.authorization;
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  @Query('positionActuelle')
  async positionActuelle(
    @Args('vehiculeId') vehiculeId: string,
    @Context() ctx: any,
  ) {
    return this.localizationClient.findLatest(vehiculeId, this.extractToken(ctx));
  }

  @Query('historiquePositions')
  async historiquePositions(
    @Args('vehiculeId') vehiculeId: string,
    @Args('debut') debut: string,
    @Args('fin') fin: string,
    @Context() ctx: any,
  ) {
    return this.localizationClient.findHistorique(
      vehiculeId,
      debut,
      fin,
      this.extractToken(ctx),
    );
  }

  // ── Subscription ──────────────────────────────────────────────────────────

  /**
   * Subscription WebSocket — positions GPS en temps réel.
   *
   * Filtre côté serveur : seules les positions du vehiculeId demandé
   * sont envoyées au client abonné.
   *
   * Flux complet :
   *   localization-service (GPS tick 5s)
   *     → Kafka topic location-updates
   *       → LocationKafkaConsumer (api-gateway)
   *         → PubSub.publish('position_updated', { positionEnTempsReel })
   *           → Subscription WebSocket filtrée par vehiculeId
   *             → Client frontend (ex : carte leaflet)
   */
  @Subscription('positionEnTempsReel', {
    filter: (payload: any, variables: any) =>
      payload.positionEnTempsReel.vehiculeId === variables.vehiculeId,
  })
  positionEnTempsReel(@Args('vehiculeId') _vehiculeId: string) {
    return this.pubSub.asyncIterator(POSITION_UPDATED_EVENT);
  }
}

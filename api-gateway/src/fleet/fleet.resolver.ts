import {
  Resolver,
  Query,
  Mutation,
  Args,
  ResolveField,
  Parent,
  Context,
} from '@nestjs/graphql';
import { VehicleClient } from '../clients/vehicle.client';
import { ConductorClient } from '../clients/conductor.client';
import { MaintenanceClient } from '../clients/maintenance.client';
import { LocalizationClient } from '../clients/localization.client';

/**
 * Resolver GraphQL principal de la gateway.
 *
 * Le header Authorization (Bearer <token>) est extrait du contexte HTTP et
 * transmis à chaque appel vers les services en aval, de façon à ce que
 * Spring Security (vehicle-service) et les guards NestJS (conductor-service,
 * maintenance-service) puissent valider le JWT Keycloak.
 */
@Resolver('FleetVehicle')
export class FleetResolver {
  constructor(
    private readonly vehicleClient: VehicleClient,
    private readonly conductorClient: ConductorClient,
    private readonly maintenanceClient: MaintenanceClient,
    private readonly localizationClient: LocalizationClient,
  ) {}

  // ── Helpers ───────────────────────────────────────────────────────────────

  private extractToken(ctx: any): string | undefined {
    return ctx?.req?.headers?.authorization;
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  @Query('fleetVehicles')
  async fleetVehicles(@Context() ctx: any): Promise<any[]> {
    return this.vehicleClient.findAll(this.extractToken(ctx));
  }

  @Query('fleetVehicle')
  async fleetVehicle(
    @Args('id') id: string,
    @Context() ctx: any,
  ): Promise<any | null> {
    return this.vehicleClient.findById(id, this.extractToken(ctx));
  }

  @Query('conducteurs')
  async conducteurs(@Context() ctx: any): Promise<any[]> {
    return this.conductorClient.findAll(this.extractToken(ctx));
  }

  @Query('interventions')
  async queryInterventions(
    @Args('vehiculeImmat') vehiculeImmat?: string,
    @Context() ctx?: any,
  ): Promise<any[]> {
    return this.maintenanceClient.findAll(vehiculeImmat, this.extractToken(ctx));
  }

  // ── Field resolvers sur FleetVehicle ──────────────────────────────────────

  @ResolveField('conducteurAssigne')
  async conducteurAssigne(
    @Parent() vehicle: any,
    @Context() ctx: any,
  ): Promise<any | null> {
    return this.conductorClient.findAssignedToVehicle(
      vehicle._id ?? vehicle.id,
      this.extractToken(ctx),
    );
  }

  @ResolveField('interventions')
  async resolveInterventions(
    @Parent() vehicle: any,
    @Context() ctx: any,
  ): Promise<any[]> {
    const immat = vehicle._licensePlate ?? vehicle.immatriculation;
    return this.maintenanceClient.findByImmat(immat, this.extractToken(ctx));
  }

  /**
   * Champ positionActuelle sur FleetVehicle.
   * Appelé automatiquement pour chaque véhicule retourné par fleetVehicles()
   * ou fleetVehicle(). Retourne null si le véhicule n'a pas encore de position.
   */
  @ResolveField('positionActuelle')
  async resolvePositionActuelle(
    @Parent() vehicle: any,
    @Context() ctx: any,
  ): Promise<any | null> {
    const vehiculeId = vehicle._id ?? vehicle.id;
    return this.localizationClient.findLatest(vehiculeId, this.extractToken(ctx));
  }

  // ── Mutation ──────────────────────────────────────────────────────────────

  @Mutation('assignerConducteur')
  async assignerConducteur(
    @Args('conducteurId') conducteurId: string,
    @Args('vehiculeId') vehiculeId: string,
    @Context() ctx: any,
  ): Promise<any> {
    return this.conductorClient.assigner(
      conducteurId,
      vehiculeId,
      this.extractToken(ctx),
    );
  }
}

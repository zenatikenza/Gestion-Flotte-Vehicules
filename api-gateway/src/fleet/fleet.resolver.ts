import {
  Resolver,
  Query,
  Mutation,
  Args,
  ResolveField,
  Parent,
  Context,
} from '@nestjs/graphql';
import { Logger } from '@nestjs/common';
import { VehicleClient } from '../clients/vehicle.client';
import { ConductorClient } from '../clients/conductor.client';
import { MaintenanceClient } from '../clients/maintenance.client';
import { LocalizationClient } from '../clients/localization.client';
import { KeycloakAdminClient } from '../clients/keycloak-admin.client';

@Resolver('FleetVehicle')
export class FleetResolver {
  private readonly logger = new Logger(FleetResolver.name);

  constructor(
    private readonly vehicleClient: VehicleClient,
    private readonly conductorClient: ConductorClient,
    private readonly maintenanceClient: MaintenanceClient,
    private readonly localizationClient: LocalizationClient,
    private readonly keycloakAdmin: KeycloakAdminClient,
  ) {}

  private extractToken(ctx: any): string | undefined {
    return ctx?.req?.headers?.authorization;
  }

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

  @ResolveField('positionActuelle')
  async resolvePositionActuelle(
    @Parent() vehicle: any,
    @Context() ctx: any,
  ): Promise<any | null> {
    const vehiculeId = vehicle._id ?? vehicle.id;
    return this.localizationClient.findLatest(vehiculeId, this.extractToken(ctx));
  }

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

  @Query('adminUsers')
  async adminUsers(@Context() ctx: any): Promise<any[]> {
    this.keycloakAdmin.assertAdmin(ctx);
    return this.keycloakAdmin.listUsers();
  }

  @Query('adminStats')
  async adminStats(@Context() ctx: any): Promise<any> {
    this.keycloakAdmin.assertAdmin(ctx);
    const users = await this.keycloakAdmin.listUsers();
    return {
      totalUtilisateurs: users.length,
      admins: users.filter((u) => u.realmRoles?.includes('admin')).length,
      managers: users.filter((u) => u.realmRoles?.includes('manager')).length,
      techniciens: users.filter((u) => u.realmRoles?.includes('technicien')).length,
      utilisateurs: users.filter((u) => u.realmRoles?.includes('utilisateur')).length,
      actifs: users.filter((u) => u.enabled).length,
      inactifs: users.filter((u) => !u.enabled).length,
    };
  }

  @Query('fleetStats')
  async fleetStats(@Context() ctx: any): Promise<any> {
    const token = this.extractToken(ctx);
    const [vehicles, conducteurs, interventions] = await Promise.all([
      this.vehicleClient.findAll(token),
      this.conductorClient.findAll(token),
      this.maintenanceClient.findAll(undefined, token),
    ]);

    const assignationsActives = conducteurs.reduce((count: number, c: any) => {
      const active = (c.assignations ?? []).filter((a: any) => a.statut === 'EN_COURS');
      return count + active.length;
    }, 0);

    const interventionsActives = interventions.filter(
      (i: any) => i.statut === 'PLANIFIEE' || i.statut === 'EN_COURS',
    ).length;

    return {
      totalVehicules: vehicles.length,
      disponibles: vehicles.filter((v: any) => v.status === 'AVAILABLE').length,
      enService: vehicles.filter((v: any) => v.status === 'RESERVED').length,
      enMaintenance: vehicles.filter((v: any) => v.status === 'MAINTENANCE').length,
      horsService: vehicles.filter((v: any) => v.status === 'OUT_OF_SERVICE').length,
      totalConducteurs: conducteurs.length,
      assignationsActives,
      interventionsActives,
    };
  }

  @Mutation('createUser')
  async createUser(
    @Args('username') username: string,
    @Args('email') email: string,
    @Args('firstName') firstName: string,
    @Args('lastName') lastName: string,
    @Args('password') password: string,
    @Args('roles') roles: string[],
    @Args('numeroPermis') numeroPermis: string,
    @Args('categoriePermis') categoriePermis: string,
    @Args('dateValiditePermis') dateValiditePermis: string,
    @Context() ctx: any,
  ): Promise<any> {
    this.keycloakAdmin.assertAdmin(ctx);
    const token = this.extractToken(ctx);

    // 1. Création dans Keycloak
    const keycloakUser = await this.keycloakAdmin.createUser({ 
      username, 
      email, 
      firstName, 
      lastName, 
      password, 
      roles 
    });

    // 2. Synchronisation avec le microservice Conductor
    if (roles.includes('utilisateur')) {
      try {
        // Transformation de la date JJ/MM/AAAA vers AAAA-MM-JJ
        let isoDate = dateValiditePermis;
        if (dateValiditePermis.includes('/')) {
          const [day, month, year] = dateValiditePermis.split('/');
          isoDate = `${year}-${month}-${day}`;
        }

        await this.conductorClient.create({
          keycloakUserId: keycloakUser.id,
          nom: lastName || username,
          prenom: firstName || '',
          numeroPermis: numeroPermis,
          categoriePermis: categoriePermis,
          dateValiditePermis: isoDate,
          actif: true
        }, token);
      } catch (error: any) {
        this.logger.error(`Erreur création conducteur : ${error.response?.data?.message || error.message}`);
      }
    }

    // 3. Forcer les rôles dans la réponse pour assurer la bonne redirection
    return {
      id: keycloakUser.id,
      username: keycloakUser.username,
      email: keycloakUser.email,
      firstName: keycloakUser.firstName,
      lastName: keycloakUser.lastName,
      enabled: keycloakUser.enabled,
      realmRoles: (keycloakUser.realmRoles && keycloakUser.realmRoles.length > 0) 
        ? keycloakUser.realmRoles 
        : roles
    };
  }

  @Mutation('toggleUser')
  async toggleUser(
    @Args('userId') userId: string,
    @Args('enabled') enabled: boolean,
    @Context() ctx: any,
  ): Promise<any> {
    this.keycloakAdmin.assertAdmin(ctx);
    return this.keycloakAdmin.toggleUser(userId, enabled);
  }

  @Mutation('resetPassword')
  async resetPassword(
    @Args('userId') userId: string,
    @Args('newPassword') newPassword: string,
    @Context() ctx: any,
  ): Promise<boolean> {
    this.keycloakAdmin.assertAdmin(ctx);
    return this.keycloakAdmin.resetPassword(userId, newPassword);
  }
}
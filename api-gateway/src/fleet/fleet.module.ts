import { Module } from '@nestjs/common';
import { FleetResolver } from './fleet.resolver';
import { VehicleClient } from '../clients/vehicle.client';
import { ConductorClient } from '../clients/conductor.client';
import { MaintenanceClient } from '../clients/maintenance.client';
import { LocalizationClient } from '../clients/localization.client';

@Module({
  providers: [
    FleetResolver,
    VehicleClient,
    ConductorClient,
    MaintenanceClient,
    LocalizationClient,
  ],
})
export class FleetModule {}

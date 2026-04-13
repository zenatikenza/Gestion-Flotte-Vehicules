import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Position } from './entities/position.entity';
import { PositionService } from './position.service';
import { PositionController } from './position.controller';
import { PositionGrpcController } from './position.grpc.controller';
import { GeofencingService } from '../geofencing/geofencing.service';
import { GpsSimulatorService } from '../simulation/gps-simulator.service';
import { VehicleEventConsumer } from '../kafka/vehicle-event.consumer';

/**
 * Module principal du localization-service.
 *
 * Providers :
 *   - PositionService       : logique métier GPS + géofencing + Kafka events
 *   - GeofencingService     : calcul haversine + vérification zone Paris 50 km
 *   - GpsSimulatorService   : tick toutes les 5 s pour tous les véhicules actifs
 *   - VehicleEventConsumer  : écoute vehicle-events pour gérer la liste des actifs
 *   - PositionGrpcController: endpoints gRPC (GetCurrentPosition, StreamPositions)
 *
 * Note : LocationProducerService est injecté via le KafkaModule @Global().
 * VehicleEventConsumer est ici (pas dans KafkaModule) car il dépend de
 * GpsSimulatorService — même pattern que conductor-service/ConducteurModule.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Position])],
  controllers: [PositionController, PositionGrpcController],
  providers: [
    PositionService,
    GeofencingService,
    GpsSimulatorService,
    VehicleEventConsumer,
  ],
  exports: [PositionService],
})
export class PositionModule {}

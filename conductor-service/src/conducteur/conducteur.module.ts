import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConducteurController } from './conducteur.controller';
import { ConducteurService } from './conducteur.service';
import { Conducteur } from './entities/conducteur.entity';
import { Assignation } from './entities/assignation.entity';
import { VehicleEventConsumer } from '../kafka/vehicle-event.consumer';

/**
 * ConducteurModule ne réimporte pas KafkaModule car ce dernier est @Global().
 * DriverProducerService est donc disponible ici par injection directe.
 * VehicleEventConsumer est déclaré ici (pas dans KafkaModule) pour éviter
 * toute dépendance circulaire : il a besoin de ConducteurService.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Conducteur, Assignation])],
  controllers: [ConducteurController],
  providers: [ConducteurService, VehicleEventConsumer],
  exports: [ConducteurService],
})
export class ConducteurModule {}

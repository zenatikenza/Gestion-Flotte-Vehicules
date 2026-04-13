import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InterventionController } from './intervention.controller';
import { InterventionService } from './intervention.service';
import { Intervention } from './entities/intervention.entity';

/**
 * InterventionModule ne réimporte pas KafkaModule car ce dernier est @Global().
 * MaintenanceProducerService est donc disponible ici par injection directe.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Intervention])],
  controllers: [InterventionController],
  providers: [InterventionService],
  exports: [InterventionService],
})
export class InterventionModule {}

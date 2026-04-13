import { Global, Module } from '@nestjs/common';
import { MaintenanceProducerService } from './maintenance-producer.service';

/**
 * Module Kafka global — MaintenanceProducerService disponible dans toute l'application
 * sans avoir besoin de l'importer dans chaque module.
 */
@Global()
@Module({
  providers: [MaintenanceProducerService],
  exports: [MaintenanceProducerService],
})
export class KafkaModule {}

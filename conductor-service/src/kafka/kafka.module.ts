import { Global, Module } from '@nestjs/common';
import { DriverProducerService } from './driver-producer.service';

/**
 * Module Kafka global — DriverProducerService disponible dans toute l'application
 * sans avoir besoin de l'importer dans chaque module.
 */
@Global()
@Module({
  providers: [DriverProducerService],
  exports: [DriverProducerService],
})
export class KafkaModule {}

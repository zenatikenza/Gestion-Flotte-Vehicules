import { Global, Module } from '@nestjs/common';
import { LocationProducerService } from './location-producer.service';

/**
 * Module Kafka global — LocationProducerService disponible dans toute l'application
 * sans avoir besoin de l'importer dans chaque module.
 * VehicleEventConsumer est déclaré dans PositionModule (pas ici) pour éviter
 * toute dépendance circulaire : il a besoin de GpsSimulatorService.
 */
@Global()
@Module({
  providers: [LocationProducerService],
  exports: [LocationProducerService],
})
export class KafkaModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Position } from './position/entities/position.entity';
import { KafkaModule } from './kafka/kafka.module';
import { PositionModule } from './position/position.module';

/**
 * Module racine du localization-service.
 *
 * Base de données : PostgreSQL standard (localization_db).
 * En production, activer l'extension TimescaleDB sur la table `position`
 * avec la commande :
 *   SELECT create_hypertable('position', 'horodatage');
 * Cela transforme la table en hypertable partitionnée par temps,
 * optimisant les requêtes time-series sur les données GPS.
 */
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'admin_password',
      database: process.env.DB_NAME || 'localization_db',
      entities: [Position],
      synchronize: true,
    }),
    // Active les décorateurs @Interval / @Cron pour le simulateur GPS
    ScheduleModule.forRoot(),
    KafkaModule,      // @Global — LocationProducerService disponible partout
    PositionModule,
  ],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Intervention } from './intervention/entities/intervention.entity';
import { KafkaModule } from './kafka/kafka.module';
import { InterventionModule } from './intervention/intervention.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'admin_password',
      database: process.env.DB_NAME || 'postgres',
      entities: [Intervention],
      synchronize: true,
    }),
    KafkaModule,
    InterventionModule,
  ],
})
export class AppModule {}

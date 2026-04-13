import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conducteur } from './conducteur/entities/conducteur.entity';
import { Assignation } from './conducteur/entities/assignation.entity';
import { KafkaModule } from './kafka/kafka.module';
import { ConducteurModule } from './conducteur/conducteur.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'admin_password',
      database: process.env.DB_NAME || 'postgres',
      entities: [Conducteur, Assignation],
      synchronize: true, // Equivalent à spring.jpa.hibernate.ddl-auto=update
    }),
    KafkaModule,      // Global — doit être importé AVANT ConducteurModule
    ConducteurModule,
  ],
})
export class AppModule {}

import './tracing'; // Doit être importé EN PREMIER avant NestJS
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  // ── Serveur HTTP (REST) ──────────────────────────────────────────────────
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  app.enableCors();

  // ── Microservice gRPC (streaming positions) ──────────────────────────────
  // Le serveur gRPC écoute sur le port 50051.
  // Il expose les méthodes définies dans proto/localization.proto :
  //   - GetCurrentPosition  : requête unaire
  //   - StreamPositions     : streaming server-side
  //   - GetPositionHistory  : requête unaire
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'localization',
      protoPath: join(__dirname, '..', 'proto', 'localization.proto'),
      url: '0.0.0.0:50051',
    },
  });

  await app.startAllMicroservices();

  const port = process.env.PORT || 8084;
  await app.listen(port);
  console.log(`[localization-service] HTTP démarré sur le port ${port}`);
  console.log(`[localization-service] gRPC démarré sur le port 50051`);
}

bootstrap();

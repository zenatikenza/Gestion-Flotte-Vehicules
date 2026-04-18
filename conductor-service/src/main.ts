import './tracing'; // Doit être importé EN PREMIER avant NestJS
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { HttpLoggingInterceptor } from './http-logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  app.useGlobalInterceptors(new HttpLoggingInterceptor());
  app.enableCors();

  const port = process.env.PORT || 8082;
  await app.listen(port);
  console.log(`[conductor-service] Démarré sur le port ${port}`);
}

bootstrap();

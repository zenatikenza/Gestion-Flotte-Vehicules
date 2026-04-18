import './tracing';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpLoggingInterceptor } from './http-logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalInterceptors(new HttpLoggingInterceptor());
  app.enableCors();
  const port = process.env.PORT || 8083;
  await app.listen(port);
  console.log(`[maintenance-service] Démarré sur le port ${port}`);
}
bootstrap();

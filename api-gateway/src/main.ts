import './tracing';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpLoggingInterceptor } from './http-logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalInterceptors(new HttpLoggingInterceptor());
  app.enableCors();


  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`[api-gateway] GraphQL endpoint : http://localhost:${port}/graphql`);
}
bootstrap();
import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';
import { loadEnvironment } from './config/environment';

async function bootstrap(): Promise<void> {
  const environment = loadEnvironment();
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();

  const openApiConfig = new DocumentBuilder()
    .setTitle('Sakura Nails - API de ventas')
    .setDescription('API REST para catálogo, pedidos, pagos y comisiones')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, openApiConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(environment.port);
}

void bootstrap();

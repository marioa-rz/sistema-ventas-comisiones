import './config/environment-file';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter, type NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';
import { loadEnvironment } from './config/environment';
import { securityHeadersFor } from './config/security-headers';

async function bootstrap(): Promise<void> {
  const environment = loadEnvironment();
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(),
    { bufferLogs: true },
  );

  if (environment.trustProxyHops > 0) app.set('trust proxy', environment.trustProxyHops);

  app.enableCors({
    origin: environment.corsOrigins,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'Idempotency-Key'],
  });

  app.use((_request: IncomingMessage, response: ServerResponse, next: () => void) => {
    for (const [name, value] of Object.entries(securityHeadersFor(_request.url))) {
      response.setHeader(name, value);
    }
    next();
  });

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
    .setTitle('Sakura Makeup - API de ventas')
    .setDescription('API REST para catálogo, pedidos, pagos y comisiones')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, openApiConfig);
  if (environment.nodeEnv !== 'production') {
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(environment.port);
}

void bootstrap();

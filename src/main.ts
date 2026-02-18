import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';

import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Server');
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);

  const globalPrefix = 'api';
  const apiVersion = '1';
  const swaggerPath = 'api-docs';

  const allowedOrigins = configService
    .get<string>('CORS_ORIGINS', 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim());

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  app.setGlobalPrefix(globalPrefix);
  app.enableVersioning({ type: VersioningType.URI });

  const config = new DocumentBuilder()
    .setTitle('shop api')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup(swaggerPath, app, document);

  await app.listen(port, '0.0.0.0');

  const baseUrl = `http://localhost:${port}`;
  const apiBase = `${baseUrl}/${globalPrefix}/v${apiVersion}`;
  const graphqlPath = 'graphql';

  logger.log(`Application is running on: ${baseUrl}/${globalPrefix}`);
  logger.log(`Swagger is running on: ${baseUrl}/${swaggerPath}`);
  logger.log(`GraphQL Playground: ${baseUrl}/${graphqlPath}`);
  logger.log(`${apiBase}/orders`);
  logger.log(`${apiBase}/products`);
  logger.log(`${apiBase}/users`);
}

void bootstrap();

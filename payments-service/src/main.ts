import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { type MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const port = process.env.PAYMENTS_GRPC_PORT ?? '5000';

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.GRPC,
    options: {
      package: 'payments',
      protoPath: join(process.cwd(), '../proto/payments.proto'),
      url: `0.0.0.0:${port}`,
    },
  });

  await app.listen();
  console.warn(`Payments gRPC server listening on :${port}`);
}

void bootstrap();

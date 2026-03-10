import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';

import { PAYMENTS_GRPC_CLIENT } from './payments-client.constants';
import { PaymentsClientService } from './payments-client.service';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: PAYMENTS_GRPC_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'payments',
            protoPath: join(process.cwd(), 'proto/payments.proto'),
            url: config.getOrThrow<string>('PAYMENTS_GRPC_URL'),
          },
        }),
      },
    ]),
  ],
  providers: [PaymentsClientService],
  exports: [PaymentsClientService],
})
export class PaymentsClientModule {}

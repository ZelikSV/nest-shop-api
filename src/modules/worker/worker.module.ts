import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { WorkerService } from './worker.service';
import { Order } from '../orders/order.entity';
import { ProcessedMessage } from './processed-message.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, ProcessedMessage])],
  providers: [WorkerService],
})
export class WorkerModule {}

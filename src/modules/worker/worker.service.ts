import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { Channel, ConsumeMessage } from 'amqplib';

import { RabbitmqService } from '../rabbitmq/rabbitmq.service';
import { QUEUES, type OrderMessage } from '../rabbitmq/rabbitmq.constants';
import { Order } from '../orders/order.entity';
import { OrderStatus } from '../../common/types/orders';

@Injectable()
export class WorkerService implements OnModuleInit {
  private readonly logger = new Logger(WorkerService.name);

  constructor(
    private readonly rabbitmqService: RabbitmqService,
    private readonly dataSource: DataSource,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  async onModuleInit(): Promise<void> {
    const channel = this.rabbitmqService.getConnection().createChannel({
      json: true,
      setup: async (ch: Channel) => {
        await ch.prefetch(1);
        await ch.consume(
          QUEUES.ORDERS_PROCESS,
          (msg) => {
            if (msg) {
              this.handleMessage(ch, msg).catch((err: unknown) => {
                this.logger.error(
                  'Unhandled worker error',
                  err instanceof Error ? err.stack : String(err),
                );
              });
            }
          },
          { noAck: false },
        );
        this.logger.log(`Worker listening on [${QUEUES.ORDERS_PROCESS}]`);
      },
    });

    await channel.waitForConnect();
  }

  private async handleMessage(channel: Channel, msg: ConsumeMessage): Promise<void> {
    const payload = JSON.parse(msg.content.toString()) as OrderMessage;
    const { messageId, orderId, attempt } = payload;

    this.logger.log(`Received messageId=${messageId} orderId=${orderId} attempt=${attempt}`);

    try {
      await this.dataSource.transaction(async (em) => {
        await em.update(Order, orderId, { status: OrderStatus.PROCESSED });
      });

      channel.ack(msg);
      this.logger.log(`Success messageId=${messageId} orderId=${orderId}`);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Failed messageId=${messageId} orderId=${orderId} attempt=${attempt} reason=${reason}`,
      );

      channel.nack(msg, false, false);
    }
  }
}

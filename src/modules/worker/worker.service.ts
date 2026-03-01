import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { Channel, ConsumeMessage } from 'amqplib';

import { RabbitmqService } from '../rabbitmq/rabbitmq.service';
import { QUEUES, type OrderMessage } from '../rabbitmq/rabbitmq.constants';
import { Order } from '../orders/order.entity';
import { ProcessedMessage } from './processed-message.entity';
import { OrderStatus } from '../../common/types/orders';

const MAX_ATTEMPTS = 3; // total attempts including the first one

class DuplicateMessageError extends Error {}

@Injectable()
export class WorkerService implements OnModuleInit {
  private readonly logger = new Logger(WorkerService.name);

  constructor(
    private readonly rabbitmqService: RabbitmqService,
    private readonly dataSource: DataSource,
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
        try {
          await em.insert(ProcessedMessage, {
            messageId,
            orderId,
            processedAt: new Date(),
            handler: 'orders-worker',
          });
        } catch (err) {
          if (this.isUniqueViolation(err)) {
            throw new DuplicateMessageError();
          }
          throw err;
        }

        await em.update(Order, orderId, { status: OrderStatus.PROCESSED, processedAt: new Date() });
      });

      channel.ack(msg);
      this.logger.log(`Success messageId=${messageId} orderId=${orderId}`);
    } catch (err) {
      if (err instanceof DuplicateMessageError) {
        this.logger.warn(`Duplicate messageId=${messageId} orderId=${orderId} — skipped`);
        channel.ack(msg);
        return;
      }

      const reason = err instanceof Error ? err.message : String(err);
      const nextAttempt = attempt + 1;

      if (nextAttempt < MAX_ATTEMPTS) {
        const delayMs = 1000 * nextAttempt;
        this.logger.warn(
          `Retry messageId=${messageId} orderId=${orderId} attempt=${attempt} → ${nextAttempt} in ${delayMs}ms reason=${reason}`,
        );

        setTimeout(() => {
          this.rabbitmqService
            .publish(QUEUES.ORDERS_PROCESS, { ...payload, attempt: nextAttempt })
            .catch((e: unknown) =>
              this.logger.error(
                `Failed to republish messageId=${messageId}`,
                e instanceof Error ? e.stack : String(e),
              ),
            );
        }, delayMs);

        channel.ack(msg);
      } else {
        this.logger.error(
          `DLQ messageId=${messageId} orderId=${orderId} attempt=${attempt} reason=${reason}`,
        );

        await this.rabbitmqService.publish(QUEUES.ORDERS_DLQ, payload);
        channel.ack(msg);
      }
    }
  }

  private isUniqueViolation(err: unknown): boolean {
    return (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === '23505'
    );
  }
}

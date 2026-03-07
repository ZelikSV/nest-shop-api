import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqp-connection-manager';
import type { AmqpConnectionManager as IAmqpConnectionManager } from 'amqp-connection-manager';
import type { Channel, Options } from 'amqplib';

import { QUEUES } from './rabbitmq.constants';

@Injectable()
export class RabbitmqService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitmqService.name);

  private connection: IAmqpConnectionManager;
  private publisherChannel: amqp.ChannelWrapper;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = this.configService.getOrThrow<string>('RABBITMQ_URL');

    this.connection = amqp.connect([url]);

    this.connection.on('connect', () => this.logger.log('RabbitMQ connected'));
    this.connection.on('disconnect', ({ err }: { err: Error }) =>
      this.logger.warn(`RabbitMQ disconnected: ${err?.message}`),
    );

    // Publisher channel — declares the topology once on connect
    this.publisherChannel = this.connection.createChannel({
      json: true,
      setup: async (channel: Channel) => {
        await channel.assertQueue(QUEUES.ORDERS_PROCESS, { durable: true });
        await channel.assertQueue(QUEUES.ORDERS_DLQ, { durable: true });
        this.logger.log(`Topology ready: [${QUEUES.ORDERS_PROCESS}] [${QUEUES.ORDERS_DLQ}]`);
      },
    });

    await this.publisherChannel.waitForConnect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.publisherChannel.close();
    await this.connection.close();
  }

  async publish<T>(queue: string, message: T, options?: Options.Publish): Promise<void> {
    await this.publisherChannel.sendToQueue(queue, message as object, {
      persistent: true,
      contentType: 'application/json',
      ...options,
    });
  }

  /**
   * Exposes the underlying connection so consumers (worker) can create
   * their own channel wrapper with custom prefetch and consume setup.
   */
  getConnection(): IAmqpConnectionManager {
    return this.connection;
  }
}

import {
  Injectable,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type Repository, type QueryRunner, DataSource } from 'typeorm';
import { randomUUID } from 'crypto';

import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { Product } from '../products/product.entity';
import { FileRecord } from '../files/file-record.entity';
import { StorageService } from '../files/storage.service';
import { type CreateOrderDto } from './dto/create-order.dto';
import { type OrderItemDto } from './dto/order-item.dto';
import { OrderStatus } from '../../common/types/orders';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service';
import { QUEUES, type OrderMessage } from '../rabbitmq/rabbitmq.constants';
import { PaymentsClientService } from '../payments-client/payments-client.service';

export interface OrderWithInvoice extends Order {
  invoiceUrl: string | null;
}

export interface OrderWithPayment extends Order {
  paymentId: string;
  paymentStatus: string;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(FileRecord)
    private readonly fileRecordRepository: Repository<FileRecord>,
    private readonly dataSource: DataSource,
    private readonly storageService: StorageService,
    private readonly rabbitmqService: RabbitmqService,
    private readonly paymentsClientService: PaymentsClientService,
  ) {}

  async createOrder(dto: CreateOrderDto): Promise<OrderWithPayment> {
    const existingOrder = await this.findExistingOrder(dto.userId, dto.idempotencyKey);
    if (existingOrder) {
      this.logger.log(
        `Returning existing order ${existingOrder.id} for idempotencyKey=${dto.idempotencyKey}`,
      );
      return this.authorizeAndUpdateOrder(existingOrder, dto.idempotencyKey);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let savedOrder: Order;
    try {
      savedOrder = await this.executeOrderTransaction(queryRunner, dto);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      return this.handleCreateOrderError(error, dto);
    } finally {
      await queryRunner.release();
    }

    await this.publishOrderCreated(savedOrder.id);
    this.logger.log(`Order ${savedOrder.id} created successfully`);

    return this.authorizeAndUpdateOrder(savedOrder, dto.idempotencyKey);
  }

  /**
   * Calls Payments.Authorize and handles the status transition on the order:
   *
   * - Success: if order was `payment_failed` (retry), restore it to `pending`.
   * - Failure (timeout / unavailable): mark order as `payment_failed` so it is
   *   distinguishable from a brand-new pending order, and re-throw the HTTP
   *   exception to the caller.
   *
   * The `idempotencyKey` is forwarded to the payments service, so retrying with
   * the same key is safe — the payments service will return the existing payment
   * if it was already created before the failure.
   */
  private async authorizeAndUpdateOrder(
    order: Order,
    idempotencyKey: string,
  ): Promise<OrderWithPayment> {
    try {
      const payment = await this.paymentsClientService.authorize({
        orderId: order.id,
        amount: Number(order.totalPrice),
        currency: 'UAH',
        idempotencyKey,
      });

      if (order.status === OrderStatus.PAYMENT_FAILED) {
        await this.orderRepository.update(order.id, { status: OrderStatus.PENDING });
        this.logger.log(`Order ${order.id} re-authorized successfully, status restored to pending`);
      } else {
        this.logger.log(
          `Payment authorized: paymentId=${payment.paymentId} status=${payment.status}`,
        );
      }

      return { ...order, paymentId: payment.paymentId, paymentStatus: payment.status };
    } catch (err) {
      if (order.status !== OrderStatus.PAYMENT_FAILED) {
        await this.orderRepository.update(order.id, { status: OrderStatus.PAYMENT_FAILED });
        this.logger.warn(
          `Payment authorization failed for order ${order.id} — status set to payment_failed. ` +
            `Client may retry with the same idempotencyKey to re-attempt authorization.`,
        );
      }
      throw err;
    }
  }

  async findOrdersByUser(
    userId: string,
    status?: OrderStatus,
    startDate?: Date,
    endDate?: Date,
  ): Promise<Order[]> {
    const qb = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'item')
      .where('order.userId = :userId', { userId });

    if (status) {
      qb.andWhere('order.status = :status', { status });
    }

    if (startDate) {
      qb.andWhere('order.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      qb.andWhere('order.createdAt <= :endDate', { endDate });
    }

    qb.orderBy('order.createdAt', 'DESC');

    return qb.getMany();
  }

  async findOrderById(id: string): Promise<OrderWithInvoice> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['items', 'items.product'],
    });

    if (!order) {
      throw new NotFoundException(`Order with id ${id} not found`);
    }

    let invoiceUrl: string | null = null;
    if (order.invoiceFileId) {
      const fileRecord = await this.fileRecordRepository.findOne({
        where: { id: order.invoiceFileId },
      });
      if (fileRecord) {
        invoiceUrl = await this.storageService.generatePresignedDownloadUrl(fileRecord.key);
      }
    }

    return { ...order, invoiceUrl };
  }

  async updateInvoiceFileId(orderId: string, fileId: string): Promise<void> {
    await this.orderRepository.update(orderId, { invoiceFileId: fileId });
  }

  private async findExistingOrder(userId: string, idempotencyKey: string): Promise<Order | null> {
    return this.orderRepository.findOne({
      where: { userId, idempotencyKey },
      relations: ['items'],
    });
  }

  private async executeOrderTransaction(
    queryRunner: QueryRunner,
    dto: CreateOrderDto,
  ): Promise<Order> {
    const productMap = await this.lockAndLoadProducts(queryRunner, dto.items);

    this.validateStock(productMap, dto.items);

    const totalPrice = dto.items.reduce((sum, item) => {
      const product = productMap.get(item.productId)!;
      return sum + Number(product.price) * item.quantity;
    }, 0);

    const order = queryRunner.manager.create(Order, {
      userId: dto.userId,
      idempotencyKey: dto.idempotencyKey,
      status: OrderStatus.PENDING,
      totalPrice,
    });
    const savedOrder = await queryRunner.manager.save(Order, order);

    const orderItems = dto.items.map((item) => {
      const product = productMap.get(item.productId)!;
      return queryRunner.manager.create(OrderItem, {
        orderId: savedOrder.id,
        productId: item.productId,
        quantity: item.quantity,
        price: Number(product.price),
      });
    });
    await queryRunner.manager.save(OrderItem, orderItems);

    for (const item of dto.items) {
      await queryRunner.manager
        .createQueryBuilder()
        .update(Product)
        .set({ stock: () => `"stock" - ${item.quantity}` })
        .where('id = :id', { id: item.productId })
        .execute();
    }

    savedOrder.items = orderItems;
    return savedOrder;
  }

  private async lockAndLoadProducts(
    queryRunner: QueryRunner,
    items: OrderItemDto[],
  ): Promise<Map<string, Product>> {
    const sortedProductIds = [...new Set(items.map((item) => item.productId))].sort();

    const products: Product[] = [];
    for (const productId of sortedProductIds) {
      const product = await queryRunner.manager
        .createQueryBuilder(Product, 'product')
        .setLock('pessimistic_write')
        .where('product.id = :id', { id: productId })
        .getOne();

      if (!product) {
        throw new BadRequestException(`Product with id ${productId} not found`);
      }
      products.push(product);
    }

    return new Map(products.map((p) => [p.id, p]));
  }

  private validateStock(productMap: Map<string, Product>, items: OrderItemDto[]): void {
    for (const item of items) {
      const product = productMap.get(item.productId)!;
      if (product.stock < item.quantity) {
        throw new ConflictException(
          `Insufficient stock for "${product.name}": requested ${item.quantity}, available ${product.stock}`,
        );
      }
    }
  }

  private async publishOrderCreated(orderId: string): Promise<void> {
    const message: OrderMessage = {
      messageId: randomUUID(),
      orderId,
      createdAt: new Date().toISOString(),
      attempt: 0,
      producer: 'orders-api',
      eventName: 'order.created',
    };

    try {
      await this.rabbitmqService.publish(QUEUES.ORDERS_PROCESS, message);
      this.logger.log(`Published order.created messageId=${message.messageId} orderId=${orderId}`);
    } catch (err) {
      this.logger.error(
        `Failed to publish order.created for orderId=${orderId}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  private async handleCreateOrderError(
    error: unknown,
    dto: CreateOrderDto,
  ): Promise<OrderWithPayment> {
    if (error instanceof BadRequestException || error instanceof ConflictException) {
      throw error;
    }

    if (error instanceof Error && 'code' in error && (error as { code: string }).code === '23505') {
      const concurrentOrder = await this.findExistingOrder(dto.userId, dto.idempotencyKey);
      if (concurrentOrder) {
        this.logger.log(
          `Returning concurrent order ${concurrentOrder.id} for idempotencyKey=${dto.idempotencyKey}`,
        );
        return { ...concurrentOrder, paymentId: '', paymentStatus: 'UNKNOWN' };
      }
    }

    this.logger.error(
      'Order creation failed',
      error instanceof Error ? error.stack : String(error),
    );

    throw new InternalServerErrorException('Order creation failed. Please try again.');
  }
}

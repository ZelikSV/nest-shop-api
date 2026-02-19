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
import { ConfigService } from '@nestjs/config';

import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { Product } from '../products/product.entity';
import { FileRecord } from '../files/file-record.entity';
import { type CreateOrderDto } from './dto/create-order.dto';
import { type OrderItemDto } from './dto/order-item.dto';
import { OrderStatus } from '../../common/types/orders';

export interface OrderWithInvoice extends Order {
  invoiceUrl: string | null;
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
    private readonly configService: ConfigService,
  ) {}

  async createOrder(dto: CreateOrderDto): Promise<Order> {
    const existingOrder = await this.findExistingOrder(dto.userId, dto.idempotencyKey);
    if (existingOrder) {
      this.logger.log(
        `Returning existing order ${existingOrder.id} for idempotencyKey=${dto.idempotencyKey}`,
      );
      return existingOrder;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const savedOrder = await this.executeOrderTransaction(queryRunner, dto);
      await queryRunner.commitTransaction();

      this.logger.log(`Order ${savedOrder.id} created successfully`);
      return savedOrder;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      return this.handleCreateOrderError(error, dto);
    } finally {
      await queryRunner.release();
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
        invoiceUrl = this.buildFileUrl(fileRecord.key);
      }
    }

    return { ...order, invoiceUrl };
  }

  async updateInvoiceFileId(orderId: string, fileId: string): Promise<void> {
    await this.orderRepository.update(orderId, { invoiceFileId: fileId });
  }

  private buildFileUrl(key: string): string {
    const cloudfrontUrl = this.configService.get<string>('CLOUDFRONT_BASE_URL');
    if (cloudfrontUrl) {
      return `${cloudfrontUrl}/${key}`;
    }
    const region = this.configService.getOrThrow<string>('AWS_REGION');
    const bucket = this.configService.getOrThrow<string>('S3_BUCKET_NAME');
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
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

  private async handleCreateOrderError(error: unknown, dto: CreateOrderDto): Promise<Order> {
    if (error instanceof BadRequestException || error instanceof ConflictException) {
      throw error;
    }

    if (error instanceof Error && 'code' in error && (error as { code: string }).code === '23505') {
      const concurrentOrder = await this.findExistingOrder(dto.userId, dto.idempotencyKey);
      if (concurrentOrder) {
        this.logger.log(
          `Returning concurrent order ${concurrentOrder.id} for idempotencyKey=${dto.idempotencyKey}`,
        );
        return concurrentOrder;
      }
    }

    this.logger.error(
      'Order creation failed',
      error instanceof Error ? error.stack : String(error),
    );

    throw new InternalServerErrorException('Order creation failed. Please try again.');
  }
}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { Product } from '../products/product.entity';
import { FileRecord } from '../files/file-record.entity';
import { ProductsModule } from '../products/products.module';
import { OrdersResolver, OrderItemResolver } from './graphql/orders.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, Product, FileRecord]), ProductsModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersResolver, OrderItemResolver],
  exports: [OrdersService],
})
export class OrdersModule {}

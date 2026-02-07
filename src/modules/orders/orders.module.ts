import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { Product } from '../products/product.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, Product])],
})
export class OrdersModule {}

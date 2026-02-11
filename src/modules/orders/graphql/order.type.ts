import { ObjectType, Field, ID, Float } from '@nestjs/graphql';
import { OrderItemType } from './order-item.type';
import { OrderStatus } from './order-status.enum';

@ObjectType('Order', {
  description: 'Order entity representing a customer order',
})
export class OrderType {
  @Field(() => ID, { description: 'Unique order identifier' })
  id: string;

  @Field(() => ID, { description: 'User ID who placed the order' })
  userId: string;

  @Field(() => OrderStatus, { description: 'Current order status' })
  status: OrderStatus;

  @Field(() => Float, { description: 'Total price of the order' })
  totalPrice: number;

  @Field(() => [OrderItemType], { description: 'Items in the order' })
  items: OrderItemType[];

  @Field({ description: 'Order creation date' })
  createdAt: Date;

  @Field({ description: 'Order last update date' })
  updatedAt: Date;
}

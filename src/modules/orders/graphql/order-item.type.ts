import { ObjectType, Field, ID, Float, Int } from '@nestjs/graphql';
import { ProductType } from '../../products/graphql/product.type';

@ObjectType('OrderItem', {
  description: 'Order item representing a product in an order',
})
export class OrderItemType {
  @Field(() => ID, { description: 'Unique order item identifier' })
  id: string;

  @Field(() => Int, { description: 'Quantity of the product ordered' })
  quantity: number;

  @Field(() => Float, { description: 'Price of the product at the time of order' })
  price: number;

  @Field(() => ID, {
    nullable: true,
    description: 'Product ID (null if product was deleted)',
  })
  productId?: string;

  @Field(() => ProductType, {
    nullable: true,
    description: 'Product details (null if product was deleted)',
  })
  product?: ProductType;

  @Field({ description: 'Order item creation date' })
  createdAt: Date;
}

import { ObjectType, Field, ID, Float, Int } from '@nestjs/graphql';

@ObjectType('Product', {
  description: 'Product entity representing items available for purchase',
})
export class ProductType {
  @Field(() => ID, { description: 'Unique product identifier' })
  id: string;

  @Field({ description: 'Product name' })
  name: string;

  @Field({ nullable: true, description: 'Product description' })
  description?: string;

  @Field(() => Float, { description: 'Product price' })
  price: number;

  @Field(() => Int, { description: 'Available stock quantity' })
  stock: number;

  @Field({ description: 'Product creation date' })
  createdAt: Date;

  @Field({ description: 'Product last update date' })
  updatedAt: Date;
}

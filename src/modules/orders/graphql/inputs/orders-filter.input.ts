import { InputType, Field } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsDateString } from 'class-validator';
import { OrderStatus } from '../order-status.enum';

@InputType({
  description: 'Filter options for querying orders',
})
export class OrdersFilterInput {
  @Field(() => OrderStatus, {
    nullable: true,
    description: 'Filter orders by status',
  })
  @IsOptional()
  @IsEnum(OrderStatus, { message: 'Invalid order status' })
  status?: OrderStatus;

  @Field({
    nullable: true,
    description: 'Filter orders created after this date (ISO 8601 format)',
  })
  @IsOptional()
  @IsDateString({}, { message: 'dateFrom must be a valid ISO 8601 date string' })
  dateFrom?: string;

  @Field({
    nullable: true,
    description: 'Filter orders created before this date (ISO 8601 format)',
  })
  @IsOptional()
  @IsDateString({}, { message: 'dateTo must be a valid ISO 8601 date string' })
  dateTo?: string;
}

import { InputType, Field, Int } from '@nestjs/graphql';
import { IsOptional, IsInt, Min, Max } from 'class-validator';

@InputType({
  description: 'Pagination options for querying orders',
})
export class OrdersPaginationInput {
  @Field(() => Int, {
    nullable: true,
    defaultValue: 10,
    description: 'Number of items to return (max 50)',
  })
  @IsOptional()
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(50, { message: 'limit cannot exceed 50' })
  limit?: number = 10;

  @Field(() => Int, {
    nullable: true,
    defaultValue: 0,
    description: 'Number of items to skip',
  })
  @IsOptional()
  @IsInt({ message: 'offset must be an integer' })
  @Min(0, { message: 'offset must be non-negative' })
  offset?: number = 0;
}

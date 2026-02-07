import { IsUUID, IsString, IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

import { OrderItemDto } from './order-item.dto';

export class CreateOrderDto {
  @ApiProperty({ description: 'User ID placing the order' })
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: 'Idempotency key for deduplication (any unique string per request)',
    example: 'order-abc-123-unique-key',
  })
  @IsString()
  idempotencyKey: string;

  @ApiProperty({
    description: 'Array of items to order',
    type: [OrderItemDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}

import { IsString, IsNumber, IsOptional, Min, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ description: 'Product name', example: 'Laptop' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Product description',
    required: false,
    example: 'High-performance laptop',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Product price', example: 1299.99 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @ApiProperty({ description: 'Stock quantity', example: 50 })
  @IsInt()
  @Min(0)
  stock: number;
}

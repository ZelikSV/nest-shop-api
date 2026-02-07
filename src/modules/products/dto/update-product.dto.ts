import { IsString, IsNumber, IsOptional, Min, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProductDto {
  @ApiProperty({ description: 'Product name', required: false, example: 'Laptop Pro' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Product description',
    required: false,
    example: 'Updated description',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Product price', required: false, example: 1499.99 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  price?: number;

  @ApiProperty({ description: 'Stock quantity', required: false, example: 100 })
  @IsInt()
  @Min(0)
  @IsOptional()
  stock?: number;
}

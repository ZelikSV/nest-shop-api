import { IsString, IsEmail, IsInt, Min, Max, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({ description: 'The firstName of the user', required: false, example: 'Tonny' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({ description: 'The lastName of the user', required: false, example: 'Banana' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({
    description: 'The age of the user',
    minimum: 1,
    maximum: 120,
    required: false,
    example: 44,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(120)
  @IsOptional()
  age?: number;

  @ApiProperty({
    description: 'The email address of the user',
    required: false,
    example: 'tony_banana@gmail.com',
  })
  @IsEmail()
  @IsOptional()
  email?: string;
}

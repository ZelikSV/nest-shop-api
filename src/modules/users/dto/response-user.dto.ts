import { IsString, IsInt, IsEmail, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ description: 'User unique identifier', example: 'a1b2c3d4-...' })
  id: string;

  @ApiProperty({ description: 'The firstName of the user', example: 'John' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'The lastName of the user', example: 'Richards' })
  @IsString()
  lastName: string;

  @ApiProperty({ description: 'The age of the user', minimum: 1, maximum: 120, example: 34 })
  @IsInt()
  @Min(1)
  @Max(120)
  age: number;

  @ApiProperty({ description: 'The email adress of the user', example: 'test@gmail.com' })
  @IsEmail()
  email: string;
}

import { IsString, IsEmail, IsInt, Min, Max, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(120)
  @IsOptional()
  age?: number;

  @IsEmail()
  @IsOptional()
  email?: string;
}

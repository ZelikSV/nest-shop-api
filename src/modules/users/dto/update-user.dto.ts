import { IsString, IsEmail, IsInt, Min, Max } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsInt()
  @Min(1)
  @Max(120)
  age: number;

  @IsEmail()
  email: string;
}

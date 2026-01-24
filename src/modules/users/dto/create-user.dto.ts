import { IsString, IsInt, IsEmail, Min, Max } from 'class-validator';

export class CreateUserDto {
  id: string;
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

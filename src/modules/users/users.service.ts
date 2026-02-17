import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type Repository } from 'typeorm';

import { User } from './user.entity';
import { type CreateUserDto } from './dto/create-user.dto';
import { type UpdateUserDto } from './dto/update-user.dto';
import { type UserRole } from './enums/user-role.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getUsers(): Promise<User[]> {
    return this.userRepository.find();
  }

  async getUserById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return user;
  }

  async createNewUser(newUser: CreateUserDto): Promise<User> {
    const existedUser = await this.userRepository.findOne({
      where: { email: newUser.email },
    });

    if (existedUser) {
      throw new ConflictException(`User with email ${newUser.email} already exists`);
    }

    const user = this.userRepository.create(newUser);

    return this.userRepository.save(user);
  }

  async updateUser(id: string, updateUser: UpdateUserDto): Promise<User> {
    const existedUser = await this.userRepository.findOne({ where: { id } });

    if (!existedUser) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    Object.assign(existedUser, updateUser);

    return this.userRepository.save(existedUser);
  }

  async deleteUser(id: string): Promise<void> {
    const result = await this.userRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  async createAuthUser(data: {
    firstName: string;
    lastName: string;
    age: number;
    email: string;
    password: string;
    role?: UserRole;
  }): Promise<User> {
    const existedUser = await this.userRepository.findOne({
      where: { email: data.email },
    });

    if (existedUser) {
      throw new ConflictException(`User with email ${data.email} already exists`);
    }

    const user = this.userRepository.create(data);
    return this.userRepository.save(user);
  }
}

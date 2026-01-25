import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';

import { users } from '../../common/mocks/users';
import { IUser } from '../../common/types/users';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  getUsers(): IUser[] {
    return users;
  }

  getUserById(id: string): IUser {
    const user = users.find((user) => user.id === id);

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return user;
  }

  createNewUser(newUser: CreateUserDto): IUser {
    const existedUser = users.find(
      (user) =>
        user.firstName === newUser.firstName ||
        user.email === newUser.email ||
        user.lastName === newUser.lastName,
    );

    if (existedUser) {
      throw new ConflictException('User with this data already exists');
    }

    return newUser as IUser;
  }

  updateUser(id: string, updateUser: UpdateUserDto): IUser {
    const existedUser = users.find((user) => user.id === id);

    if (!existedUser) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return { ...existedUser, ...updateUser };
  }

  deleteUser(id: string): void {
    const userIndex = users.findIndex((user) => user.id === id);

    if (userIndex === -1) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    users.splice(userIndex, 1);
  }
}

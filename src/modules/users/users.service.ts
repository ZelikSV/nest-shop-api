import { Injectable } from '@nestjs/common';

import { users } from '../../common/mocks/users';
import { IUser } from '../../common/types/users';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  getUsers(): IUser[] {
    return users;
  }

  getUserById(id: string) {
    return users.find((user) => user.id === id);
  }

  createNewUser(newUser: CreateUserDto) {
    const existedUser = users.find(
      (user) =>
        user.firstName === newUser.firstName ||
        user.email === newUser.email ||
        user.lastName === newUser.lastName,
    );

    if (existedUser) {
      return;
    }

    return newUser;
  }

  updateUser(id: string, updateUser: UpdateUserDto) {
    const existedUser = users.find((user) => user.id === id);

    if (existedUser) {
      return updateUser;
    }

    return;
  }

  deleteUser(id: string) {
    const updatedUsers = users.filter((user) => user.id !== id);

    if (updatedUsers.length) {
      return id;
    }

    return;
  }
}

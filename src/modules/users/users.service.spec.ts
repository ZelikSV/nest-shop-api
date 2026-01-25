import { Test, type TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';

import { UsersService } from './users.service';
import { users } from '../../common/mocks/users';

describe('UsersService', () => {
  let service: UsersService;
  const mockedNonExistentId = '1234';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('getUsers', () => {
    it('should return all users', () => {
      const result = service.getUsers();

      expect(result).toEqual(users);
    });
  });

  describe('getUserById', () => {
    it('should return a user by id', () => {
      const existingUser = users[0];
      const result = service.getUserById(existingUser.id);

      expect(result).toEqual(existingUser);
    });

    it('should throw NotFoundException for non-existent user', () => {
      expect(() => service.getUserById(mockedNonExistentId)).toThrow(NotFoundException);
      expect(() => service.getUserById(mockedNonExistentId)).toThrow(
        `User with id ${mockedNonExistentId} not found`,
      );
    });
  });

  describe('createNewUser', () => {
    it('should return new user when user does not exist', () => {
      const newUser = {
        id: 'new-user-id-12345',
        firstName: 'Unique',
        lastName: 'Person',
        age: 25,
        email: 'unique.person@example.com',
      };
      const result = service.createNewUser(newUser);

      expect(result).toEqual(newUser);
    });

    it('should throw ConflictException when user with same email exists', () => {
      const existingUser = users[0];
      const duplicateUser = {
        id: 'new-id',
        firstName: 'Different',
        lastName: 'Name',
        age: 30,
        email: existingUser.email,
      };

      expect(() => service.createNewUser(duplicateUser)).toThrow(ConflictException);
      expect(() => service.createNewUser(duplicateUser)).toThrow(
        'User with this data already exists',
      );
    });

    it('should throw ConflictException when user with same firstName exists', () => {
      const existingUser = users[0];
      const duplicateUser = {
        id: 'new-id',
        firstName: existingUser.firstName,
        lastName: 'Different',
        age: 30,
        email: 'different@example.com',
      };

      expect(() => service.createNewUser(duplicateUser)).toThrow(ConflictException);
    });
  });

  describe('updateUser', () => {
    it('should return updated user data when user exists', () => {
      const existingUser = users[0];
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        age: 30,
        email: 'updated@example.com',
      };
      const result = service.updateUser(existingUser.id, updateData);

      expect(result).toEqual({ ...existingUser, ...updateData });
    });

    it('should throw NotFoundException when user does not exist', () => {
      const updateData = {
        firstName: 'Updated',
      };

      expect(() => service.updateUser(mockedNonExistentId, updateData)).toThrow(NotFoundException);
      expect(() => service.updateUser(mockedNonExistentId, updateData)).toThrow(
        `User with id ${mockedNonExistentId} not found`,
      );
    });
  });

  describe('deleteUser', () => {
    it('should delete user when user exists', () => {
      const existingUser = users[0];
      const initialLength = users.length;

      expect(() => service.deleteUser(existingUser.id)).not.toThrow();
      expect(users.length).toBe(initialLength - 1);
      expect(users.find((u) => u.id === existingUser.id)).toBeUndefined();
    });

    it('should throw NotFoundException when user does not exist', () => {
      expect(() => service.deleteUser(mockedNonExistentId)).toThrow(NotFoundException);
      expect(() => service.deleteUser(mockedNonExistentId)).toThrow(
        `User with id ${mockedNonExistentId} not found`,
      );
    });
  });
});

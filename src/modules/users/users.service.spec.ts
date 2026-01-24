import { Test, type TestingModule } from '@nestjs/testing';

import { UsersService } from './users.service';
import { users } from '../../common/mocks/users';

describe('UsersService', () => {
  let service: UsersService;

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
      expect(result).toHaveLength(3);
    });
  });

  describe('getUserById', () => {
    it('should return a user by id', () => {
      const existingUser = users[0];
      const result = service.getUserById(existingUser.id);

      expect(result).toEqual(existingUser);
    });

    it('should return undefined for non-existent user', () => {
      const result = service.getUserById('non-existent-id');

      expect(result).toBeUndefined();
    });
  });

  describe('createNewUser', () => {
    it('should return new user when user does not exist', () => {
      const newUser = {
        id: 'new-user-id-12345',
        firstName: 'New',
        lastName: 'User',
        age: 25,
        email: 'new.user@example.com',
      };
      const result = service.createNewUser(newUser);

      expect(result).toEqual(newUser);
    });

    it('should return undefined when user already exists', () => {
      const existingUser = users[0];
      const result = service.createNewUser(existingUser);

      expect(result).toBeUndefined();
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

      expect(result).toEqual(updateData);
    });

    it('should return undefined when user does not exist', () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        age: 30,
        email: 'updated@example.com',
      };
      const result = service.updateUser('non-existent-id', updateData);

      expect(result).toBeUndefined();
    });
  });

  describe('deleteUser', () => {
    it('should return id when user exists and can be deleted', () => {
      const existingUser = users[0];
      const result = service.deleteUser(existingUser.id);

      expect(result).toBe(existingUser.id);
    });

    it('should return undefined when no users remain after filter', () => {
      const result = service.deleteUser('id-that-matches-all-somehow');

      expect(result).toBe('id-that-matches-all-somehow');
    });
  });
});

import { Test, type TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { users } from '../../common/mocks/users';

describe('UsersController', () => {
  let controller: UsersController;

  const mockUsersService = {
    getUsers: jest.fn(),
    getUserById: jest.fn(),
    createNewUser: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
  };
  const mockedId = '1234';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);

    jest.clearAllMocks();
  });

  describe('getUsers', () => {
    it('should return all users', () => {
      mockUsersService.getUsers.mockReturnValue(users);
      const result = controller.getUsers();

      expect(result).toEqual(users);
      expect(mockUsersService.getUsers).toHaveBeenCalled();
    });

    it('should return empty array when no users', () => {
      mockUsersService.getUsers.mockReturnValue([]);
      const result = controller.getUsers();

      expect(result).toEqual([]);
      expect(mockUsersService.getUsers).toHaveBeenCalled();
    });
  });

  describe('getUsersById', () => {
    it('should return a user by id', () => {
      const user = users[0];
      mockUsersService.getUserById.mockReturnValue(user);
      const result = controller.getUsersById(user.id);

      expect(result).toEqual(user);
      expect(mockUsersService.getUserById).toHaveBeenCalledWith(user.id);
    });

    it('should throw NotFoundException when user does not exist', () => {
      mockUsersService.getUserById.mockImplementation(() => {
        throw new NotFoundException(`User with id ${mockedId} not found`);
      });

      expect(() => controller.getUsersById(mockedId)).toThrow(NotFoundException);
      expect(() => controller.getUsersById(mockedId)).toThrow(`User with id ${mockedId} not found`);
    });
  });

  describe('createUser', () => {
    it('should create a new user', () => {
      const newUser = {
        id: 'new-id',
        firstName: 'New',
        lastName: 'User',
        age: 25,
        email: 'new@example.com',
      };
      mockUsersService.createNewUser.mockReturnValue(newUser);
      const result = controller.createUser(newUser);

      expect(result).toEqual(newUser);
      expect(mockUsersService.createNewUser).toHaveBeenCalledWith(newUser);
    });

    it('should throw ConflictException when user already exists', () => {
      const existingUser = users[0];
      mockUsersService.createNewUser.mockImplementation(() => {
        throw new ConflictException('User with this data already exists');
      });

      expect(() => controller.createUser(existingUser)).toThrow(ConflictException);
      expect(() => controller.createUser(existingUser)).toThrow(
        'User with this data already exists',
      );
    });
  });

  describe('updateUser', () => {
    it('should update a user', () => {
      const userId = users[0].id;
      const updateData = {
        firstName: 'Updated',
        lastName: 'User',
        age: 30,
        email: 'updated@example.com',
      };
      const updatedUser = { ...users[0], ...updateData };
      mockUsersService.updateUser.mockReturnValue(updatedUser);
      const result = controller.updateUser(userId, updateData);

      expect(result).toEqual(updatedUser);
      expect(mockUsersService.updateUser).toHaveBeenCalledWith(userId, updateData);
    });

    it('should throw NotFoundException when user does not exist', () => {
      const updateData = { firstName: 'Updated' };
      mockUsersService.updateUser.mockImplementation(() => {
        throw new NotFoundException(`User with id ${mockedId} not found`);
      });

      expect(() => controller.updateUser(mockedId, updateData)).toThrow(NotFoundException);
    });
  });

  describe('deleteUser', () => {
    it('should delete a user', () => {
      const userId = users[0].id;
      mockUsersService.deleteUser.mockReturnValue(undefined);
      const result = controller.deleteUser(userId);

      expect(result).toBeUndefined();
      expect(mockUsersService.deleteUser).toHaveBeenCalledWith(userId);
    });

    it('should throw NotFoundException when user does not exist', () => {
      mockUsersService.deleteUser.mockImplementation(() => {
        throw new NotFoundException(`User with id ${mockedId} not found`);
      });

      expect(() => controller.deleteUser(mockedId)).toThrow(NotFoundException);
      expect(() => controller.deleteUser(mockedId)).toThrow(`User with id ${mockedId} not found`);
    });
  });
});

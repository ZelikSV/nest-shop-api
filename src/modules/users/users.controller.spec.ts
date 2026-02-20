import { Test, type TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { type User } from './user.entity';
import { MOCK_USERS } from '../../common/mocks/users';

const mockUsers: User[] = MOCK_USERS.map((u) => ({
  ...u,
  orders: [],
  avatarFileId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}));

describe('UsersController', () => {
  let controller: UsersController;

  const mockUsersService = {
    getUsers: jest.fn(),
    getUserById: jest.fn(),
    createNewUser: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
  };
  const mockedId = 'b2c3d4e5-f6a7-8901-bcde-f12345678922';

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
    it('should return all users', async () => {
      mockUsersService.getUsers.mockResolvedValue(mockUsers);
      const result = await controller.getUsers();

      expect(result).toEqual(mockUsers);
      expect(mockUsersService.getUsers).toHaveBeenCalled();
    });

    it('should return empty array when no users', async () => {
      mockUsersService.getUsers.mockResolvedValue([]);
      const result = await controller.getUsers();

      expect(result).toEqual([]);
      expect(mockUsersService.getUsers).toHaveBeenCalled();
    });
  });

  describe('getUsersById', () => {
    it('should return a user by id', async () => {
      const user = mockUsers[0];
      mockUsersService.getUserById.mockResolvedValue(user);
      const result = await controller.getUsersById(user.id);

      expect(result).toEqual(user);
      expect(mockUsersService.getUserById).toHaveBeenCalledWith(user.id);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockUsersService.getUserById.mockRejectedValue(
        new NotFoundException(`User with id ${mockedId} not found`),
      );

      await expect(controller.getUsersById(mockedId)).rejects.toThrow(NotFoundException);
      await expect(controller.getUsersById(mockedId)).rejects.toThrow(
        `User with id ${mockedId} not found`,
      );
    });
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      const newUser = {
        firstName: 'New',
        lastName: 'User',
        age: 25,
        email: 'new@example.com',
      };
      const createdUser = { id: 'new-id', ...newUser };
      mockUsersService.createNewUser.mockResolvedValue(createdUser);
      const result = await controller.createUser(newUser);

      expect(result).toEqual(createdUser);
      expect(mockUsersService.createNewUser).toHaveBeenCalledWith(newUser);
    });

    it('should throw ConflictException when user already exists', async () => {
      const existingUser = {
        firstName: mockUsers[0].firstName,
        lastName: mockUsers[0].lastName,
        age: mockUsers[0].age,
        email: mockUsers[0].email,
      };
      mockUsersService.createNewUser.mockRejectedValue(
        new ConflictException(`User with email ${mockUsers[0].email} already exists`),
      );

      await expect(controller.createUser(existingUser)).rejects.toThrow(ConflictException);
      await expect(controller.createUser(existingUser)).rejects.toThrow(
        `User with email ${mockUsers[0].email} already exists`,
      );
    });
  });

  describe('updateUser', () => {
    it('should update a user', async () => {
      const userId = mockUsers[0].id;
      const updateData = {
        firstName: 'Updated',
        lastName: 'User',
        age: 30,
        email: 'updated@example.com',
      };
      const updatedUser = { ...mockUsers[0], ...updateData };
      mockUsersService.updateUser.mockResolvedValue(updatedUser);
      const result = await controller.updateUser(userId, updateData);

      expect(result).toEqual(updatedUser);
      expect(mockUsersService.updateUser).toHaveBeenCalledWith(userId, updateData);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      const updateData = { firstName: 'Updated' };
      mockUsersService.updateUser.mockRejectedValue(
        new NotFoundException(`User with id ${mockedId} not found`),
      );

      await expect(controller.updateUser(mockedId, updateData)).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteUser', () => {
    it('should delete a user', async () => {
      const userId = mockUsers[0].id;
      mockUsersService.deleteUser.mockResolvedValue(undefined);
      const result = await controller.deleteUser(userId);

      expect(result).toBeUndefined();
      expect(mockUsersService.deleteUser).toHaveBeenCalledWith(userId);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockUsersService.deleteUser.mockRejectedValue(
        new NotFoundException(`User with id ${mockedId} not found`),
      );

      await expect(controller.deleteUser(mockedId)).rejects.toThrow(NotFoundException);
      await expect(controller.deleteUser(mockedId)).rejects.toThrow(
        `User with id ${mockedId} not found`,
      );
    });
  });
});

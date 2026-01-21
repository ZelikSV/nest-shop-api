import { Test, type TestingModule } from '@nestjs/testing';

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

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getUsers', () => {
    it('should return all users', () => {
      mockUsersService.getUsers.mockReturnValue(users);
      const result = controller.getUsers();
      expect(result).toEqual(users);
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
  });

  describe('updateUser', () => {
    it('should update a user', () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'User',
        age: 30,
        email: 'updated@example.com',
      };
      mockUsersService.updateUser.mockReturnValue(updateData);
      const result = controller.updateUser('user-id', updateData);
      expect(result).toEqual(updateData);
      expect(mockUsersService.updateUser).toHaveBeenCalledWith('user-id', updateData);
    });
  });

  describe('deleteUser', () => {
    it('should delete a user', () => {
      const userId = 'user-id';
      mockUsersService.deleteUser.mockReturnValue(userId);
      const result = controller.deleteUser(userId);
      expect(result).toBe(userId);
      expect(mockUsersService.deleteUser).toHaveBeenCalledWith(userId);
    });
  });
});

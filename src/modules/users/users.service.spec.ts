import { Test, type TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';

import { UsersService } from './users.service';
import { User } from './user.entity';
import { MOCK_USERS } from '../../common/mocks/users';

const mockUsers: User[] = MOCK_USERS.map((u) => ({
  ...u,
  orders: [],
  createdAt: new Date(),
  updatedAt: new Date(),
}));

describe('UsersService', () => {
  let service: UsersService;

  const mockUserRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockedNonExistentId = 'b2c3d4e5-f6a7-8901-bcde-f12345678911';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  describe('getUsers', () => {
    it('should return all users', async () => {
      mockUserRepository.find.mockResolvedValue(mockUsers);
      const result = await service.getUsers();

      expect(result).toEqual(mockUsers);
      expect(mockUserRepository.find).toHaveBeenCalled();
    });
  });

  describe('getUserById', () => {
    it('should return a user by id', async () => {
      const existingUser = mockUsers[0];
      mockUserRepository.findOne.mockResolvedValue(existingUser);
      const result = await service.getUserById(existingUser.id);

      expect(result).toEqual(existingUser);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { id: existingUser.id } });
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.getUserById(mockedNonExistentId)).rejects.toThrow(NotFoundException);
      await expect(service.getUserById(mockedNonExistentId)).rejects.toThrow(
        `User with id ${mockedNonExistentId} not found`,
      );
    });
  });

  describe('createNewUser', () => {
    it('should return new user when user does not exist', async () => {
      const newUserDto = {
        firstName: 'Unique',
        lastName: 'Person',
        age: 25,
        email: 'unique.person@example.com',
      };
      const createdUser = { id: 'new-uuid', ...newUserDto };

      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(createdUser);
      mockUserRepository.save.mockResolvedValue(createdUser);

      const result = await service.createNewUser(newUserDto);

      expect(result).toEqual(createdUser);
      expect(mockUserRepository.create).toHaveBeenCalledWith(newUserDto);
      expect(mockUserRepository.save).toHaveBeenCalledWith(createdUser);
    });

    it('should throw ConflictException when user with same email exists', async () => {
      const duplicateUser = {
        firstName: 'Different',
        lastName: 'Name',
        age: 30,
        email: mockUsers[0].email,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUsers[0]);

      await expect(service.createNewUser(duplicateUser)).rejects.toThrow(ConflictException);
      await expect(service.createNewUser(duplicateUser)).rejects.toThrow(
        `User with email ${duplicateUser.email} already exists`,
      );
    });
  });

  describe('updateUser', () => {
    it('should return updated user data when user exists', async () => {
      const existingUser = { ...mockUsers[0] };
      const updateData = { firstName: 'Updated', age: 30 };
      const updatedUser = { ...existingUser, ...updateData };

      mockUserRepository.findOne.mockResolvedValue(existingUser);
      mockUserRepository.save.mockResolvedValue(updatedUser);

      const result = await service.updateUser(existingUser.id, updateData);

      expect(result).toEqual(updatedUser);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateUser(mockedNonExistentId, { firstName: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteUser', () => {
    it('should delete user when user exists', async () => {
      mockUserRepository.delete.mockResolvedValue({ affected: 1 });

      await expect(service.deleteUser(mockUsers[0].id)).resolves.toBeUndefined();
      expect(mockUserRepository.delete).toHaveBeenCalledWith(mockUsers[0].id);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockUserRepository.delete.mockResolvedValue({ affected: 0 });

      await expect(service.deleteUser(mockedNonExistentId)).rejects.toThrow(NotFoundException);
      await expect(service.deleteUser(mockedNonExistentId)).rejects.toThrow(
        `User with id ${mockedNonExistentId} not found`,
      );
    });
  });
});

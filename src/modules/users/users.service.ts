import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type Repository } from 'typeorm';

import { User } from './user.entity';
import { type CreateUserDto } from './dto/create-user.dto';
import { type UpdateUserDto } from './dto/update-user.dto';
import { type UserRole } from './enums/user-role.enum';
import { FileRecord } from 'src/modules/files/file-record.entity';
import { StorageService } from 'src/modules/files/storage.service';

export interface UserWithAvatar extends User {
  avatarUrl: string | null;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(FileRecord)
    private readonly fileRecordRepository: Repository<FileRecord>,
    private readonly storageService: StorageService,
  ) {}

  async getUsers(): Promise<User[]> {
    return this.userRepository.find();
  }

  async getUserById(id: string): Promise<UserWithAvatar> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    let avatarUrl: string | null = null;
    if (user.avatarFileId) {
      const fileRecord = await this.fileRecordRepository.findOne({
        where: { id: user.avatarFileId },
      });
      if (fileRecord) {
        avatarUrl = await this.storageService.generatePresignedDownloadUrl(fileRecord.key);
      }
    }

    return { ...user, avatarUrl };
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

  async updateAvatarFileId(userId: string, fileId: string): Promise<void> {
    await this.userRepository.update(userId, { avatarFileId: fileId });
  }
}

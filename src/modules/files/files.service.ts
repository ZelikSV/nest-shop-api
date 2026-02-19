import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';

import { FileRecord } from './file-record.entity';
import { FileStatus } from './enums/file-status.enum';
import { FileVisibility } from './enums/file-visibility.enum';
import { StorageService } from './storage.service';
import { PresignResponseDto } from './dto/presign-response.dto';
import { UsersService } from 'src/modules/users/users.service';

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(FileRecord)
    private readonly fileRecordsRepository: Repository<FileRecord>,
    private readonly storageService: StorageService,
    private readonly usersService: UsersService,
  ) {}

  async presign(
    ownerId: string,
    entityId: string,
    contentType: string,
  ): Promise<PresignResponseDto> {
    // Ensure the entityId belongs to the requesting user (prevent uploading to other user's prefix)
    if (ownerId !== entityId) {
      throw new ForbiddenException('You can only upload files for your own entity');
    }

    // Validate that the user actually exists
    await this.usersService.getUserById(entityId);

    const ext = contentType.split('/')[1];
    const key = `users/${entityId}/avatars/${randomUUID()}.${ext}`;

    const fileRecord = this.fileRecordsRepository.create({
      ownerId,
      entityId,
      key,
      contentType,
      status: FileStatus.PENDING,
      visibility: FileVisibility.PRIVATE,
    });
    await this.fileRecordsRepository.save(fileRecord);

    const uploadUrl = await this.storageService.generatePresignedUploadUrl(key, contentType);

    return { fileId: fileRecord.id, key, uploadUrl, contentType };
  }

  async complete(fileId: string, ownerId: string): Promise<FileRecord> {
    const fileRecord = await this.fileRecordsRepository.findOne({ where: { id: fileId } });

    if (!fileRecord) {
      throw new NotFoundException('FileRecord not found');
    }
    if (fileRecord.ownerId !== ownerId) {
      throw new ForbiddenException('Access denied');
    }
    if (fileRecord.status !== FileStatus.PENDING) {
      throw new BadRequestException('File is not in pending status');
    }

    fileRecord.status = FileStatus.READY;
    const saved = await this.fileRecordsRepository.save(fileRecord);

    // Attach the file to the User entity
    if (fileRecord.entityId) {
      await this.usersService.updateAvatarFileId(fileRecord.entityId, fileRecord.id);
    }

    return saved;
  }

  getFileUrl(key: string): string {
    return this.storageService.getFileUrl(key);
  }

  async findReadyFileById(fileId: string): Promise<FileRecord | null> {
    return this.fileRecordsRepository.findOne({
      where: { id: fileId, status: FileStatus.READY },
    });
  }
}

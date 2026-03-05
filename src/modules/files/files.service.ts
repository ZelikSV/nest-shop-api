import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';

import { UsersService } from 'src/modules/users/users.service';
import { OrdersService } from 'src/modules/orders/orders.service';

import { FileRecord } from './file-record.entity';
import { EntityType } from './enums/entity-type.enum';
import { StorageService } from './storage.service';
import { PresignResponseDto } from './dto/presign-response.dto';
import { FileStatus, FileVisibility } from './enums/file.enums';

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(FileRecord)
    private readonly fileRecordsRepository: Repository<FileRecord>,
    private readonly storageService: StorageService,
    private readonly usersService: UsersService,
    private readonly ordersService: OrdersService,
  ) {}

  async presign(
    ownerId: string,
    entityId: string,
    entityType: EntityType,
    contentType: string,
  ): Promise<PresignResponseDto> {
    const key = await this.buildKeyAndValidateOwnership(ownerId, entityId, entityType, contentType);

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

    await this.attachFileToEntity(fileRecord);

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

  private async buildKeyAndValidateOwnership(
    ownerId: string,
    entityId: string,
    entityType: EntityType,
    contentType: string,
  ): Promise<string> {
    const ext = contentType.split('/')[1];

    if (entityType === EntityType.USER) {
      if (ownerId !== entityId) {
        throw new ForbiddenException('You can only upload files for your own entity');
      }

      await this.usersService.getUserById(entityId);

      return `users/${entityId}/avatars/${randomUUID()}.${ext}`;
    }

    const order = await this.ordersService.findOrderById(entityId);

    if (order.userId !== ownerId) {
      throw new ForbiddenException('You can only upload invoices for your own orders');
    }

    return `orders/${entityId}/invoices/${randomUUID()}.${ext}`;
  }

  private async attachFileToEntity(fileRecord: FileRecord): Promise<void> {
    if (!fileRecord.entityId) {
      return;
    }

    const key = fileRecord.key;

    if (key.startsWith('users/')) {
      await this.usersService.updateAvatarFileId(fileRecord.entityId, fileRecord.id);
    } else if (key.startsWith('orders/')) {
      await this.ordersService.updateInvoiceFileId(fileRecord.entityId, fileRecord.id);
    }
  }
}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FileRecord } from './file-record.entity';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { StorageService } from './storage.service';
import { UsersModule } from 'src/modules/users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([FileRecord]), UsersModule],
  controllers: [FilesController],
  providers: [FilesService, StorageService],
  exports: [FilesService],
})
export class FilesModule {}

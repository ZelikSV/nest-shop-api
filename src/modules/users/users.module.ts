import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { FileRecord } from 'src/modules/files/file-record.entity';
import { StorageModule } from 'src/modules/files/storage.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, FileRecord]), StorageModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}

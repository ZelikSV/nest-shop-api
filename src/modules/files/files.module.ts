import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FileRecord } from './file-record.entity';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { StorageModule } from './storage.module';
import { UsersModule } from 'src/modules/users/users.module';
import { OrdersModule } from 'src/modules/orders/orders.module';

@Module({
  imports: [TypeOrmModule.forFeature([FileRecord]), StorageModule, UsersModule, OrdersModule],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}

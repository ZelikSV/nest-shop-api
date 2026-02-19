import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FileStatus } from './enums/file-status.enum';
import { FileVisibility } from './enums/file-visibility.enum';

@Entity('file_records')
export class FileRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  ownerId: string;

  @Column({ type: 'uuid', nullable: true })
  entityId: string | null;

  @Column({ type: 'varchar' })
  key: string;

  @Column({ type: 'varchar' })
  contentType: string;

  @Column({ type: 'int', nullable: true })
  size: number | null;

  @Column({ type: 'enum', enum: FileStatus, default: FileStatus.PENDING })
  status: FileStatus;

  @Column({ type: 'enum', enum: FileVisibility, default: FileVisibility.PRIVATE })
  visibility: FileVisibility;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

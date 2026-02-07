import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from '../users/user.entity';
import { OrderItem } from './order-item.entity';
import { OrderStatus } from '../../common/types/orders';

@Entity('orders')
@Unique('UQ_orders_idempotency', ['userId', 'idempotencyKey'])
@Index('IDX_orders_userId_status_createdAt', ['userId', 'status', 'createdAt'])
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (user) => user.orders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalPrice: number;

  @Column({ type: 'varchar', length: 255 })
  idempotencyKey: string;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('processed_messages')
export class ProcessedMessage {
  @PrimaryColumn({ name: 'message_id', type: 'uuid' })
  messageId: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @Column({ name: 'processed_at', type: 'timestamp', default: () => 'now()' })
  processedAt: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  handler: string | null;
}

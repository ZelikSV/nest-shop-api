import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('processed_messages')
export class ProcessedMessage {
  @PrimaryColumn('uuid')
  messageId: string;

  @Column('uuid')
  orderId: string;

  @Column({ type: 'timestamp', default: () => 'now()' })
  processedAt: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  handler: string | null;
}

export const QUEUES = {
  ORDERS_PROCESS: 'orders.process',
  ORDERS_DLQ: 'orders.dlq',
} as const;

export type Queue = (typeof QUEUES)[keyof typeof QUEUES];

export interface OrderMessage {
  messageId: string;
  orderId: string;
  createdAt: string;
  attempt: number;
  producer: string;
  eventName: string;
}

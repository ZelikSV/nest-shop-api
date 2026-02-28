export const QUEUES = {
  ORDERS_PROCESS: 'orders.process',
  ORDERS_DLQ: 'orders.dlq',
} as const;

export type Queue = (typeof QUEUES)[keyof typeof QUEUES];

import { registerEnumType } from '@nestjs/graphql';
import { OrderStatus } from '../../../common/types/orders';

registerEnumType(OrderStatus, {
  name: 'OrderStatus',
  description: 'Order status enum representing different stages of order processing',
  valuesMap: {
    PENDING: {
      description: 'Order is pending confirmation',
    },
    CONFIRMED: {
      description: 'Order has been confirmed',
    },
    SHIPPED: {
      description: 'Order has been shipped',
    },
    DELIVERED: {
      description: 'Order has been delivered',
    },
    CANCELLED: {
      description: 'Order has been cancelled',
    },
  },
});

export { OrderStatus };

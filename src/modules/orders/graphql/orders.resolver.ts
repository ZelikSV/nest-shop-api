import { Resolver, Query, Args, ResolveField, Parent, ID, Context } from '@nestjs/graphql';
import { Logger } from '@nestjs/common';
import { OrdersService } from '../orders.service';
import { OrderType } from './order.type';
import { OrderItemType } from './order-item.type';
import { ProductType } from '../../products/graphql/product.type';
import { OrdersFilterInput } from './inputs/orders-filter.input';
import { OrdersPaginationInput } from './inputs/orders-pagination.input';
import { Order } from '../order.entity';
import { OrderItem } from '../order-item.entity';
import type { GraphQLContext } from './graphql-context.interface';

@Resolver(() => OrderType)
export class OrdersResolver {
  private readonly logger = new Logger(OrdersResolver.name);

  constructor(private readonly ordersService: OrdersService) {}

  @Query(() => [OrderType], {
    description: 'Get orders for a specific user with optional filtering and pagination',
  })
  async orders(
    @Args('userId', { type: () => ID, description: 'User ID to fetch orders for' })
    userId: string,
    @Args('filter', {
      type: () => OrdersFilterInput,
      nullable: true,
      description: 'Filter options',
    })
    filter?: OrdersFilterInput,
    @Args('pagination', {
      type: () => OrdersPaginationInput,
      nullable: true,
      description: 'Pagination options',
    })
    pagination?: OrdersPaginationInput,
  ): Promise<Order[]> {
    this.logger.log(
      `Fetching orders for userId=${userId}, filter=${JSON.stringify(filter)}, pagination=${JSON.stringify(pagination)}`,
    );

    const startDate = filter?.dateFrom ? new Date(filter.dateFrom) : undefined;
    const endDate = filter?.dateTo ? new Date(filter.dateTo) : undefined;

    const allOrders = await this.ordersService.findOrdersByUser(
      userId,
      filter?.status,
      startDate,
      endDate,
    );

    // Apply pagination
    const limit = pagination?.limit ?? 10;
    const offset = pagination?.offset ?? 0;

    return allOrders.slice(offset, offset + limit);
  }
}

@Resolver(() => OrderItemType)
export class OrderItemResolver {
  private readonly logger = new Logger(OrderItemResolver.name);

  @ResolveField(() => ProductType, { nullable: true })
  async product(
    @Parent() orderItem: OrderItem,
    @Context() context: GraphQLContext,
  ): Promise<ProductType | null> {
    this.logger.debug(
      `Resolving product for OrderItem ${orderItem.id}, productId=${orderItem.productId}`,
    );

    if (!orderItem.productId) {
      return null;
    }

    const product = await context.loaders.productLoader.load(orderItem.productId);

    if (!product) {
      this.logger.warn(`Product ${orderItem.productId} not found for OrderItem ${orderItem.id}`);
      return null;
    }

    return product as ProductType;
  }
}

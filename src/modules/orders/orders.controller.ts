import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseFilters,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { OrdersService } from './orders.service';
import { HttpExceptionFilter } from 'src/common/filters/http-exception.filter';
import { CreateOrderDto } from './dto/create-order.dto';
import { type OrderStatus } from '../../common/types/orders';

@ApiTags('Orders v1')
@ApiResponse({ status: 400, description: 'Bad Request' })
@ApiResponse({ status: 500, description: 'Internal Server Error' })
@Controller({ path: 'orders', version: '1' })
@UseFilters(new HttpExceptionFilter())
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order (idempotent)' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 200, description: 'Order already exists (idempotent return)' })
  @ApiResponse({ status: 409, description: 'Insufficient stock' })
  createOrder(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.createOrder(createOrderDto);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get orders for a user with optional filters' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
  })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO 8601)' })
  getOrdersByUser(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Query('status') status?: OrderStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.ordersService.findOrdersByUser(
      userId,
      status,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  @ApiResponse({ status: 200, description: 'Order found' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  getOrderById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.ordersService.findOrderById(id);
  }
}

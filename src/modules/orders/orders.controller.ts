import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { OrdersService } from './orders.service';
import { HttpExceptionFilter } from 'src/common/filters/http-exception.filter';
import { CreateOrderDto } from './dto/create-order.dto';
import { type OrderStatus } from '../../common/types/orders';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { UserRole } from '../users/enums/user-role.enum';
import { type AuthenticatedRequest } from 'src/common/types/authenticated-request.interface';

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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get order by ID (owner or admin). Returns invoiceUrl if present.' })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  @ApiResponse({ status: 200, description: 'Order found with invoiceUrl' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — not the order owner or admin' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getOrderById(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const order = await this.ordersService.findOrderById(id);

    const isOwner = order.userId === req.user.id;
    const isAdmin = req.user.role === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Access denied: you are not the order owner');
    }

    return order;
  }

  @Get(':id/public')
  @ApiOperation({ summary: 'Get basic order info (public, no invoice)' })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  @ApiResponse({ status: 200, description: 'Order found' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getOrderByIdPublic(@Param('id', new ParseUUIDPipe()) id: string) {
    const { invoiceUrl: _invoiceUrl, ...orderData } = await this.ordersService.findOrderById(id);
    return orderData;
  }
}

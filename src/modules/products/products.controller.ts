import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseFilters,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ProductsService } from './products.service';
import { HttpExceptionFilter } from 'src/common/filters/http-exception.filter';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@ApiTags('Products v1')
@ApiResponse({ status: 400, description: 'Bad Request' })
@ApiResponse({ status: 500, description: 'Internal Server Error' })
@Controller({ path: 'products', version: '1' })
@UseFilters(new HttpExceptionFilter())
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all products' })
  findAll() {
    return this.productsService.findAll();
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiOperation({ summary: 'Get product by id' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create product' })
  @ApiResponse({ status: 201, description: 'Product created' })
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Put(':id')
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiOperation({ summary: 'Update product' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiOperation({ summary: 'Delete product' })
  @ApiResponse({ status: 204 })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.productsService.remove(id);
  }
}

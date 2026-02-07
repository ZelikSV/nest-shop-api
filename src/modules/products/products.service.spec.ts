import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';

import { ProductsService } from './products.service';
import { Product } from './product.entity';
import { type CreateProductDto } from './dto/create-product.dto';
import { type UpdateProductDto } from './dto/update-product.dto';
import { MOCK_PRODUCTS } from '../../common/mocks/products';

const mockProductRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
});

type MockRepository = ReturnType<typeof mockProductRepository>;

describe('ProductsService', () => {
  let service: ProductsService;
  let repository: MockRepository;

  const mockProduct = {
    id: '1',
    ...MOCK_PRODUCTS[0],
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Product;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useFactory: mockProductRepository,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    repository = module.get<MockRepository>(getRepositoryToken(Product));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of products', async () => {
      const expectedProducts = [mockProduct];

      repository.find.mockResolvedValue(expectedProducts);

      const result = await service.findAll();

      expect(result).toEqual(expectedProducts);
      expect(repository.find).toHaveBeenCalledWith();
    });
  });

  describe('findOne', () => {
    it('should return a product by id', async () => {
      repository.findOne.mockResolvedValue(mockProduct);

      const result = await service.findOne('1');

      expect(result).toEqual(mockProduct);
      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
    });

    it('should throw NotFoundException if product not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create and return a product', async () => {
      const createProductDto: CreateProductDto = MOCK_PRODUCTS[0];
      const savedProduct = {
        id: '1',
        ...createProductDto,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Product;

      repository.create.mockReturnValue(savedProduct);
      repository.save.mockResolvedValue(savedProduct);

      const result = await service.create(createProductDto);

      expect(result).toEqual(savedProduct);
      expect(repository.create).toHaveBeenCalledWith(createProductDto);
      expect(repository.save).toHaveBeenCalledWith(savedProduct);
    });
  });

  describe('update', () => {
    it('should update and return the product', async () => {
      const updateProductDto: UpdateProductDto = { name: 'Updated Product' };
      const existingProduct = mockProduct;
      const updatedProduct = { ...existingProduct, ...updateProductDto };

      repository.findOne.mockResolvedValue(existingProduct);
      repository.save.mockResolvedValue(updatedProduct);

      const result = await service.update('1', updateProductDto);

      expect(result).toEqual(updatedProduct);
      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(repository.save).toHaveBeenCalledWith(updatedProduct);
    });

    it('should throw NotFoundException if product to update not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update('1', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete the product', async () => {
      repository.delete.mockResolvedValue({ affected: 1 });

      await service.remove('1');

      expect(repository.delete).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException if product to delete not found', async () => {
      repository.delete.mockResolvedValue({ affected: 0 });

      await expect(service.remove('1')).rejects.toThrow(NotFoundException);
    });
  });
});

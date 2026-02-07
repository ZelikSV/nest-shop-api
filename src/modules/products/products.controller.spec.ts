import { Test, type TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { type CreateProductDto } from './dto/create-product.dto';
import { type UpdateProductDto } from './dto/update-product.dto';
import { type Product } from './product.entity';
import { MOCK_PRODUCTS } from '../../common/mocks/products';

type MockService = Record<keyof ProductsService, jest.Mock>;

describe('ProductsController', () => {
  let controller: ProductsController;
  let service: MockService;

  const mockProduct = {
    id: '1',
    ...MOCK_PRODUCTS[0],
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Product;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    service = module.get(ProductsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of products', async () => {
      const expectedProducts = [mockProduct];
      service.findAll.mockResolvedValue(expectedProducts);

      const result = await controller.findAll();

      expect(result).toEqual(expectedProducts);
      expect(service.findAll).toHaveBeenCalledWith();
    });
  });

  describe('findOne', () => {
    it('should return a product by id', async () => {
      service.findOne.mockResolvedValue(mockProduct);

      const result = await controller.findOne('1');

      expect(result).toEqual(mockProduct);
      expect(service.findOne).toHaveBeenCalledWith('1');
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

      service.create.mockResolvedValue(savedProduct);

      const result = await controller.create(createProductDto);

      expect(result).toEqual(savedProduct);
      expect(service.create).toHaveBeenCalledWith(createProductDto);
    });
  });

  describe('update', () => {
    it('should update and return the product', async () => {
      const updateProductDto: UpdateProductDto = { name: 'Updated Product' };
      const updatedProduct = { ...mockProduct, ...updateProductDto };

      service.update.mockResolvedValue(updatedProduct);

      const result = await controller.update('1', updateProductDto);

      expect(result).toEqual(updatedProduct);
      expect(service.update).toHaveBeenCalledWith('1', updateProductDto);
    });
  });

  describe('remove', () => {
    it('should delete the product', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove('1');

      expect(service.remove).toHaveBeenCalledWith('1');
    });
  });
});

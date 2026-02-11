import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { ProductsService } from './products.service';
import { Product } from './product.entity';

@Injectable()
export class ProductsLoader {
  constructor(private readonly productsService: ProductsService) {}

  createProductLoader(): DataLoader<string, Product | null> {
    return new DataLoader<string, Product | null>(
      async (productIds: readonly string[]) => {
        const ids = [...productIds];
        const products = await this.productsService.findByIds(ids);

        const productMap = new Map<string, Product>(
          products.map((product) => [product.id, product]),
        );

        return ids.map((id) => productMap.get(id) ?? null);
      },
      {
        cache: true,
        batchScheduleFn: (callback) => process.nextTick(callback),
      },
    );
  }
}

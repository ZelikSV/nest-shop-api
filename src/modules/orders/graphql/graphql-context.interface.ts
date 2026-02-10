import type DataLoader from 'dataloader';
import type { Product } from '../../products/product.entity';

export interface GraphQLContext {
  req: unknown;
  loaders: {
    productLoader: DataLoader<string, Product | null>;
  };
}

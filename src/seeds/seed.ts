import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../config/data-source';
import { User } from '../modules/users/user.entity';
import { Product } from '../modules/products/product.entity';
import { Order } from '../modules/orders/order.entity';
import { OrderItem } from '../modules/orders/order-item.entity';
import { MOCK_USERS } from '../common/mocks/users';
import { MOCK_PRODUCTS } from '../common/mocks/products';

const logger = new Logger('Seed');

async function seed(): Promise<void> {
  const dataSource = new DataSource({
    ...dataSourceOptions,
    entities: [User, Product, Order, OrderItem],
    logging: false,
  });

  await dataSource.initialize();

  const userRepo = dataSource.getRepository(User);
  const productRepo = dataSource.getRepository(Product);

  const existingUsers = await userRepo.count();
  if (existingUsers > 0) {
    logger.warn('Users already seeded, skipping...');
  } else {
    const users = userRepo.create(MOCK_USERS);
    await userRepo.save(users);
    logger.log(`Seeded ${users.length} users`);
  }

  const existingProducts = await productRepo.count();
  if (existingProducts > 0) {
    logger.warn('Products already seeded, skipping...');
  } else {
    const products = productRepo.create(MOCK_PRODUCTS);
    await productRepo.save(products);
    logger.log(`Seeded ${products.length} products`);
  }

  await dataSource.destroy();
  logger.log('Seed completed successfully');
}

seed().catch((err) => {
  logger.error('Seed failed', err instanceof Error ? err.stack : String(err));
  process.exit(1);
});

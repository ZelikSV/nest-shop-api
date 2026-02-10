# Nest Shop API

E-commerce REST API built with NestJS.

**Live Demo:** [https://nest-shop-api-0shf.onrender.com/api-docs](https://nest-shop-api-0shf.onrender.com/api-docs)

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/users` | Get all users |
| `GET` | `/api/v1/users/:id` | Get user by ID |
| `POST` | `/api/v1/users/new` | Create user |
| `PUT` | `/api/v1/users/:id` | Update user |
| `DELETE` | `/api/v1/users/:id` | Delete user |
| `GET` | `/api/v1/products` | Get all products |
| `GET` | `/api/v1/products/:id` | Get product by ID |
| `POST` | `/api/v1/products` | Create product |
| `PUT` | `/api/v1/products/:id` | Update product |
| `DELETE` | `/api/v1/products/:id` | Delete product |
| `POST` | `/api/v1/orders` | Create order (idempotent) |
| `GET` | `/api/v1/orders/user/:userId` | Get orders by user |
| `GET` | `/api/v1/orders/:id` | Get order by ID |

## Requirements

- **Node.js** 24.11.0 or higher
- **Yarn** 1.22.0 or higher
- **PostgreSQL** 14+

## Architecture

Modular architecture inspired by Angular: modules, decorators, dependency injection, services, guards, pipes, interceptors.

- Each feature lives in its own module (users, products, orders)
- Modules don't know about each other unless explicitly connected
- Easy to test, easy to extend, easy to extract into microservices later

### Project Structure

```
src/
├── common/              # Shared stuff (guards, filters, decorators, mocks, types)
│   ├── decorators/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   ├── mocks/           # Shared mock data (single source of truth for seeds & tests)
│   ├── pipes/
│   └── types/
├── config/              # App configuration (data-source for TypeORM CLI)
├── database/            # DatabaseModule (TypeORM + PostgreSQL connection)
├── migrations/          # TypeORM migrations
├── seeds/               # Database seed script
└── modules/
    ├── users/           # Users CRUD
    ├── products/        # Products CRUD
    └── orders/          # Orders (transactional creation)
```

### Request Flow

```
Request -> Controller -> Service -> Repository -> PostgreSQL
```

| Layer | What it does |
|-------|--------------|
| Controller | Handles HTTP, validates input, returns response |
| Service | Business logic, doesn't care about HTTP |
| Repository | TypeORM repository, talks to PostgreSQL |

### Database

- **PostgreSQL** with **TypeORM** ORM
- `DatabaseModule` — isolated module for DB connection config
- Migrations for all schema changes (`synchronize: false`)
- Seed script for test data

#### Tables

| Table | Description |
|-------|-------------|
| `users` | User accounts (email unique) |
| `products` | Product catalog with stock & versioning |
| `orders` | Orders with idempotency key & status |
| `order_items` | Order line items (snapshot price) |

### Environment Config

The app loads env files in this order (first found wins):

1. `.env.development.local` — local secrets, not committed
2. `.env.development` — env-specific config
3. `.env` — fallback

**Important:** TypeORM CLI commands (migrations, seed) use `.env` file directly. For local development:
- Create `.env.development.local` for the app runtime
- Also create `.env` for migrations/seed scripts
- Set `DB_SSL=false` for local PostgreSQL (without SSL)
- Set `DB_SSL=true` for production databases (Render, AWS RDS, etc.)

## Quick Start

```bash
# Install
yarn install

# Create env file
cp .env.example .env.development.local

# Run migrations
yarn migration:run

# Seed test data
yarn seed

# Run
yarn start:dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `yarn start:dev` | Dev mode with hot reload |
| `yarn build` | Build for production |
| `yarn start:prod` | Run production build |
| `yarn test` | Run unit tests |
| `yarn test:e2e` | Run e2e tests |
| `yarn lint` | Lint & fix |
| `yarn type-check` | TypeScript check |
| `yarn migration:generate` | Generate migration from entity changes |
| `yarn migration:run` | Run pending migrations |
| `yarn migration:revert` | Revert last migration |
| `yarn seed` | Seed database with test data |

## Tech Stack

| | |
|---|---|
| NestJS 11 | Framework |
| TypeScript 5 | Language |
| PostgreSQL | Database |
| TypeORM | ORM |
| Jest 30 | Testing |
| Swagger | API docs |
| ESLint + Prettier | Code style |
| Husky | Git hooks |

## Homework 05 — Transactional Order Creation & SQL Optimization

### Part 1 — Transactional Order Creation

#### Transaction Flow (QueryRunner)

`OrdersService.createOrder()` uses a manual QueryRunner transaction to guarantee atomicity:

```
1. Idempotency pre-check (outside transaction for performance)
   → Order exists? Return it immediately (200)

2. queryRunner.connect()
3. queryRunner.startTransaction()

try {
   4. Lock product rows (FOR NO KEY UPDATE, sorted by ID)
   5. Validate stock for each item
   6. Calculate totalPrice
   7. INSERT Order
   8. INSERT OrderItems (with snapshot prices)
   9. UPDATE products SET stock = stock - quantity
  10. COMMIT
} catch {
  11. ROLLBACK
      → Re-throw BadRequestException / ConflictException
      → Unique violation (23505) → fetch & return existing order (race condition)
      → Unknown error → log + throw InternalServerErrorException
} finally {
  12. queryRunner.release() — ALWAYS
}
```

#### Concurrency Control — Pessimistic Locking

Chosen mechanism: `pessimistic_write` (PostgreSQL `FOR NO KEY UPDATE`).

**Why pessimistic over optimistic:**

| Criteria | Pessimistic (chosen) | Optimistic |
|----------|---------------------|------------|
| Contention | Handles high contention well | Degrades under contention (retry storms) |
| Forward progress | Guaranteed (no starvation) | Not guaranteed (retries may fail repeatedly) |
| Retry logic needed | No | Yes (adds complexity) |
| Lock duration | Short (transaction is fast) | N/A (version check at commit) |
| FK blocking | `FOR NO KEY UPDATE` doesn't block FK checks | N/A |

**Deadlock prevention:** Product IDs are sorted before locking (`sortedProductIds`), ensuring all concurrent transactions acquire locks in the same order.

#### Idempotency

Double-submit protection via compound unique constraint `(userId, idempotencyKey)`:

1. **Pre-check** (fast path) — `SELECT` before opening transaction
2. **DB constraint** (safe path) — unique violation `23505` caught in `catch` block, existing order returned
3. Both paths return the same order — client sees identical response regardless of race conditions

#### Error Matrix

| Scenario | HTTP | Behavior |
|----------|------|----------|
| Insufficient stock | 409 Conflict | Rollback + ConflictException |
| Product not found | 400 Bad Request | Rollback + BadRequestException |
| Duplicate idempotencyKey (pre-check) | 200 | Return existing order |
| Duplicate idempotencyKey (race condition) | 200 | Rollback + fetch existing |
| Unknown error | 500 | Rollback + log + InternalServerErrorException |

### Part 2 — SQL Optimization

#### Hot Query

The most frequently executed query — fetching user orders with filters (status, date range):

```sql
SELECT o.*, oi.*
FROM orders o
LEFT JOIN order_items oi ON oi."orderId" = o.id
WHERE o."userId" = $1
  AND o."status" = $2
  AND o."createdAt" >= $3
  AND o."createdAt" <= $4
ORDER BY o."createdAt" DESC;
```

#### Composite Index

```sql
CREATE INDEX "IDX_orders_userId_status_createdAt"
  ON "orders" ("userId", "status", "createdAt");
```

Column order follows the **equality-equality-range** principle for maximum selectivity.

#### EXPLAIN ANALYZE — WITHOUT index

```
Sort  (cost=28.08..28.21 rows=53 width=145) (actual time=0.073..0.075 rows=14 loops=1)
  Sort Key: o."createdAt" DESC
  Sort Method: quicksort  Memory: 26kB
  ->  Hash Right Join  (cost=6.67..26.56 rows=53 width=145) (actual time=0.054..0.061 rows=14 loops=1)
        Hash Cond: (oi."orderId" = o.id)
        ->  Seq Scan on order_items oi  (cost=0.00..17.80 rows=780 width=76) (actual time=0.009..0.009 rows=0 loops=1)
        ->  Hash  (cost=6.52..6.52 rows=12 width=69) (actual time=0.039..0.039 rows=14 loops=1)
              ->  Seq Scan on orders o  (cost=0.00..6.52 rows=12 width=69) (actual time=0.013..0.036 rows=14 loops=1)
                    Filter: (("createdAt" >= '2025-01-01' AND "createdAt" <= '2025-12-31')
                             AND ("userId" = '...') AND (status = 'pending'))
                    Rows Removed by Filter: 186
Planning Time: 0.225 ms
Execution Time: 0.112 ms
```

#### EXPLAIN ANALYZE — WITH index

```
Sort  (cost=26.37..26.51 rows=53 width=145) (actual time=0.086..0.089 rows=14 loops=1)
  Sort Key: o."createdAt" DESC
  Sort Method: quicksort  Memory: 26kB
  ->  Hash Right Join  (cost=4.96..24.86 rows=53 width=145) (actual time=0.053..0.059 rows=14 loops=1)
        Hash Cond: (oi."orderId" = o.id)
        ->  Seq Scan on order_items oi  (cost=0.00..17.80 rows=780 width=76) (actual time=0.015..0.015 rows=0 loops=1)
        ->  Hash  (cost=4.81..4.81 rows=12 width=69) (actual time=0.027..0.028 rows=14 loops=1)
              ->  Index Scan Backward using "IDX_orders_userId_status_createdAt" on orders o
                    (cost=0.27..4.81 rows=12 width=69) (actual time=0.015..0.021 rows=14 loops=1)
                    Index Cond: (("userId" = '...') AND (status = 'pending')
                                 AND ("createdAt" >= '2025-01-01') AND ("createdAt" <= '2025-12-31'))
                    Index Searches: 1
Planning Time: 0.600 ms
Execution Time: 0.130 ms
```

#### Analysis

| Metric | Without Index | With Index | Improvement |
|--------|--------------|------------|-------------|
| Scan type | **Seq Scan** (full table) | **Index Scan Backward** | Direct index lookup |
| Rows scanned | 200 (all rows) | 14 (only matching) | ~14x fewer rows read |
| Rows removed by filter | 186 | 0 | All filtering done by index |
| Orders scan cost | 6.52 | 4.81 | ~26% lower cost |
| Total cost | 28.08 | 26.37 | ~6% lower total cost |

**Key observations:**
- **Seq Scan** reads all 200 rows and discards 186 via post-filter. **Index Scan** reads only the 14 matching rows directly from the B-tree — zero wasted I/O.
- **Index Scan Backward** traverses the index in descending `createdAt` order, which aligns with `ORDER BY createdAt DESC`. With a larger dataset, PostgreSQL can eliminate the Sort step entirely.
- On 200 rows the absolute time difference is negligible (milliseconds). On a production table with millions of orders the difference becomes critical: Seq Scan grows linearly with table size (O(n)), while Index Scan stays proportional to the result set (O(log n + k)).

## Git Hooks

Pre-commit runs lint-staged and type-check. Pre-push runs build and tests. No broken code gets through.

## License

ZelikSV

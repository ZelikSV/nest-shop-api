# Nest Shop API

E-commerce REST API + GraphQL built with NestJS.

**Live Demo:** [https://nest-shop-api-0shf.onrender.com/api-docs](https://nest-shop-api-0shf.onrender.com/api-docs)

---

## Docker

### Files

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage build: `deps` → `build` → `prod-deps` → `dev` / `prod` / `prod-distroless` |
| `compose.yml` | Prod-like local stack: `api` + `postgres` + `rabbitmq` + one-off `migrate` / `seed` |
| `compose.dev.yml` | Dev override: bind-mount, hot reload, exposed postgres and rabbitmq ports |
| `.dockerignore` | Excludes `node_modules`, `dist`, `.env*`, tests, dev tooling |
| `.env.example` | Template for required environment variables (no secrets) |

### Quick Start

#### 1. Prepare environment

```bash
cp .env.example .env
# Edit .env — set DB_PASSWORD, JWT_SECRET, AWS credentials, etc.
```

#### 2. Dev (hot reload)

```bash
docker compose -f compose.yml -f compose.dev.yml up --build
```

- API: http://localhost:8080
- Swagger: http://localhost:8080/api-docs
- GraphQL: http://localhost:8080/graphql
- Postgres exposed on `localhost:5432` (for local DB clients)
- RabbitMQ Management UI: http://localhost:15672 (guest / guest)
- Any file change is picked up immediately — no image rebuild needed

#### 3. Prod-like

```bash
docker compose up --build
```

- API: http://localhost:8080
- Postgres is **not** exposed to the host (internal network only)

#### 4. Migrations & seed (one-off jobs)

Run before or after starting the stack — migrations connect directly to the postgres container:

```bash
# Apply all pending TypeORM migrations
docker compose run --rm migrate

# Populate the database with mock users and products
docker compose run --rm seed
```

> `migrate` and `seed` services use the `tools` profile so they are **never** started by `docker compose up` — they must be triggered explicitly.

#### 5. Build a specific Dockerfile target

```bash
# Production image
docker build --target prod -t nest-shop-api:prod .

# Distroless image
docker build --target prod-distroless -t nest-shop-api:distroless .
```

---

### Troubleshooting (dev mode)

#### API container restarts once on first boot (`RestartCount: 1`)

On a fresh clone the TypeScript watcher needs to do an initial compilation before the app is reachable. If Docker restarts the container once and then the app starts normally, it means the first compilation attempt exited before the server was up.

**Fixed in** `nest-cli.json` (`tsConfigPath: tsconfig.build.json`) — forces `nest start --watch` to use the same tsconfig as `nest build`, excluding `test/` and `**/*.spec.ts` from the compilation scope.

To verify the container is healthy after startup:

```bash
docker compose -f compose.yml -f compose.dev.yml ps
# api service should show "(healthy)" after ~60 s
```

#### App started but watch mode doesn't pick up my changes

The bind-mount is `.:/app` and the anonymous volume is `/app/node_modules`. If you add a package on the host without rebuilding the image, the container's `node_modules` won't have it:

```bash
# Rebuild the dev image to reinstall node_modules inside the container
docker compose -f compose.yml -f compose.dev.yml up --build
```

#### TypeScript errors appear in the logs but prod builds fine

`tsconfig.build.json` excludes test files; `tsconfig.json` does not. If you see TS errors only in watch mode, check whether the errors are in `*.spec.ts` or `test/` files — they will not affect the production build.

---

### Image optimisation

After building all targets, compare sizes:

```bash
docker image ls nest-shop-api
```

Example output (actual numbers will differ by environment):

```
REPOSITORY       TAG           IMAGE ID       SIZE
nest-shop-api    dev           xxxxxxxxxxxx   ~700 MB   # all deps + dev tools
nest-shop-api    prod          xxxxxxxxxxxx   ~250 MB   # prod deps + dist only
nest-shop-api    distroless    xxxxxxxxxxxx   ~180 MB   # no shell, no pkg manager
```

View layer breakdown of the distroless image:

```bash
docker history nest-shop-api:distroless
```

**Why `prod-distroless` is smaller and safer:**

- Based on `gcr.io/distroless/nodejs24-debian12` — contains only the Node.js runtime and its minimal OS dependencies (no `bash`, `sh`, `apt`, `curl`, etc.)
- Attack surface is drastically reduced: an attacker who gains code execution cannot spawn a shell or install tools
- No package manager means no accidental or malicious package installs at runtime
- `prod` already removes `src/`, `devDependencies`, and all dev tooling; `prod-distroless` additionally removes the entire OS userland

---

### Non-root verification

#### `prod` stage

The `Dockerfile` creates a dedicated system user `nestjs` and switches to it before the `CMD`:

```dockerfile
RUN groupadd --system nestjs \
 && useradd  --system --gid nestjs --no-create-home nestjs
...
USER nestjs
```

Verify at runtime:

```bash
docker run --rm nest-shop-api:prod id
# uid=999(nestjs) gid=999(nestjs) groups=999(nestjs)
```

#### `prod-distroless` stage

The `:nonroot` tag of `gcr.io/distroless/nodejs24-debian12` sets `USER 65532` (the `nonroot` user) in the base image — no explicit `USER` instruction is needed.

Distroless images have no shell so `id` cannot be run inside the container. Non-root is guaranteed by the base image itself. Confirm with:

```bash
docker inspect nest-shop-api:distroless \
  --format '{{ (index .Config.User) }}'
# 65532
```

---

## API Endpoints

### REST API

#### Auth (public)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/auth/register` | — | Register new user, returns `accessToken` |
| `POST` | `/api/v1/auth/login` | — | Login with email/password, returns `accessToken` |
| `GET` | `/api/v1/auth/profile` | `Bearer` | Get current user profile |

#### Users (Admin only 🔒)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/users` | `Bearer` + ADMIN | Get all users |
| `GET` | `/api/v1/users/:id` | `Bearer` + ADMIN | Get user by ID |
| `POST` | `/api/v1/users/new` | `Bearer` + ADMIN | Create user |
| `PUT` | `/api/v1/users/:id` | `Bearer` + ADMIN | Update user |
| `DELETE` | `/api/v1/users/:id` | `Bearer` + ADMIN | Delete user |

#### Products

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/products` | — | Get all products |
| `GET` | `/api/v1/products/:id` | — | Get product by ID |
| `POST` | `/api/v1/products` | — | Create product |
| `PUT` | `/api/v1/products/:id` | — | Update product |
| `DELETE` | `/api/v1/products/:id` | — | Delete product |

#### Orders

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/orders` | — | Create order (idempotent) |
| `GET` | `/api/v1/orders/user/:userId` | — | Get orders by user |
| `GET` | `/api/v1/orders/:id` | — | Get order by ID |

#### Files (JWT 🔒)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/files/presign` | `Bearer` | Generate presigned S3 upload URL, creates FileRecord (status: pending) |
| `POST` | `/api/v1/files/complete` | `Bearer` | Mark upload as complete (pending → ready), attach file to User |

### GraphQL API

| Endpoint | Description |
|----------|-------------|
| `POST` `/graphql` | GraphQL endpoint for all queries/mutations |
| `GET` `/graphql` | GraphQL Playground (development only) |

**Available Queries:**
- `orders(userId: ID!, filter: OrdersFilterInput, pagination: OrdersPaginationInput): [Order!]!` - Get orders with filtering and pagination

**See [homework07.md](./homework07.md) for detailed GraphQL documentation.**

## Authentication

The API uses **JWT Bearer token** authentication.

### Flow

```
POST /api/v1/auth/register  →  { accessToken }
POST /api/v1/auth/login     →  { accessToken }

Authorization: Bearer <accessToken>  →  protected endpoints
```

### Register

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "age": 25,
  "email": "john@example.com",
  "password": "secret123"
}
```

Response:
```json
{ "accessToken": "eyJhbGci..." }
```

### Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "secret123"
}
```

Response:
```json
{ "accessToken": "eyJhbGci..." }
```

### Using the token

```http
GET /api/v1/auth/profile
Authorization: Bearer eyJhbGci...
```

### Roles

| Role | Access |
|------|--------|
| `customer` | Default role on registration |
| `admin` | Full access to `/api/v1/users/*` CRUD |

Roles are embedded in the JWT payload and validated server-side via `RolesGuard`.

---

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
│   │   └── roles.decorator.ts     # @Roles() decorator
│   ├── filters/
│   ├── guards/
│   │   ├── jwt-auth.guard.ts      # JwtAuthGuard
│   │   └── roles.guard.ts         # RolesGuard
│   ├── interceptors/
│   ├── mocks/           # Shared mock data (single source of truth for seeds & tests)
│   ├── pipes/
│   └── types/
├── config/              # App configuration (data-source for TypeORM CLI)
├── database/            # DatabaseModule (TypeORM + PostgreSQL connection)
├── migrations/          # TypeORM migrations
├── seeds/               # Database seed script
└── modules/
    ├── auth/            # JWT authentication (register, login, profile)
    │   ├── dto/
    │   ├── strategies/  # Passport JWT strategy
    │   ├── auth.controller.ts
    │   ├── auth.service.ts
    │   └── auth.module.ts
    ├── users/           # Users CRUD (Admin only)
    │   └── enums/
    │       └── user-role.enum.ts  # UserRole: ADMIN | CUSTOMER
    ├── products/        # Products CRUD
    ├── orders/          # Orders (transactional creation + MQ publish)
    ├── files/           # S3 presigned upload (FilesModule)
    ├── rabbitmq/        # RabbitMQ connection, topology, publish()
    └── worker/          # Consumer: manual ack, retry, DLQ, idempotency
        ├── dto/
        ├── enums/       # FileStatus (pending/ready), FileVisibility (private/public)
        ├── file-record.entity.ts
        ├── files.controller.ts
        ├── files.service.ts
        ├── files.module.ts
        └── storage.service.ts  # S3Client wrapper
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
| `users` | User accounts (email unique, password hash, role: admin/customer, avatarFileId) |
| `products` | Product catalog with stock & versioning |
| `orders` | Orders with idempotency key & status (pending → processed) |
| `order_items` | Order line items (snapshot price) |
| `file_records` | File metadata: key, contentType, size, status (pending/ready), visibility |
| `processed_messages` | RabbitMQ idempotency log — one row per processed `messageId` (unique PK) |

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

**Required variables:**

| Variable | Description |
|----------|-------------|
| `DB_*` | PostgreSQL connection |
| `JWT_SECRET` | Secret key for signing JWT tokens |
| `JWT_EXPIRES_IN` | Token TTL, e.g. `3600s` or `7d` |
| `RABBITMQ_URL` | RabbitMQ connection URL, e.g. `amqp://guest:guest@localhost:5672` |
| `AWS_REGION` | S3 bucket region |
| `AWS_ACCESS_KEY_ID` | AWS credentials |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials |
| `S3_BUCKET_NAME` | Bucket for file uploads |
| `CLOUDFRONT_BASE_URL` | CDN prefix for file URLs (optional) |

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
| Passport + JWT | Authentication |
| bcrypt | Password hashing |
| GraphQL | API (code-first approach) |
| Apollo Server | GraphQL server |
| DataLoader | Query batching & caching |
| PostgreSQL | Database |
| TypeORM | ORM |
| AWS SDK v3 | S3 file storage |
| Jest 30 | Testing |
| Swagger | REST API docs |
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

## Homework 07 — GraphQL API + DataLoader

Complete implementation of GraphQL API for the Orders system using NestJS code-first approach with N+1 query optimization through DataLoader.

### 1. Code-First Approach

**Why Code-First?**

- **TypeScript-First:** Project already uses TypeORM entities with decorators - code-first naturally extends this pattern
- **Less Duplication:** No separate `.graphql` files - `@ObjectType` and `@Field` decorators auto-generate schema
- **Type Safety:** Full compile-time type checking between resolvers and schema
- **Better DX:** IntelliSense, auto-completion, refactoring work out-of-the-box

**Configuration:**
```typescript
GraphQLModule.forRootAsync<ApolloDriverConfig>({
  driver: ApolloDriver,
  autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
  sortSchema: true,
  playground: true,
  context: ({ req }) => ({
    loaders: {
      productLoader: productsLoader.createProductLoader(), // Fresh per request
    },
  }),
})
```

### 2. GraphQL Schema

#### Domain Types

**Product Type:**
```typescript
@ObjectType('Product')
export class ProductType {
  @Field(() => ID) id: string;
  @Field() name: string;
  @Field({ nullable: true }) description?: string;  // ✅ Nullable
  @Field(() => Float) price: number;
  @Field(() => Int) stock: number;
}
```

**OrderItem Type:**
```typescript
@ObjectType('OrderItem')
export class OrderItemType {
  @Field(() => ID) id: string;
  @Field(() => Int) quantity: number;
  @Field(() => Float) price: number;
  @Field(() => ID, { nullable: true }) productId?: string;  // ✅ Nullable if deleted
  @Field(() => ProductType, { nullable: true }) product?: ProductType;
}
```

**Order Type:**
```typescript
@ObjectType('Order')
export class OrderType {
  @Field(() => ID) id: string;
  @Field(() => ID) userId: string;
  @Field(() => OrderStatus) status: OrderStatus;  // ✅ Enum
  @Field(() => Float) totalPrice: number;
  @Field(() => [OrderItemType]) items: OrderItemType[];  // ✅ Non-nullable array
  @Field() createdAt: Date;
}
```

**OrderStatus Enum:**
```typescript
registerEnumType(OrderStatus, {
  name: 'OrderStatus',
  valuesMap: {
    PENDING: { description: 'Order is pending confirmation' },
    CONFIRMED: { description: 'Order has been confirmed' },
    SHIPPED: { description: 'Order has been shipped' },
    DELIVERED: { description: 'Order has been delivered' },
    CANCELLED: { description: 'Order has been cancelled' },
  },
});
```

#### Input Types

**OrdersFilterInput:**
```typescript
@InputType()
export class OrdersFilterInput {
  @Field(() => OrderStatus, { nullable: true })
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @Field({ nullable: true })
  @IsDateString()
  dateFrom?: string;

  @Field({ nullable: true })
  @IsDateString()
  dateTo?: string;
}
```

**OrdersPaginationInput:**
```typescript
@InputType()
export class OrdersPaginationInput {
  @Field(() => Int, { nullable: true, defaultValue: 10 })
  @Max(50)  // ✅ Protect against heavy queries
  limit?: number = 10;

  @Field(() => Int, { nullable: true, defaultValue: 0 })
  @Min(0)
  offset?: number = 0;
}
```

### 3. Thin Resolvers Pattern

**OrdersResolver** - only coordinates, delegates to service:
```typescript
@Resolver(() => OrderType)
export class OrdersResolver {
  constructor(private readonly ordersService: OrdersService) {}

  @Query(() => [OrderType])
  async orders(
    @Args('userId', { type: () => ID }) userId: string,
    @Args('filter', { nullable: true }) filter?: OrdersFilterInput,
    @Args('pagination', { nullable: true }) pagination?: OrdersPaginationInput,
  ): Promise<Order[]> {
    // ✅ Convert GraphQL params
    const startDate = filter?.dateFrom ? new Date(filter.dateFrom) : undefined;
    const endDate = filter?.dateTo ? new Date(filter.dateTo) : undefined;

    // ✅ Delegate to service (business logic stays here)
    const allOrders = await this.ordersService.findOrdersByUser(
      userId, filter?.status, startDate, endDate
    );

    // ✅ Apply pagination
    const limit = pagination?.limit ?? 10;
    const offset = pagination?.offset ?? 0;
    return allOrders.slice(offset, offset + limit);
  }
}
```

**OrderItemResolver** - field resolver with DataLoader:
```typescript
@Resolver(() => OrderItemType)
export class OrderItemResolver {
  @ResolveField(() => ProductType, { nullable: true })
  async product(
    @Parent() orderItem: OrderItem,
    @Context() context: any,
  ): Promise<ProductType | null> {
    if (!orderItem.productId) return null;

    // ✅ DataLoader batches all loads into single query
    return context.loaders.productLoader.load(orderItem.productId);
  }
}
```

### 4. DataLoader — Solving N+1 Problem

#### The Problem

**Without DataLoader:**
```graphql
query {
  orders(userId: "user-123") {
    items {
      product { id, name }  # ❌ Separate SQL query for EACH item
    }
  }
}
```

**SQL queries executed:**
```sql
-- 1 query for orders
SELECT * FROM orders WHERE userId = 'user-123';

-- N queries for products (one per item) 😱
SELECT * FROM products WHERE id = 'product-1';
SELECT * FROM products WHERE id = 'product-2';
SELECT * FROM products WHERE id = 'product-3';
-- ... 7 more for 10 items
```

**Result:** 1 + N queries = **11 SQL queries** for 10 items

#### The Solution

**Step 1 - Add `findByIds` to ProductsService:**
```typescript
async findByIds(ids: string[]): Promise<Product[]> {
  return this.productRepository
    .createQueryBuilder('product')
    .where('product.id IN (:...ids)', { ids })  // ✅ Batched query
    .getMany();
}
```

**Step 2 - Create ProductsLoader:**
```typescript
@Injectable()
export class ProductsLoader {
  constructor(private readonly productsService: ProductsService) {}

  createProductLoader(): DataLoader<string, Product | null> {
    return new DataLoader<string, Product | null>(
      async (productIds: readonly string[]) => {
        const ids = [...productIds];
        const products = await this.productsService.findByIds(ids);

        // ✅ Map for O(1) lookups
        const productMap = new Map(products.map(p => [p.id, p]));

        // ✅ Return in same order as IDs, null for missing
        return ids.map(id => productMap.get(id) ?? null);
      },
      { cache: true }
    );
  }
}
```

**Step 3 - Integrate in GraphQL Context:**
```typescript
context: ({ req }) => ({
  loaders: {
    productLoader: productsLoader.createProductLoader(), // Fresh per request
  },
})
```

**Step 4 - Use in Field Resolver:**
```typescript
@ResolveField(() => ProductType, { nullable: true })
async product(@Parent() orderItem: OrderItem, @Context() context: any) {
  if (!orderItem.productId) return null;
  return context.loaders.productLoader.load(orderItem.productId);
}
```

#### The Result

**With DataLoader:**
```sql
-- 1 query for orders
SELECT * FROM orders WHERE userId = 'user-123';

-- 1 BATCHED query for ALL products 🚀
SELECT * FROM products WHERE id IN ('product-1', 'product-2', ..., 'product-10');
```

**Result:** 1 + 1 = **2 SQL queries** for 10 items

**Improvement:** 11 queries → 2 queries = **5.5x less database load** ✅

### 5. Example Queries

**Basic query:**
```graphql
query GetOrders {
  orders(userId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890") {
    id
    status
    totalPrice
    createdAt
    items {
      quantity
      price
      product { id, name, price }
    }
  }
}
```

**With filtering:**
```graphql
query GetPendingOrders {
  orders(
    userId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    filter: { status: PENDING, dateFrom: "2024-01-01T00:00:00Z" }
  ) {
    id
    status
    totalPrice
  }
}
```

**With pagination:**
```graphql
query GetOrdersPage {
  orders(
    userId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    pagination: { limit: 5, offset: 10 }
  ) {
    id
    createdAt
  }
}
```

**Full example:**
```graphql
query GetRecentShippedOrders {
  orders(
    userId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    filter: {
      status: SHIPPED
      dateFrom: "2024-12-01T00:00:00Z"
      dateTo: "2024-12-31T23:59:59Z"
    }
    pagination: { limit: 20, offset: 0 }
  ) {
    id
    status
    totalPrice
    items {
      quantity
      price
      product { id, name, description, price, stock }
    }
  }
}
```

### 6. Testing

**Start server:**
```bash
NODE_ENV=development yarn start:dev
```

**GraphQL Playground:** `http://localhost:3000/graphql`

**Check SQL logs in console:**
```
query: SELECT "order"."id", ... FROM "orders" ...
query: SELECT "product".* FROM "products" WHERE "product"."id" IN ($1, $2, ...)
```

### Key Achievements

✅ **Type Safety:** Full typing from database → service → resolver → GraphQL schema
✅ **Performance:** 5.5x reduction in SQL queries through DataLoader
✅ **Maintainability:** Business logic in services, thin resolvers
✅ **DX:** Code-first approach with auto-generated schema
✅ **Security:** Input validation, pagination limits (max 50)
✅ **Error Handling:** GraphQL errors with meaningful messages

## Homework 09 — S3 Presigned Upload with FileRecord lifecycle

### Domain integrated: **Users (avatar)**

`User.avatarFileId` → `file_records.id`. After a successful `complete`, `GET /api/v1/users/:id` returns `avatarUrl`.

---

### Upload flow

```
1. POST /api/v1/files/presign
   Body: { entityId: "<userId>", contentType: "image/jpeg" }
   → Backend validates JWT, generates key, creates FileRecord (status: pending)
   → Returns { fileId, key, uploadUrl, contentType }

2. PUT <uploadUrl>   (direct to S3, no backend involved)
   Header: Content-Type: image/jpeg
   Body: <binary file>

3. POST /api/v1/files/complete
   Body: { fileId: "<fileId>" }
   → Backend validates ownership (fileRecord.ownerId === req.user.id)
   → Transitions FileRecord: pending → ready
   → Updates User.avatarFileId = fileRecord.id

4. GET /api/v1/users/:id
   → Response includes avatarUrl (CloudFront or S3 URL)
```

---

### Key generation

The backend generates the S3 key — the client only provides `contentType`:

```
users/{entityId}/avatars/{uuid}.{ext}
```

Example: `users/a1b2c3d4-.../avatars/7f3e2c1a-....jpeg`

The client **cannot** supply or influence the key path — preventing path traversal / foreign-prefix uploads.

---

### Access control

| Check | Where | How |
|-------|-------|-----|
| JWT required | `FilesController` | `@UseGuards(JwtAuthGuard)` |
| Own entity only | `FilesService.presign()` | `ownerId !== entityId → ForbiddenException` |
| Own file only | `FilesService.complete()` | `fileRecord.ownerId !== ownerId → ForbiddenException` |
| Pending only | `FilesService.complete()` | `status !== PENDING → BadRequestException` |
| User exists | `FilesService.presign()` | `usersService.getUserById(entityId)` |

---

### File URL construction

Priority: `CLOUDFRONT_BASE_URL` (env) → S3 direct URL (dev fallback).

```
CLOUDFRONT_BASE_URL set   →  https://<dist>.cloudfront.net/{key}
CLOUDFRONT_BASE_URL empty →  https://<bucket>.s3.<region>.amazonaws.com/{key}
```

URL is computed at read-time (not stored in DB), so changing CloudFront config takes effect immediately.

---

### Invoice flow for Orders (bonus)

Same presign → upload → complete flow, but `entityType: "order"`:

```
1. POST /api/v1/files/presign
   Body: { entityId: "<orderId>", entityType: "order", contentType: "application/pdf" }
   → Validates JWT, checks order.userId === req.user.id (ForbiddenException if not)
   → Generates key: orders/{orderId}/invoices/{uuid}.pdf
   → Creates FileRecord (status: pending)
   → Returns { fileId, key, uploadUrl, contentType }

2. PUT <uploadUrl>   (direct to S3)
   Header: Content-Type: application/pdf

3. POST /api/v1/files/complete
   Body: { fileId: "<fileId>" }
   → Validates ownership (fileRecord.ownerId === req.user.id)
   → Transitions pending → ready
   → Updates Order.invoiceFileId = fileRecord.id

4. GET /api/v1/orders/:id   (requires Bearer token)
   → Returns order + invoiceUrl (only if requester is the order owner or ADMIN role)
   → ForbiddenException for everyone else

5. GET /api/v1/orders/:id/public   (no auth)
   → Returns basic order data without invoiceUrl
```

Access control for invoices:

| Action | Who can do it |
|--------|--------------|
| `presign` for order | Only the order owner (order.userId === req.user.id) |
| `complete` for order | Only the user who called presign (fileRecord.ownerId) |
| View `invoiceUrl` | Order owner or ADMIN |

---

### FileRecord entity

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary key |
| `ownerId` | uuid | User who initiated the upload |
| `entityId` | uuid | Entity the file will be attached to (User ID) |
| `key` | varchar | S3 object key, generated by backend |
| `contentType` | varchar | MIME type (image/jpeg, image/png, image/webp) |
| `size` | int | File size in bytes (nullable, filled by client optionally) |
| `status` | enum | `pending` → `ready` |
| `visibility` | enum | `private` / `public` |

---

## Homework 12 — RabbitMQ: Async Order Processing

### Overview

```
POST /orders
    │
    ├─ Save order to DB (status: PENDING)
    └─ Publish to orders.process ──► Worker
                                        │
                                        ├─ success  → UPDATE status=PROCESSED + ack
                                        ├─ failure  → retry (republish, delay) + ack
                                        └─ max attempts → orders.dlq + ack
```

### RabbitMQ Topology

No custom exchange — default exchange, queue name = routing key.

| Queue | Durable | Purpose |
|-------|---------|---------|
| `orders.process` | ✅ | Main work queue. Producer writes here, worker reads with `prefetch(1)` |
| `orders.dlq` | ✅ | Dead Letter Queue. Receives messages that exhausted all retry attempts |

Topology is declared in `RabbitmqService.onModuleInit()` on every connect:

```typescript
await channel.assertQueue('orders.process', { durable: true });
await channel.assertQueue('orders.dlq',     { durable: true });
```

### Retry Mechanism (Variant A — Republish + Ack)

`MAX_ATTEMPTS = 3` (total deliveries including first).

| Delivery | attempt field | On failure |
|----------|--------------|------------|
| 1st | `0` | republish with `attempt=1`, delay **1 s**, ack original |
| 2nd | `1` | republish with `attempt=2`, delay **2 s**, ack original |
| 3rd | `2` | publish to `orders.dlq`, ack original |

The original message is always **acked** — no requeue, no nack.
Delay is implemented with `setTimeout` so the prefetch slot is freed immediately.

### Message Format

```json
{
  "messageId": "uuid-v4",
  "orderId":   "uuid-v4",
  "createdAt": "2026-03-01T10:00:00.000Z",
  "attempt":   0,
  "producer":  "orders-api",
  "eventName": "order.created"
}
```

### Idempotency

Worker uses `processed_messages` table with `message_id` as primary key.

Every message handling runs inside a single transaction:

```
BEGIN
  INSERT INTO processed_messages(message_id, order_id, ...)
    → unique violation (23505)?  → ROLLBACK, ack, skip  ✅
  UPDATE orders SET status = 'processed'
COMMIT
ack
```

Works correctly with parallel workers — the unique constraint is the guard.

### How to Run

```bash
# 1. Start the stack (Postgres + RabbitMQ + API)
docker compose -f compose.yml -f compose.dev.yml up --build

# 2. Apply migrations (includes PROCESSED status + processed_messages table)
docker compose run --rm migrate

# 3. (Optional) Seed test data
docker compose run --rm seed
```

RabbitMQ Management UI → http://localhost:15672 (guest / guest)

### Demo Scenarios

#### 1. Happy Path

```bash
# Create an order
curl -s -X POST http://localhost:8080/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "<userId>",
    "idempotencyKey": "test-1",
    "items": [{ "productId": "<productId>", "quantity": 1 }]
  }'

# Poll order status — should change to PROCESSED within seconds
curl -s http://localhost:8080/api/v1/orders/<orderId>
```

Expected logs:
```
[WorkerService] Received messageId=<uuid> orderId=<uuid> attempt=0
[WorkerService] Success  messageId=<uuid> orderId=<uuid>
```

#### 2. Retry

Temporarily force a failure: in `WorkerService.handleMessage`, throw an error after parsing the payload. Restart the app and create an order.

Expected logs:
```
[WorkerService] Received messageId=<uuid> orderId=<uuid> attempt=0
[WorkerService] Retry    messageId=<uuid> orderId=<uuid> attempt=0 → 1 in 1000ms reason=...
[WorkerService] Received messageId=<uuid> orderId=<uuid> attempt=1
[WorkerService] Retry    messageId=<uuid> orderId=<uuid> attempt=1 → 2 in 2000ms reason=...
```

#### 3. DLQ

Continue from scenario 2 — after 3 failed attempts the message lands in `orders.dlq`.

Verify in Management UI:
- **Queues** tab → `orders.dlq` → Ready > 0
- **Get Messages** → inspect payload (`attempt: 2`)

Expected logs:
```
[WorkerService] DLQ messageId=<uuid> orderId=<uuid> attempt=2 reason=...
```

#### 4. Idempotency

Publish the same `messageId` twice via the Management UI:

1. Queues → `orders.process` → **Publish Message**
2. Paste the same JSON payload with an identical `messageId`
3. Publish twice

Expected logs on second delivery:
```
[WorkerService] Duplicate messageId=<uuid> orderId=<uuid> — skipped
```

Check `processed_messages` table — exactly one row for that `messageId`.

### Management UI Cheat Sheet

| Location | What to look at |
|----------|----------------|
| Overview | Message rates, connection count |
| Queues → `orders.process` | Consumer count (should be 1), message backlog |
| Queues → `orders.dlq` | Messages that failed all retries |
| Queues → Get Messages | Inspect raw payload and headers |
| Connections | Verify `nest-shop-api` connection is present |

---

## Git Hooks

Pre-commit runs lint-staged and type-check. Pre-push runs build and tests. No broken code gets through.

## License

ZelikSV

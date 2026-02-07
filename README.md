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

## Git Hooks

Pre-commit runs lint-staged and type-check. Pre-push runs build and tests. No broken code gets through.

## License

ZelikSV

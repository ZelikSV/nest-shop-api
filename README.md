# 🛒 Nest Shop API

E-commerce REST API built with NestJS.

## 📐 Architecture

NestJS is heavily inspired by **Angular**, so if you're familiar with Angular — you'll feel right at home. Same concepts: modules, decorators, dependency injection, services, guards, pipes, interceptors.

NestJS uses **modular architecture** by default, which keeps things clean and scalable. The idea is simple:

- Each feature lives in its own module (users, products, orders, etc.)
- Modules don't know about each other unless explicitly connected
- Easy to test, easy to extend, easy to extract into microservices later

### Project Structure

```
src/
├── common/              # Shared stuff (guards, filters, decorators)
│   ├── decorators/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   └── pipes/
├── config/              # App configuration
├── database/            # DB connection & migrations
└── modules/
    ├── users/
    ├── products/
    ├── orders/
    └── auth/
```

### How It Works

```
Request → Controller → Service → Repository → Database
```

| Layer | What it does |
|-------|--------------|
| Controller | Handles HTTP, validates input, returns response |
| Service | Business logic, doesn't care about HTTP |
| Repository | Talks to database |

### Environment Config

The app loads env files in this order (first found wins):

1. `.env.development.local` — local secrets, not committed
2. `.env.development` — env-specific config
3. `.env` — fallback

## 🚀 Quick Start

```bash
# Install
yarn install

# Create env file
cp .env.example .env.development.local

# Run
yarn start:dev
```

## 📜 Scripts

| Command | Description |
|---------|-------------|
| `yarn start:dev` | Dev mode with hot reload |
| `yarn build` | Build for production |
| `yarn start:prod` | Run production build |
| `yarn test` | Run unit tests |
| `yarn test:e2e` | Run e2e tests |
| `yarn lint` | Lint & fix |
| `yarn type-check` | TypeScript check |

## 🔧 Tech Stack

| | |
|---|---|
| NestJS 11 | Framework |
| TypeScript 5 | Language |
| Jest 30 | Testing |
| ESLint + Prettier | Code style |
| Husky | Git hooks |

## 🪝 Git Hooks

Pre-commit runs lint-staged and type-check. Pre-push runs build and tests. No broken code gets through.

## 📝 License

ZelikSV

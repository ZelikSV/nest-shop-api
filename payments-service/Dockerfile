# ─── Stage: deps ──────────────────────────────────────────────────────────────
FROM node:24-slim AS deps

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# ─── Stage: build ─────────────────────────────────────────────────────────────
FROM deps AS build

COPY . .
RUN yarn build

# ─── Stage: prod-deps ─────────────────────────────────────────────────────────
FROM node:24-slim AS prod-deps

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production

# ─── Stage: prod ──────────────────────────────────────────────────────────────
FROM node:24-slim AS prod

WORKDIR /app

RUN groupadd --system payments \
 && useradd  --system --gid payments --no-create-home payments

COPY --from=prod-deps --chown=payments:payments /app/node_modules ./node_modules
COPY --from=build     --chown=payments:payments /app/dist         ./dist
COPY                  --chown=payments:payments package.json      ./

ENV NODE_ENV=production

USER payments
EXPOSE 5000
CMD ["node", "dist/main"]

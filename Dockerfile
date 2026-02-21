# ─── Stage: deps ──────────────────────────────────────────────────────────────
# Install ALL dependencies (including devDependencies) needed for building.
FROM node:24-slim AS deps

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# ─── Stage: build ─────────────────────────────────────────────────────────────
# Compile TypeScript → JavaScript (outputs to dist/).
FROM deps AS build

COPY . .
RUN yarn build

# ─── Stage: prod-deps ─────────────────────────────────────────────────────────
# Install ONLY production dependencies for the runtime image.
# Keeps bcrypt native binaries built on the same glibc (Debian slim) base
# as the prod and prod-distroless stages.
FROM node:24-slim AS prod-deps

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production

# ─── Stage: dev ───────────────────────────────────────────────────────────────
# Development image — full deps, source copied in.
# In compose.dev.yml the source is bind-mounted over /app; the anonymous
# volume at /app/node_modules prevents the host directory from overwriting
# the container's installed dependencies.
FROM node:24-slim AS dev

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 3000
CMD ["yarn", "start:dev"]

# ─── Stage: prod ──────────────────────────────────────────────────────────────
# Minimal runtime: only dist/ + prod node_modules; no src/, no devDeps.
# Runs as a non-root system user (nestjs, uid assigned by the OS).
FROM node:24-slim AS prod

WORKDIR /app

RUN groupadd --system nestjs \
 && useradd  --system --gid nestjs --no-create-home nestjs

COPY --from=prod-deps --chown=nestjs:nestjs /app/node_modules ./node_modules
COPY --from=build     --chown=nestjs:nestjs /app/dist         ./dist
COPY                  --chown=nestjs:nestjs package.json      ./

ENV NODE_ENV=production

USER nestjs
EXPOSE 3000
CMD ["node", "dist/main"]

# ─── Stage: prod-distroless ───────────────────────────────────────────────────
# Distroless runtime — no shell, no package manager, minimal attack surface.
# The :nonroot tag sets the user to uid 65532 (nonroot) automatically;
# no USER instruction is needed.
# ENTRYPOINT in distroless/nodejs images is ["node"], so CMD provides the
# entry script path only.
FROM gcr.io/distroless/nodejs24-debian12:nonroot AS prod-distroless

WORKDIR /app

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build     /app/dist         ./dist
COPY --from=build     /app/package.json ./

ENV NODE_ENV=production

EXPOSE 3000
CMD ["dist/main"]

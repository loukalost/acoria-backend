# ============================================
# Stage 1: Dependencies Installation Stage
# ============================================
ARG NODE_VERSION=24.13.0-slim

FROM node:${NODE_VERSION} AS dependencies

WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma/

RUN apt-get update -y && apt-get install -y openssl

RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

RUN npx prisma generate

# ============================================
# Stage 2: Build NestJS application
# ============================================
FROM node:${NODE_VERSION} AS builder

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/prisma ./prisma

COPY . .

ENV NODE_ENV=production

RUN npm run build

# ============================================
# Stage 3: Run NestJS application
# ============================================
FROM node:${NODE_VERSION} AS runner

WORKDIR /app

# Correctifs OS + on garde openssl (requis par Prisma) mais on vire npm/npx après usage
RUN apt-get update \
  && apt-get upgrade -y \
  && apt-get install -y openssl \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=51212
ENV DATABASE_URL="postgresql://user:password@localhost:5432/db?schema=public"

COPY package.json package-lock.json* ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Install uniquement les deps de prod + regénère le client Prisma pour cette étape
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --no-audit --no-fund \
  && ./node_modules/.bin/prisma generate \
  && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

COPY --from=builder --chown=node:node /app/dist ./dist

USER node

EXPOSE 51212

CMD ["node", "dist/src/main.js"]
FROM node:22-slim AS base
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app
# prisma.config.ts resolves DATABASE_URL to load the schema even for `generate`,
# which doesn't connect to a DB. Real value is supplied at runtime via docker-compose.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN pnpm install --frozen-lockfile
RUN npx prisma generate

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN pnpm run build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./
COPY package.json ./
EXPOSE 8787
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]

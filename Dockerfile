# ── Stage 1: prod deps (compiles better-sqlite3 native module) ────────────────
FROM node:24-slim AS deps-prod

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

# ── Stage 2: build (Vite + tsc) ───────────────────────────────────────────────
FROM node:24-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# ── Stage 3: runtime ──────────────────────────────────────────────────────────
FROM node:24-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV DATABASE_URL=file:/data/sweet-potato.db
ENV PORT=3000

# Compiled prod deps from stage 1 (includes prebuilt better-sqlite3 .node binary)
COPY --from=deps-prod /app/node_modules ./node_modules
# Server JS + views + migrations
COPY --from=builder /app/dist ./dist
# Client assets
COPY --from=builder /app/public ./public
# package.json needed for "type": "module" ESM resolution
COPY --from=builder /app/package.json ./

# SQLite lives on a mounted volume so it survives redeploys
RUN mkdir -p /data
VOLUME /data

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
  CMD node -e "fetch('http://localhost:'+process.env.PORT+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Run migrations on every start, then serve
CMD ["sh", "-c", "node dist/server/db/migrate.js && node dist/server/index.js"]

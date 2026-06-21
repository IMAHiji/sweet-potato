# syntax=docker/dockerfile:1

# ---- Base: Node 24 + pnpm via corepack -----------------------------------
FROM node:24-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

# ---- Build: install all deps, compile client + server --------------------
FROM base AS build
# Toolchain for compiling better-sqlite3's native addon when no prebuilt
# binary is available for the target platform.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
# Drop dev dependencies so the runner only ships production deps.
RUN pnpm prune --prod

# ---- Runner: slim image with only what we serve --------------------------
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Run migrations, then start the server.
CMD ["sh", "-c", "node dist/server/db/migrate.js && node dist/server/index.js"]

# syntax=docker/dockerfile:1
# Next.js 16 butuh Node >= 20.9; README menetapkan Node >= 22
ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-alpine AS base
WORKDIR /app
# HUSKY=0: tidak ada .git di dalam image, jadi hook `prepare` dilewati
ENV NEXT_TELEMETRY_DISABLED=1 HUSKY=0
# pnpm diambil dari field "packageManager" di package.json
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# public/ dibutuhkan postinstall msw (workerDirectory)
COPY public ./public
RUN --mount=type=cache,id=pnpm-store,target=/root/.cache/pnpm \
    pnpm config set store-dir /root/.cache/pnpm && pnpm install --frozen-lockfile

FROM base AS source
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Dipanggil Jenkins: docker build --target test .
FROM source AS test
RUN pnpm lint && pnpm format:check && pnpm test

FROM source AS builder
# NEXT_PUBLIC_* di-inline saat build, jadi harus di-set di sini, bukan saat runtime.
# env.js menolak build production kalau mocking "enabled".
ARG NEXT_PUBLIC_API_MOCKING=disabled
ENV NODE_ENV=production NEXT_PUBLIC_API_MOCKING=${NEXT_PUBLIC_API_MOCKING}
RUN pnpm build

# Stage terakhir = image yang dijalankan (output: 'standalone' di next.config.mjs)
FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
EXPOSE 3000
USER node
# Exec form: node jadi PID 1 dan menerima SIGTERM (graceful shutdown)
CMD ["node", "server.js"]

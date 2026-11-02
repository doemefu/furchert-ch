# syntax=docker/dockerfile:1
# Multi-stage build for the Next.js standalone output (next.config sets output: 'standalone').
# Base image pinned to an exact patch and its multi-arch index digest (no 'latest', no range),
# like the sibling repos. Canonical Docker Hub reference so Dependabot (docker ecosystem) can
# bump tag + digest; when the node tag moves, bump `node-version` in ci.yml and build.yml too.
# CI does not pull it from Docker Hub directly: the BuildKit builder in build.yml / ci.yml uses
# mirror.gcr.io as a registry mirror for docker.io (also for the `syntax` frontend image above)
# and falls back to docker.io; the digest makes both serve identical bytes (#118).
FROM node:22.23.4-alpine@sha256:fe4f6d74e20370acb04ad889077d14d0f64a9c8ea6a42bc60cddf1e844699914 AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:22.23.4-alpine@sha256:fe4f6d74e20370acb04ad889077d14d0f64a9c8ea6a42bc60cddf1e844699914 AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM node:22.23.4-alpine@sha256:fe4f6d74e20370acb04ad889077d14d0f64a9c8ea6a42bc60cddf1e844699914 AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs
# Standalone output requires public/ and .next/static/ copied separately (Next.js docs).
COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]

# syntax=docker/dockerfile:1
# Production image of `web`. Build from the repository root:
#   docker build -f apps/web/Dockerfile --build-arg NEXT_PUBLIC_SITE_URL=https://lavieco.io.vn .
# No .env* file is ever copied into the image (.dockerignore); server configuration comes
# from the runtime (infra/env/prod/web.env.example). NEXT_PUBLIC_* are public values
# inlined into the bundle at build time, so they are build args, never secrets.
ARG NODE_IMAGE=node:24-alpine
ARG TURBO_VERSION=2.11.2

FROM ${NODE_IMAGE} AS prune
ARG TURBO_VERSION
WORKDIR /repo
COPY . .
# Keeps only @lavieco/web and the workspace packages it depends on, with a pruned lockfile.
RUN npx --yes turbo@${TURBO_VERSION} prune @lavieco/web --docker

FROM ${NODE_IMAGE} AS build
ENV HUSKY=0 NEXT_TELEMETRY_DISABLED=1
WORKDIR /repo
# Dependencies first: this layer is reused as long as the pruned lockfile is unchanged.
COPY --from=prune /repo/out/json/ ./
RUN npm ci
COPY --from=prune /repo/out/full/ ./
COPY tsconfig.base.json ./
ARG NEXT_PUBLIC_SITE_URL=https://lavieco.io.vn
ARG NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} \
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=${NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}
RUN npx turbo run build --filter=@lavieco/web

FROM ${NODE_IMAGE} AS runtime
# HOSTNAME must be set: Docker otherwise puts the container id there and server.js
# would listen on that name only.
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
# output: "standalone" (next.config.ts) traced from the monorepo root; static assets and
# public/ are not part of the trace and are copied next to it. Owned by `node` so the
# server can write its cache under .next/cache.
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /repo/apps/web/public ./apps/web/public
USER node
WORKDIR /app/apps/web
EXPOSE 3000
# /icon.png is served by Next itself and skipped by proxy.ts: it proves the server is up
# without depending on the services (their own health is checked by compose).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:3000/icon.png"]
CMD ["node", "server.js"]

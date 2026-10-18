# syntax=docker/dockerfile:1
# Production image of `admin`. Build from the repository root:
#   docker build -f apps/admin/Dockerfile .
# No .env* file is ever copied into the image (.dockerignore); server configuration comes
# from the runtime (infra/env/prod/admin.env.example). NEXT_PUBLIC_* are public values
# inlined into the bundle at build time, so they are build args, never secrets.
ARG NODE_IMAGE=node:24-alpine
ARG TURBO_VERSION=2.11.2

FROM ${NODE_IMAGE} AS prune
ARG TURBO_VERSION
WORKDIR /repo
COPY . .
# Keeps only @lavieco/admin and the workspace packages it depends on, with a pruned lockfile.
RUN npx --yes turbo@${TURBO_VERSION} prune @lavieco/admin --docker

FROM ${NODE_IMAGE} AS build
ENV HUSKY=0 NEXT_TELEMETRY_DISABLED=1
WORKDIR /repo
COPY --from=prune /repo/out/json/ ./
RUN npm ci
COPY --from=prune /repo/out/full/ ./
COPY tsconfig.base.json ./
ARG NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
ENV NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=${NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}
RUN npx turbo run build --filter=@lavieco/admin

FROM ${NODE_IMAGE} AS runtime
# HOSTNAME must be set: Docker otherwise puts the container id there.
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3001 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /repo/apps/admin/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=build --chown=node:node /repo/apps/admin/public ./apps/admin/public
USER node
WORKDIR /app/apps/admin
EXPOSE 3001
# /login is public in proxy.ts and renders without calling a service, so it proves the
# server is up without depending on the services (their own health is checked by compose).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:3001/login"]
CMD ["node", "server.js"]

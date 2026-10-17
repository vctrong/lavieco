# Build from the repository root:  docker build -f services/content-service/Dockerfile .
# No .env* file is ever copied into the image (.dockerignore); configuration comes from the runtime.
FROM node:24-alpine AS build
WORKDIR /repo
COPY package.json package-lock.json turbo.json tsconfig.base.json ./
COPY packages ./packages
COPY services/content-service ./services/content-service
RUN npm ci --workspace @lavieco/content-service --include-workspace-root \
  && npx turbo run build --filter=@lavieco/content-service \
  && npm prune --omit=dev --workspace @lavieco/content-service

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/packages ./packages
COPY --from=build /repo/services/content-service/package.json ./services/content-service/
COPY --from=build /repo/services/content-service/dist ./services/content-service/dist
COPY --from=build /repo/services/content-service/migrations ./services/content-service/migrations
USER node
WORKDIR /repo/services/content-service
EXPOSE 4002
CMD ["node", "--enable-source-maps", "dist/main.js"]

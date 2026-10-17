# Build from the repository root:  docker build -f services/identity-service/Dockerfile .
# No .env* file is ever copied into the image (.dockerignore); configuration comes from the runtime.
FROM node:24-alpine AS build
WORKDIR /repo
COPY package.json package-lock.json turbo.json tsconfig.base.json ./
COPY packages ./packages
COPY services/identity-service ./services/identity-service
RUN npm ci --workspace @lavieco/identity-service --include-workspace-root \
  && npx turbo run build --filter=@lavieco/identity-service \
  && npm prune --omit=dev --workspace @lavieco/identity-service

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/packages ./packages
COPY --from=build /repo/services/identity-service/package.json ./services/identity-service/
COPY --from=build /repo/services/identity-service/dist ./services/identity-service/dist
COPY --from=build /repo/services/identity-service/migrations ./services/identity-service/migrations
USER node
WORKDIR /repo/services/identity-service
EXPOSE 4001
CMD ["node", "--enable-source-maps", "dist/main.js"]

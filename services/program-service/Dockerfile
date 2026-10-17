# Build from the repository root:  docker build -f services/program-service/Dockerfile .
# No .env* file is ever copied into the image (.dockerignore); configuration comes from the runtime.
FROM node:24-alpine AS build
WORKDIR /repo
COPY package.json package-lock.json turbo.json tsconfig.base.json ./
COPY packages ./packages
COPY services/program-service ./services/program-service
RUN npm ci --workspace @lavieco/program-service --include-workspace-root \
  && npx turbo run build --filter=@lavieco/program-service \
  && npm prune --omit=dev --workspace @lavieco/program-service

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/packages ./packages
COPY --from=build /repo/services/program-service/package.json ./services/program-service/
COPY --from=build /repo/services/program-service/dist ./services/program-service/dist
COPY --from=build /repo/services/program-service/migrations ./services/program-service/migrations
USER node
WORKDIR /repo/services/program-service
EXPOSE 4004
CMD ["node", "--enable-source-maps", "dist/main.js"]

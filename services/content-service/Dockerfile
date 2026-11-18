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
# Handbook PDF imports (ADR-0029): poppler renders pages and reads their text; Liberation
# fonts stand in for the standard PDF fonts a file may use without embedding them.
# About +26 MB. Uploads wait in /var/lib/lavieco/handbook-uploads (mount a volume there
# and set HANDBOOK_UPLOAD_DIR to it); files are removed after import, at most after 24 h.
RUN apk add --no-cache poppler-utils font-liberation \
  && mkdir -p /var/lib/lavieco/handbook-uploads \
  && chown node:node /var/lib/lavieco/handbook-uploads
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

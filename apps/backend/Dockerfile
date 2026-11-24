# syntax=docker/dockerfile:1

FROM node:24-alpine AS builder
WORKDIR /workspace

RUN npm install -g pnpm@12.8.1

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages/contracts-openapi/package.json packages/contracts-openapi/
COPY packages/event-schemas/package.json packages/event-schemas/
COPY apps/backend/package.json apps/backend/
COPY tests/package.json tests/

RUN pnpm install --frozen-lockfile --ignore-scripts

COPY packages/contracts-openapi ./packages/contracts-openapi
COPY packages/event-schemas ./packages/event-schemas
COPY apps/backend ./apps/backend

RUN pnpm --filter @bina/backend build \
 && pnpm --filter @bina/backend --prod deploy --legacy /prod/backend \
 && cp -r apps/backend/assets /prod/backend/assets \
 && cp -r apps/backend/migrations /prod/backend/migrations \
 && rm -rf /prod/backend/src /prod/backend/tsconfig.json /prod/backend/Dockerfile /prod/backend/.dockerignore

FROM alpine:3.24 AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN apk add --no-cache libstdc++ libgcc ca-certificates \
 && addgroup -g 1000 node \
 && adduser -u 1000 -G node -D node

COPY --from=builder /usr/local/bin/node /usr/local/bin/node
COPY --from=builder --chown=node:node /prod/backend ./

USER node
EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/apps/api/server.js"]

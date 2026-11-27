# syntax=docker/dockerfile:1

FROM node:24-alpine AS builder
WORKDIR /workspace

ARG VITE_APP_BRAND_NAME_FA=بینا
ARG VITE_APP_BRAND_NAME_EN=Bina AI
ARG VITE_API_MODE=live
ARG VITE_API_BASE_URL=

ENV VITE_APP_BRAND_NAME_FA=$VITE_APP_BRAND_NAME_FA
ENV VITE_APP_BRAND_NAME_EN=$VITE_APP_BRAND_NAME_EN
ENV VITE_API_MODE=$VITE_API_MODE
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm install -g pnpm@12.8.1

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages/contracts-openapi/package.json packages/contracts-openapi/
COPY apps/staff-web/package.json apps/staff-web/

RUN pnpm install --frozen-lockfile --filter @bina/staff-web... --ignore-scripts

COPY packages/contracts-openapi ./packages/contracts-openapi
COPY apps/staff-web ./apps/staff-web

RUN rm -rf /workspace/apps/staff-web/src/assets/design/source \
 && pnpm --filter @bina/staff-web build

FROM nginx:1.27-alpine AS runtime

RUN rm -rf /usr/share/nginx/html/*
COPY apps/staff-web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /workspace/apps/staff-web/build/client /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1

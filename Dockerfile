# Stage 1: Install dependencies
FROM node:18-alpine AS deps
WORKDIR /app
COPY anyns-frontend/package*.json ./
RUN npm ci

# Stage 2: Build and start
FROM node:18-alpine AS builder
WORKDIR /app
COPY anyns-frontend ./
COPY deployments ../deployments
COPY --from=deps /app/node_modules ./node_modules
RUN ln -s ../deployments ./deployments && npm run build

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1
CMD ["npm", "start"]

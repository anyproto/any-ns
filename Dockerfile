# Stage 1: Install dependencies
FROM node:18-alpine AS deps
WORKDIR /app
COPY anyns-frontend/package*.json ./
RUN npm ci

# Stage 2: Build and start
FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY anyns-frontend ./
COPY deployments ../deployments
RUN ln -s ../deployments ./deployments
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]

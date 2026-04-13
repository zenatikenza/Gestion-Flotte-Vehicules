# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Runtime
FROM node:20-alpine AS runtime
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=build /app/dist ./dist
COPY --from=build /app/proto ./proto
COPY package*.json ./
RUN npm ci --omit=dev
USER appuser
# HTTP REST + gRPC
EXPOSE 8084
EXPOSE 50051
CMD ["node", "dist/main"]

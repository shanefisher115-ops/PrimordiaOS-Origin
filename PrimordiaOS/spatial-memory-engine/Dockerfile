# ==============================================================================
# PrimordiaOS Spatial Memory Engine Dockerfile
# Optimized multi-stage build for Google Cloud Run (Node.js 20 ESM)
# ==============================================================================

# --- Stage 1: Build & Compile TypeScript ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package descriptors
COPY package.json tsconfig.json ./

# Install dependencies (including typescript devDependencies)
RUN npm install

# Copy source code
COPY src/ ./src/

# Compile TypeScript to dist/
RUN npm run build

# --- Stage 2: Production Runtime ---
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV SPATIAL_MEMORY_PATH=/data/spatial-memory
ENV REALM_MAP_PATH=/data/realm-map.json

# Create storage directory and set non-root ownership
RUN mkdir -p /data/spatial-memory && chown -R node:node /data /app

# Copy compiled JavaScript from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

# Switch to non-root user
USER node

# Health check probe for container runners
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/healthz || exit 1

EXPOSE 8080

CMD ["node", "dist/index.js"]

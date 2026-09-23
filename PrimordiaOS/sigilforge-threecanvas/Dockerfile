# ==============================================================================
# PrimordiaOS :: SigilForgeThreeCanvas Multi-Stage Containerfile
# Compatible with Google Cloud Run & Local Docker Engine
# ==============================================================================

# --- Stage 1: Build & Compilation ---
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy source and typescript configurations
COPY tsconfig.json ./
COPY src/ ./src/

# Compile TypeScript to dist/
RUN npm run build

# --- Stage 2: Production Runtime ---
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV SIGILFORGE_ASSET_PATH=/app/assets
ENV SIGILFORGE_EXPORT_PATH=/app/exports

# Install only production dependencies
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# Copy compiled distribution from builder
COPY --from=builder /app/dist ./dist

# Create storage directories
RUN mkdir -p /app/assets /app/exports && chown -R node:node /app

# Switch to unprivileged user for security
USER node

# Expose standard Cloud Run port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/healthz || exit 1

# Start sovereign microservice
CMD ["node", "dist/server.js"]

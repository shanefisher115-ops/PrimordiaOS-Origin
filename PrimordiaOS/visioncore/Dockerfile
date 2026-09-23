# ==============================================================================
# PrimordiaOS VisionCore Subsystem - Production Multi-Stage Dockerfile
# Optimized for Google Cloud Run (Node.js 20+, ESM, TypeScript)
# ==============================================================================

# --- Stage 1: Build & Compilation ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json tsconfig.json ./

# Install development dependencies for TypeScript compilation
RUN npm install

# Copy source tree
COPY src/ ./src/

# Compile TypeScript to dist/
RUN npm run build

# --- Stage 2: Minimal Production Runtime ---
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV CONTAINER=true

# Copy package manifest
COPY package.json ./

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Create non-root user for Cloud Run security posture
USER node

# Expose default Cloud Run port
EXPOSE 8080

# Health check probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Start the VisionCore HTTP microservice
CMD ["node", "dist/index.js"]

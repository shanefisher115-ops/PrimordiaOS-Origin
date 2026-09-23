# ==============================================================================
# PrimordiaOS: Vertex AI x VisionCore Hybrid Subsystem
# Production Multi-Stage Dockerfile for Google Cloud Run
# ==============================================================================

# Stage 1: Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json tsconfig.json ./
RUN npm install

# Copy source code and compile TypeScript to dist/
COPY src ./src
RUN npm run build

# Prune devDependencies to keep image lightweight
RUN npm prune --production

# ==============================================================================
# Stage 2: Minimal Production Runtime
# ==============================================================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV AUTO_START_SERVER=true

# Add non-root user for security compliance on Cloud Run
RUN addgroup -S primordia && adduser -S primordia -G primordia

# Copy production artifacts from builder
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Set file permissions
RUN chown -R primordia:primordia /app

USER primordia

# Cloud Run dynamic PORT exposure
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/healthz || exit 1

# Execute standalone hybrid daemon
CMD ["node", "dist/index.js"]

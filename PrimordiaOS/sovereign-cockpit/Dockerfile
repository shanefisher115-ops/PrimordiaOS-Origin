# Multi-stage Dockerfile for PrimordiaOS Sovereign Cockpit
# Stage 1: Build & Compilation
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json ./

# Install all dependencies including devDependencies for TypeScript compilation
RUN npm install

# Copy TypeScript source and configurations
COPY tsconfig.json ./
COPY src/ ./src/

# Compile TypeScript to dist/
RUN npm run build

# Prune devDependencies to keep container lean
RUN npm prune --production

# Stage 2: Minimal Production Runner
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

# Cloud Run / Subsystem Environment Variables with defaults
ENV PRIMORDIAOS_KEY=""
ENV UNREAL_BRIDGE_URL="ws://127.0.0.1:3000/ws/unreal"
ENV VISIONCORE_URL="http://127.0.0.1:5055/vision"
ENV MONEYPLUGHUB_URL="http://127.0.0.1:3001/telemetry"

# Create non-root user and assign permissions
RUN addgroup -S primordia && adduser -S sovereign -G primordia

# Copy compiled artifacts and production dependencies from builder stage
COPY --from=builder --chown=sovereign:primordia /app/node_modules ./node_modules
COPY --from=builder --chown=sovereign:primordia /app/dist ./dist
COPY --from=builder --chown=sovereign:primordia /app/package.json ./package.json

# Switch to non-root user
USER sovereign

# Expose container port for Cloud Run
EXPOSE 8080

# Health check probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-8080}/healthz || exit 1

# Start the Sovereign Cockpit daemon
CMD ["node", "dist/index.js"]

# ==============================================================================
# PrimordiaOS Sovereign Kernel Subsystem - Cloud Run Container
# ==============================================================================

# Stage 1: Build Substrate
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests
COPY package.json tsconfig.json ./

# Install dependencies for TypeScript compilation
RUN npm install

# Copy source code
COPY src ./src

# Compile TypeScript
RUN npm run build

# Stage 2: Lean Sovereign Runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Create unprivileged sovereign user
RUN addgroup -g 1001 -S primordia && \
    adduser -u 1001 -S primordia -G primordia

# Copy built artifacts and minimal package manifest
COPY --from=builder --chown=primordia:primordia /app/dist ./dist
COPY --from=builder --chown=primordia:primordia /app/package.json ./package.json

USER primordia

EXPOSE 8080

# Cloud Run Container Health Check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/healthz || exit 1

CMD ["node", "dist/index.js"]

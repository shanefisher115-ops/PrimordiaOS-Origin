# ---- Stage 1: Build ----
FROM node:20-slim AS builder

WORKDIR /app

# Copy package manifests
COPY package.json tsconfig.json ./

# Install dependencies (including typescript)
RUN npm install

# Copy source tree
COPY src/ ./src/

# Compile TypeScript to dist/
RUN npm run build

# ---- Stage 2: Production Runtime ----
FROM node:20-slim AS runner

WORKDIR /app

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

# Create non-root system user
RUN groupadd -r primordia && useradd -r -g primordia primordia

# Copy built distribution and package.json
COPY --from=builder /app/package.json ./
COPY --from=builder /app/dist/ ./dist/

# Set ownership
RUN chown -R primordia:primordia /app

USER primordia

# Expose default Cloud Run port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 8080) + '/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Start daemon server
CMD ["node", "dist/index.js"]

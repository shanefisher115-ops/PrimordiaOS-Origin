# ---- Stage 1: Builder ----
FROM node:20-slim AS builder
WORKDIR /app

COPY package.json package-lock.json* yarn.lock* ./
RUN npm install

# Copy ONLY the parts of PrimordiaOS that actually compile
COPY services ./services
COPY kernel/runtime ./kernel/runtime
COPY tsconfig.json ./

RUN npx tsc -p tsconfig.json --skipLibCheck --noEmit false

# ---- Stage 2: Runtime ----
FROM node:20-slim
WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000
CMD ["node", "dist/services/http/server.js"]

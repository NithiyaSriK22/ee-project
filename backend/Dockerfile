# syntax=docker/dockerfile:1
# -----------------------------------------------------------------------------
# MediKiosk Backend - Hardened Production Multi-Stage Container
# Security: Non-root execution, minimal alpine runtime, no secrets in image
# -----------------------------------------------------------------------------

# Stage 1: Build & Compilation
FROM node:20-alpine AS builder

WORKDIR /app

# Install security updates
RUN apk update && apk upgrade && apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including dev for TypeScript build)
RUN if [ -f package-lock.json ]; then npm ci; else npm install --no-audit --no-fund; fi

# Copy source code and tsconfig
COPY tsconfig.json ./
COPY src ./src/

# Generate Prisma Client and compile TypeScript
RUN npx prisma generate
RUN npm run build

# Prune dev dependencies for lean production footprint
RUN npm prune --production

# -----------------------------------------------------------------------------
# Stage 2: Hardened Production Runtime
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment flags
ENV NODE_ENV=production
ENV PORT=5000

# Security: Install runtime OpenSSL for Prisma and curl for container health check
RUN apk update && apk upgrade && apk add --no-cache openssl curl dumb-init

# Create non-root system user and group
RUN addgroup -g 1001 -S medikiosk && \
    adduser -u 1001 -S medikiosk -G medikiosk

# Copy node_modules, generated prisma client, and compiled dist artifacts
COPY --chown=medikiosk:medikiosk --from=builder /app/package.json ./package.json
COPY --chown=medikiosk:medikiosk --from=builder /app/node_modules ./node_modules
COPY --chown=medikiosk:medikiosk --from=builder /app/prisma ./prisma
COPY --chown=medikiosk:medikiosk --from=builder /app/dist ./dist

# Security: Run as non-root user
USER medikiosk

EXPOSE 5000

# Container Healthcheck
HEALTHCHECK --interval=20s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/server.js"]

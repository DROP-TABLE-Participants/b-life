# syntax=docker/dockerfile:1

# Multi-stage build for Next.js
# - Uses Node 20 on Alpine for small image size
# - Caches dependencies
# - Runs production server with `next start`

FROM node:20-alpine AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# Install system deps once (used by multiple stages)
FROM base AS alpine-deps
RUN apk add --no-cache libc6-compat openssl

# Install all deps (including dev) for building
FROM alpine-deps AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# Build the app
FROM alpine-deps AS builder
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build Next.js app
RUN npm run build

# Production runtime image: prod deps + built artifacts
FROM alpine-deps AS runner
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app

# Install dev dependencies only 
COPY package.json package-lock.json* ./
RUN npm ci --omit=optional --omit=prod

# Copy standalone server, static files, and public assets
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Expose the port and start the standalone server
EXPOSE 3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
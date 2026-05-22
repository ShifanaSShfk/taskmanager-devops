# ── Stage 1: Builder ─────────────────────────────────────────────
# We use a multi-stage build.
# Stage 1 installs ALL dependencies (including devDependencies for tests).
# Stage 2 copies only the production result — keeping the final image small.

FROM node:18-alpine AS builder

# node:18-alpine means:
#   node:18   = Node.js version 18 (LTS, stable)
#   alpine    = based on Alpine Linux (~5 MB) instead of Ubuntu (~80 MB)
#               Alpine is tiny, secure, and perfect for containers
# AS builder = we name this stage "builder" so Stage 2 can reference it

# Set the working directory inside the container.
# All subsequent commands run from here.
# /app is the convention — you could use /usr/src/app too.
WORKDIR /app

# Copy ONLY the dependency manifest files first.
# package.json  = lists all dependencies
# package-lock.json = exact locked versions (the * glob handles both)
# WHY FIRST? Because the next RUN step (npm ci) is slow (~30 seconds).
# Docker caches it as long as these files don't change.
# If you copied src/ first, any code change would bust this cache.
COPY package*.json ./

# Install ALL dependencies (including dev like jest, nodemon).
# npm ci = "clean install" — faster and more reliable than npm install
#          in CI/CD because it strictly uses package-lock.json
RUN npm ci

# Now copy the rest of the application source code.
# This layer rebuilds on every code change — but that's fast (no npm install).
COPY . .

# Run the test suite as part of the build.
# If tests fail, the Docker build fails — nothing broken gets deployed.
RUN npm test


# ── Stage 2: Production image ────────────────────────────────────
# This is the FINAL image that actually runs in production.
# We start fresh from node:18-alpine — no test tools, no devDependencies.

FROM node:18-alpine AS production

# Security best practice: never run as root inside a container.
# If an attacker exploits your app, they get this limited user, not root.
# node:alpine already has a built-in 'node' user (uid 1000).
RUN addgroup -g 1001 -S appgroup && \
    adduser  -u 1001 -S appuser -G appgroup

WORKDIR /app

# Copy only the package manifests from builder stage
COPY --from=builder /app/package*.json ./

# Install ONLY production dependencies (no jest, nodemon, eslint, etc.)
# --only=production cuts image size significantly
RUN npm ci --only=production

# Copy the application source from the builder stage
COPY --from=builder /app/src ./src

# Change ownership of all files to our non-root user
RUN chown -R appuser:appgroup /app

# Switch to the non-root user
USER appuser

# Document which port the app listens on.
# EXPOSE does NOT actually publish the port — it's documentation.
# You publish with -p 3000:3000 in docker run, or in docker-compose.
EXPOSE 3000

# Health check — Docker will call this every 30 seconds.
# If it fails 3 times, Docker marks the container as unhealthy.
# Kubernetes uses this too (Phase 5).
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

# The command that runs when the container starts.
# Use array form (exec form) — NOT shell form ("node src/index.js").
# Exec form means Node.js is PID 1 and receives OS signals directly.
# This makes graceful shutdown work properly.
CMD ["node", "src/index.js"]
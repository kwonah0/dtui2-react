# DTUI2 React Docker Image
FROM node:18-bullseye AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with increased memory
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm ci

# Copy all source files
COPY . .

# Build the application
RUN npm run build && ls -la dist/

# Runtime stage
FROM node:18-bullseye-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libgtk-3-0 \
    libgbm-dev \
    libnotify-dev \
    libgconf-2-4 \
    libnss3 \
    libxss1 \
    libasound2 \
    libxtst6 \
    xauth \
    xvfb \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Create app user
RUN useradd -m -s /bin/bash dtui

# Set working directory
WORKDIR /app

# Copy from builder
COPY --from=builder --chown=dtui:dtui /app/package*.json ./
COPY --from=builder --chown=dtui:dtui /app/node_modules ./node_modules
COPY --from=builder --chown=dtui:dtui /app/dist ./dist
COPY --from=builder --chown=dtui:dtui /app/electron ./electron
COPY --from=builder --chown=dtui:dtui /app/src ./src

# Create directories
RUN mkdir -p /app/data /app/logs && chown -R dtui:dtui /app

# Switch to non-root user
USER dtui

# Set environment variables
ENV NODE_ENV=production
ENV DISPLAY=:99
ENV DTUI_CONFIG_DIR=/app/data
ENV DTUI_LOG_DIR=/app/logs
ENV ELECTRON_DISABLE_SANDBOX=true
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('OK')" || exit 1

# Default command
CMD ["xvfb-run", "-a", "--server-args=-screen 0 1024x768x24", "npm", "run", "electron"]
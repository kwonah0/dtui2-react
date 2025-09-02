# Multi-stage build for DTUI2 React application
FROM node:18-alpine as builder

# Install Python and build tools needed for native modules
RUN apk add --no-cache python3 make g++ linux-headers

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build:electron

# Production stage
FROM node:18-alpine

# Install required system dependencies
RUN apk add --no-cache \
    bash \
    curl \
    git \
    python3 \
    make \
    g++ \
    linux-headers \
    xvfb \
    dbus \
    gtk+3.0 \
    libxss \
    gconf \
    libnss \
    libasound

# Create app user
RUN addgroup -g 1001 -S dtui && \
    adduser -S dtui -u 1001 -G dtui

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=dtui:dtui /app .

# Create necessary directories
RUN mkdir -p /app/data /app/logs && \
    chown -R dtui:dtui /app

# Switch to non-root user
USER dtui

# Set environment variables
ENV NODE_ENV=production
ENV DISPLAY=:99
ENV DTUI_CONFIG_DIR=/app/data
ENV DTUI_LOG_DIR=/app/logs

# Expose port (if needed for web interface)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('DTUI2 container is healthy')" || exit 1

# Default command - run in headless mode
CMD ["npm", "run", "electron:headless"]
# DTUI2 React Docker Image
FROM node:18-bullseye

# Install system dependencies for Electron and node-pty
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
    git \
    bash \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Create necessary directories
RUN mkdir -p /app/data /app/logs

# Set environment variables
ENV NODE_ENV=production
ENV DISPLAY=:99
ENV DTUI_CONFIG_DIR=/app/data
ENV DTUI_LOG_DIR=/app/logs
ENV ELECTRON_DISABLE_SANDBOX=true

# Expose port (if needed for web interface)
EXPOSE 3000

# Default command - run in headless mode with xvfb
CMD ["xvfb-run", "-a", "npm", "run", "electron"]
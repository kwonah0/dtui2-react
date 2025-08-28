#!/bin/bash

# Setup script for WSL development environment
echo "🔧 Setting up DTUI2 development environment for WSL..."

# Check if running in WSL
if [[ -f /proc/version ]] && grep -q Microsoft /proc/version; then
    echo "✅ Running in WSL environment"
else
    echo "⚠️ This script is designed for WSL. You may need to adjust commands for your system."
fi

# Install GUI dependencies for Electron (requires sudo)
echo "Installing GUI dependencies..."
sudo apt-get update
sudo apt-get install -y \
  libnspr4 \
  libnss3 \
  libatk-bridge2.0-0 \
  libdrm2 \
  libgtk-3-0 \
  libgbm1 \
  libxss1 \
  libasound2 \
  libxtst6 \
  xauth \
  xvfb \
  build-essential \
  python3 \
  python3-pip

# Create scripts directory if not exists
mkdir -p scripts

# Create helper scripts
echo "Creating helper scripts..."

# Port management script
cat > scripts/kill-port.sh << 'EOF'
#!/bin/bash
PORT=${1:-3000}
echo "🔍 Finding processes on port $PORT..."
PIDS=$(lsof -ti:$PORT 2>/dev/null)
if [ ! -z "$PIDS" ]; then
    echo "💀 Killing processes: $PIDS"
    kill -9 $PIDS
    echo "✅ Port $PORT is now free"
else
    echo "ℹ️ No processes found on port $PORT"
fi
EOF

# Dev server management script
cat > scripts/dev-server.sh << 'EOF'
#!/bin/bash
echo "🛑 Cleaning up existing processes..."
./scripts/kill-port.sh 3000
sleep 1
echo "🚀 Starting development server..."
npm run dev
EOF

# Status check script
cat > scripts/check-status.sh << 'EOF'
#!/bin/bash
echo "📊 DTUI2 Development Status"
echo "=========================="
echo ""
echo "🔍 Port 3000 Status:"
lsof -i:3000 2>/dev/null || echo "   Port 3000 is free"
echo ""
echo "🔍 Node Processes:"
ps aux | grep node | grep -v grep || echo "   No Node processes running"
echo ""
echo "🔍 System Info:"
echo "   Node: $(node --version 2>/dev/null || echo 'Not installed')"
echo "   npm: $(npm --version 2>/dev/null || echo 'Not installed')"
echo "   WSL: $(uname -r)"
echo ""
EOF

# Make scripts executable
chmod +x scripts/*.sh

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install

# Create docs directory if not exists
mkdir -p docs

echo "✅ Setup complete!"
echo ""
echo "📚 Available Documentation:"
echo "  docs/DEVELOPMENT.md       - 개발 가이드"
echo "  docs/TROUBLESHOOTING.md   - 문제 해결"
echo "  docs/PROCESS_MANAGEMENT.md - 프로세스 관리"
echo ""
echo "🔧 Available Scripts:"
echo "  npm run dev              - Start Vite dev server (browser testing)"
echo "  npm run build            - Build for production"
echo "  npm run electron:dev     - Start Electron app (if GUI works)"
echo "  npm run test:browser     - Open browser for testing"
echo "  scripts/dev-server.sh    - Clean start dev server"
echo "  scripts/kill-port.sh 3000 - Kill processes on port"
echo "  scripts/check-status.sh  - Check system status"
echo ""
echo "🌐 For browser testing, navigate to: http://localhost:3000"
echo "🖥️ For Windows Electron testing, use Windows Terminal in the project folder"
echo ""
echo "💡 Quick Start:"
echo "  ./scripts/dev-server.sh   # Clean start development"
echo "  ./scripts/check-status.sh # Check system status"
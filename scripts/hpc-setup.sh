#!/bin/bash

# HPC Environment Setup Script for DTUI2
# Handles RedHat 8, NFS, and shared memory limitations

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[HPC-SETUP]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Check if running in HPC environment
check_hpc_environment() {
    log "Checking HPC environment..."
    
    # Check for RedHat/CentOS
    if [ -f /etc/redhat-release ]; then
        local version=$(cat /etc/redhat-release)
        log "Detected: $version"
    fi
    
    # Check for NFS mounts
    if mount | grep -q nfs; then
        warn "NFS mounts detected - some permissions may be restricted"
        mount | grep nfs | while read line; do
            log "NFS: $line"
        done
    fi
    
    # Check SELinux status
    if command -v getenforce >/dev/null 2>&1; then
        local selinux_status=$(getenforce 2>/dev/null || echo "Unknown")
        log "SELinux status: $selinux_status"
        if [ "$selinux_status" = "Enforcing" ]; then
            warn "SELinux is enforcing - may restrict Electron execution"
        fi
    fi
    
    # Check shared memory availability
    if [ -w /dev/shm ]; then
        local shm_size=$(df -h /dev/shm 2>/dev/null | tail -1 | awk '{print $2}' || echo "Unknown")
        log "Shared memory available: $shm_size"
    else
        warn "Shared memory (/dev/shm) not writable - Chromium may have issues"
    fi
}

# Create HPC-compatible configuration
create_hpc_config() {
    log "Creating HPC-compatible configuration..."
    
    local config_file="$PROJECT_ROOT/dtui-hpc.json"
    
    cat > "$config_file" << 'EOF'
{
  "ai": {
    "provider": "shell",
    "shell": {
      "command": "bash",
      "args": ["-c", "echo '[HPC-SHELL]:'; cat"],
      "template": "{command} {args} <<< \"{prompt}\"",
      "timeout": 10000,
      "streaming": false,
      "outputFormat": {
        "useCodeBlock": true,
        "codeBlockSyntax": "shell"
      }
    }
  },
  "terminal": {
    "shell": "/bin/bash",
    "columns": 80,
    "lines": 24
  },
  "ui": {
    "theme": "dark",
    "fontSize": 14
  },
  "hpc": {
    "disableGpu": true,
    "disableShm": true,
    "disableDevShmUsage": true,
    "noSandbox": true,
    "disableSetuidSandbox": true,
    "singleProcess": false,
    "disableFeatures": "VizDisplayCompositor,WebRtc,WebBluetooth"
  }
}
EOF
    
    success "HPC configuration created: $config_file"
    log "To use: export DTUI_USER_CONFIGFILE='$config_file'"
}

# Create HPC launcher script
create_hpc_launcher() {
    log "Creating HPC launcher script..."
    
    local launcher_script="$PROJECT_ROOT/dtui2-hpc.sh"
    
    cat > "$launcher_script" << 'EOF'
#!/bin/bash

# DTUI2 HPC Launcher
# Launches DTUI2 with HPC-compatible settings

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# HPC Environment Variables
export DTUI_USER_CONFIGFILE="$SCRIPT_DIR/dtui-hpc.json"

# Chromium flags for HPC compatibility
export ELECTRON_ARGS="
--no-sandbox
--disable-setuid-sandbox
--disable-gpu
--disable-dev-shm-usage
--disable-software-rasterizer
--disable-background-timer-throttling
--disable-backgrounding-occluded-windows
--disable-renderer-backgrounding
--disable-features=VizDisplayCompositor,TranslateUI,WebRtc,WebBluetooth
--single-process=false
--memory-pressure-off
"

# Set Electron flags
export ELECTRON_ENABLE_LOGGING=1
export ELECTRON_LOG_FILE="$SCRIPT_DIR/dtui2-hpc.log"

# Disable hardware acceleration if in HPC environment
if [ -n "$PBS_JOBID" ] || [ -n "$SLURM_JOB_ID" ] || [ -n "$LSB_JOBID" ]; then
    echo "HPC job environment detected, using software rendering"
    export LIBGL_ALWAYS_SOFTWARE=1
fi

# Create temp directory for Electron if needed
export TMPDIR="${TMPDIR:-/tmp}"
mkdir -p "$TMPDIR/dtui2-$$"
export ELECTRON_USER_DATA_DIR="$TMPDIR/dtui2-$$/userdata"

echo "Starting DTUI2 with HPC-compatible settings..."
echo "Config file: $DTUI_USER_CONFIGFILE"
echo "Log file: $ELECTRON_LOG_FILE"
echo "User data: $ELECTRON_USER_DATA_DIR"

# Launch DTUI2
if [ -f "$SCRIPT_DIR/DTUI2.AppImage" ]; then
    # AppImage version
    exec "$SCRIPT_DIR/DTUI2.AppImage" $ELECTRON_ARGS
elif [ -f "$SCRIPT_DIR/electron/main.js" ]; then
    # Development version
    cd "$SCRIPT_DIR"
    exec npx electron . $ELECTRON_ARGS
else
    echo "Error: DTUI2 executable not found"
    exit 1
fi
EOF
    
    chmod +x "$launcher_script"
    success "HPC launcher created: $launcher_script"
}

# Update main.js for HPC compatibility
update_main_for_hpc() {
    log "Updating main.js for HPC compatibility..."
    
    local main_file="$PROJECT_ROOT/electron/main.js"
    if [ ! -f "$main_file" ]; then
        error "main.js not found: $main_file"
        return 1
    fi
    
    # Create backup
    cp "$main_file" "$main_file.backup"
    
    # Check if HPC flags are already present
    if grep -q "HPC compatibility flags" "$main_file"; then
        log "HPC flags already present in main.js"
        return 0
    fi
    
    # Add HPC compatibility flags before app.whenReady()
    local temp_file=$(mktemp)
    
    awk '
    /app\.whenReady\(\)/ {
        print "// HPC compatibility flags"
        print "if (config.get(\"hpc:disableGpu\")) {"
        print "  app.disableHardwareAcceleration();"
        print "}"
        print ""
        print "if (config.get(\"hpc:noSandbox\")) {"
        print "  app.commandLine.appendSwitch(\"no-sandbox\");"
        print "}"
        print ""
        print "if (config.get(\"hpc:disableDevShmUsage\")) {"
        print "  app.commandLine.appendSwitch(\"disable-dev-shm-usage\");"
        print "}"
        print ""
        print "if (config.get(\"hpc:disableFeatures\")) {"
        print "  app.commandLine.appendSwitch(\"disable-features\", config.get(\"hpc:disableFeatures\"));"
        print "}"
        print ""
    }
    { print }
    ' "$main_file" > "$temp_file"
    
    mv "$temp_file" "$main_file"
    success "main.js updated with HPC compatibility flags"
}

# Create environment test script
create_env_test_script() {
    log "Creating environment test script..."
    
    local test_script="$PROJECT_ROOT/test-hpc-env.sh"
    
    cat > "$test_script" << 'EOF'
#!/bin/bash

# Test HPC Environment Compatibility

echo "=== DTUI2 HPC Environment Test ==="
echo

# System Information
echo "System Information:"
echo "  OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2 2>/dev/null || uname -s)"
echo "  Kernel: $(uname -r)"
echo "  Architecture: $(uname -m)"
echo

# Check job schedulers
echo "Job Scheduler Environment:"
for var in PBS_JOBID SLURM_JOB_ID LSB_JOBID; do
    if [ -n "${!var}" ]; then
        echo "  $var: ${!var}"
    fi
done
echo

# Check filesystem types
echo "Filesystem Information:"
df -T . | tail -1 | awk '{print "  Current directory: " $1 " (" $2 ")"}'
mount | grep -E "(nfs|lustre|gpfs)" | head -5 | while read line; do
    echo "  $line"
done
echo

# Check permissions
echo "Permission Tests:"
echo -n "  /tmp writable: "
if [ -w /tmp ]; then echo "YES"; else echo "NO"; fi

echo -n "  /dev/shm writable: "
if [ -w /dev/shm ]; then echo "YES"; else echo "NO"; fi

echo -n "  Current directory writable: "
if [ -w . ]; then echo "YES"; else echo "NO"; fi

echo -n "  Can create temp files: "
if touch /tmp/dtui2-test.$$ 2>/dev/null; then
    echo "YES"
    rm -f /tmp/dtui2-test.$$
else
    echo "NO"
fi
echo

# Check SELinux
echo "SELinux Status:"
if command -v getenforce >/dev/null 2>&1; then
    echo "  Status: $(getenforce 2>/dev/null || echo 'Unknown')"
    if command -v getsebool >/dev/null 2>&1; then
        for bool in allow_execstack allow_execmem; do
            status=$(getsebool $bool 2>/dev/null | cut -d' ' -f3 || echo "unknown")
            echo "  $bool: $status"
        done
    fi
else
    echo "  SELinux not detected"
fi
echo

# Check graphics
echo "Graphics Information:"
echo -n "  DISPLAY: "
if [ -n "$DISPLAY" ]; then echo "$DISPLAY"; else echo "Not set"; fi

echo -n "  X11 available: "
if xdpyinfo >/dev/null 2>&1; then echo "YES"; else echo "NO"; fi

echo -n "  Hardware acceleration: "
if [ "$LIBGL_ALWAYS_SOFTWARE" = "1" ]; then
    echo "Disabled (software rendering)"
else
    echo "Enabled"
fi
echo

# Memory information
echo "Memory Information:"
free -h | head -2
echo

echo "=== Test Complete ==="
EOF
    
    chmod +x "$test_script"
    success "Environment test script created: $test_script"
}

# Main execution
main() {
    log "DTUI2 HPC Environment Setup"
    log "=========================="
    
    check_hpc_environment
    echo
    
    create_hpc_config
    echo
    
    create_hpc_launcher  
    echo
    
    update_main_for_hpc
    echo
    
    create_env_test_script
    echo
    
    log "HPC setup complete!"
    log ""
    log "Next steps:"
    log "1. Run: ./test-hpc-env.sh (to test environment)"
    log "2. Build: npm run dist:linux (to create AppImage)"
    log "3. Launch: ./dtui2-hpc.sh (to run with HPC settings)"
    log "4. Or set: export DTUI_USER_CONFIGFILE='$PROJECT_ROOT/dtui-hpc.json'"
}

# Run main function
main "$@"
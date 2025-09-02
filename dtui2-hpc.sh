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

#!/bin/bash

# DTUI2 Singularity Runner Script
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SIF_FILE="$PROJECT_DIR/dtui2.sif"

# Default values
MODE="headless"
BIND_DIRS=""
CONFIG_DIR=""
LOG_DIR=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -m|--mode)
            MODE="$2"
            shift 2
            ;;
        -c|--config-dir)
            CONFIG_DIR="$2"
            shift 2
            ;;
        -l|--log-dir)
            LOG_DIR="$2"
            shift 2
            ;;
        -b|--bind)
            if [ -z "$BIND_DIRS" ]; then
                BIND_DIRS="--bind $2"
            else
                BIND_DIRS="$BIND_DIRS --bind $2"
            fi
            shift 2
            ;;
        -h|--help)
            echo "DTUI2 Singularity Runner"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -m, --mode MODE        Run mode: headless, gui, shell (default: headless)"
            echo "  -c, --config-dir DIR   Bind configuration directory"
            echo "  -l, --log-dir DIR      Bind log directory"
            echo "  -b, --bind PATH        Additional bind mount (can be used multiple times)"
            echo "  -h, --help             Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 --mode headless"
            echo "  $0 --mode gui --bind /tmp/.X11-unix:/tmp/.X11-unix"
            echo "  $0 --mode shell --config-dir ./config --log-dir ./logs"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Check if SIF file exists
if [ ! -f "$SIF_FILE" ]; then
    echo "❌ Singularity image not found: $SIF_FILE"
    echo "Please build the image first:"
    echo "  cd $PROJECT_DIR"
    echo "  ./scripts/build-containers.sh"
    exit 1
fi

# Set up bind mounts
if [ -n "$CONFIG_DIR" ]; then
    mkdir -p "$CONFIG_DIR"
    BIND_DIRS="$BIND_DIRS --bind $CONFIG_DIR:/app/data"
fi

if [ -n "$LOG_DIR" ]; then
    mkdir -p "$LOG_DIR"
    BIND_DIRS="$BIND_DIRS --bind $LOG_DIR:/app/logs"
fi

# For GUI mode, bind X11
if [ "$MODE" = "gui" ]; then
    if [ -z "$(echo $BIND_DIRS | grep X11)" ]; then
        BIND_DIRS="$BIND_DIRS --bind /tmp/.X11-unix:/tmp/.X11-unix"
    fi
    export DISPLAY="${DISPLAY:-:0}"
fi

# Build command
CMD="singularity run"

# Add bind mounts
if [ -n "$BIND_DIRS" ]; then
    CMD="$CMD $BIND_DIRS"
fi

# Add SIF file and mode
CMD="$CMD $SIF_FILE $MODE"

echo "🚀 Running DTUI2 with Singularity..."
echo "Mode: $MODE"
echo "Command: $CMD"
echo ""

# Execute
eval $CMD
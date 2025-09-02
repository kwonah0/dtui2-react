#!/bin/bash

# DTUI2 Container Build Script
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
IMAGE_NAME="dtui2-react"
TAG="${1:-latest}"

echo "🔧 Building DTUI2 containers..."
echo "Project directory: $PROJECT_DIR"
echo "Image name: $IMAGE_NAME"
echo "Tag: $TAG"

cd "$PROJECT_DIR"

# Build Docker image
echo "📦 Building Docker image..."
docker build -t "$IMAGE_NAME:$TAG" .

# Check if Singularity is available
if command -v singularity &> /dev/null; then
    echo "🎯 Building Singularity image..."
    
    # Build from definition file
    singularity build --force dtui2.sif dtui2.def
    
    echo "✅ Singularity image built: dtui2.sif"
else
    echo "⚠️ Singularity not found. Skipping Singularity build."
    echo "To build Singularity image later, run:"
    echo "  singularity build dtui2.sif dtui2.def"
fi

echo "✅ Container build completed!"
echo ""
echo "Usage:"
echo "  Docker:      docker run -it $IMAGE_NAME:$TAG"
echo "  Singularity: singularity run dtui2.sif"
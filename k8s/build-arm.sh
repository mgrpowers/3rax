#!/bin/bash
# Build Docker image for ARM64 (Raspberry Pi)

set -e

echo "================================"
echo "Building 3rax Backend for ARM64"
echo "================================"
echo ""

# Configuration
IMAGE_NAME="3rax-backend"
IMAGE_TAG="${1:-latest}"
FULL_IMAGE="${IMAGE_NAME}:${IMAGE_TAG}"

# Check if running on ARM or need to cross-compile
ARCH=$(uname -m)
echo "Current architecture: $ARCH"

if [[ "$ARCH" == "arm64" || "$ARCH" == "aarch64" ]]; then
    echo "Building natively on ARM..."
    docker build -f docker/Dockerfile.backend -t "${FULL_IMAGE}" .
else
    echo "Cross-compiling for ARM64..."
    
    # Check if buildx is available
    if ! docker buildx version &> /dev/null; then
        echo "Error: docker buildx is required for cross-compilation"
        echo "Install with: docker buildx create --use"
        exit 1
    fi
    
    # Build for ARM64
    docker buildx build \
        --platform linux/arm64 \
        -f docker/Dockerfile.backend \
        -t "${FULL_IMAGE}" \
        --load \
        .
fi

echo ""
echo "✅ Build complete: ${FULL_IMAGE}"
echo ""
echo "To save and transfer to Raspberry Pi:"
echo "  docker save ${FULL_IMAGE} | gzip > 3rax-backend-arm64.tar.gz"
echo "  scp 3rax-backend-arm64.tar.gz pi@raspberry-pi:~/"
echo "  ssh pi@raspberry-pi 'gunzip -c 3rax-backend-arm64.tar.gz | sudo k3s ctr images import -'"
echo ""

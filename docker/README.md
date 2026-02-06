# Docker Build Guide for 3rax Backend

## Overview

The backend Docker image is optimized for ARM64 (Raspberry Pi) and includes all necessary dependencies for:
- Node.js application
- TypeScript compilation
- Prisma ORM
- Canvas (for QR code generation)
- CUPS (for printing)
- NATS client

## Dockerfile Architecture

The Dockerfile uses a **multi-stage build** to keep the final image small:

### Stage 1: Builder
- Full build dependencies (Python, make, g++, cairo, etc.)
- Installs all npm packages
- Generates Prisma client
- Compiles TypeScript to JavaScript

### Stage 2: Production
- Minimal runtime dependencies
- Only production npm packages
- Compiled JavaScript from stage 1
- ~300MB final image size

## Native Dependencies

The `canvas` package requires native libraries for image manipulation:

**Build Time:**
- python3
- make
- g++
- cairo-dev
- jpeg-dev
- pango-dev
- giflib-dev
- pixman-dev

**Runtime:**
- cairo
- jpeg
- pango
- giflib
- pixman

## Building for ARM64

### Option 1: Build on Raspberry Pi (Native)

```bash
# On Raspberry Pi
cd /path/to/3rax
docker build -f docker/Dockerfile.backend -t 3rax-backend:latest .
```

### Option 2: Cross-Compile from x86/x64 (Mac/PC)

```bash
# On your development machine
cd /path/to/3rax

# Use the build script
./k8s/build-arm.sh latest

# Or manually with buildx:
docker buildx create --name arm-builder --use
docker buildx build \
  --platform linux/arm64 \
  -f docker/Dockerfile.backend \
  -t 3rax-backend:latest \
  --load \
  .
```

## Transfer Image to Raspberry Pi

### Method 1: Save and Load

```bash
# Save image to file
docker save 3rax-backend:latest | gzip > 3rax-backend-arm64.tar.gz

# Transfer to Pi
scp 3rax-backend-arm64.tar.gz pi@<pi-ip>:~/

# Load into K3s on Pi
ssh pi@<pi-ip>
gunzip -c 3rax-backend-arm64.tar.gz | sudo k3s ctr images import -
```

### Method 2: Docker Registry

```bash
# Tag for registry
docker tag 3rax-backend:latest your-registry.com/3rax-backend:latest

# Push
docker push your-registry.com/3rax-backend:latest

# On Pi, update deployment.yaml with registry URL
```

## Troubleshooting

### canvas Build Fails

**Error:**
```
gyp ERR! find Python
prebuild-install warn install No prebuilt binaries found
```

**Solution:** The Dockerfile now includes all necessary build dependencies. Make sure you're using the updated Dockerfile.

### Out of Memory During Build

**Error:**
```
npm error errno 137
```

**Solution:** Increase Docker memory limit or build on a machine with more RAM.

### Image Too Large

Check what's taking up space:
```bash
docker history 3rax-backend:latest
```

Our build uses multi-stage to minimize size:
- Builder stage: ~1GB (discarded)
- Final image: ~300MB

### Build Takes Forever

Cross-compilation is slower than native builds. Options:
1. Build on Raspberry Pi directly (slower CPU, but native)
2. Use a faster build machine with buildx
3. Cache layers: Docker will reuse unchanged layers

## Environment Variables

The image expects these environment variables at runtime:

```bash
DATABASE_URL="postgresql://user:pass@host:5432/db"
PORT=3001
NODE_ENV=production
NATS_URL="nats://192.168.50.118:4222"
NATS_SUBJECT="scanner.scans"
```

These are provided by Kubernetes ConfigMap and Secret in the k8s deployment.

## Testing the Image

### Test Locally (x86/x64)

Build for your architecture:
```bash
cd /path/to/3rax
docker build -f docker/Dockerfile.backend -t 3rax-backend:test .

# Run with environment variables
docker run -p 3001:3001 \
  -e DATABASE_URL="postgresql://..." \
  -e NATS_URL="nats://192.168.50.118:4222" \
  3rax-backend:test
```

### Test on Raspberry Pi

```bash
# After importing image
sudo k3s ctr run --rm -t \
  --env DATABASE_URL="postgresql://..." \
  --env NATS_URL="nats://192.168.50.118:4222" \
  docker.io/library/3rax-backend:latest test-backend
```

## Image Scanning

Scan for vulnerabilities:

```bash
# Using docker scout (if available)
docker scout cves 3rax-backend:latest

# Using trivy
trivy image 3rax-backend:latest
```

## Optimization Tips

1. **Layer Caching:** Order Dockerfile commands from least to most frequently changed
2. **Multi-stage:** Keep build tools in builder stage only
3. **Alpine Base:** Smaller than debian-based images
4. **Virtual Packages:** Use `apk add --virtual` to easily remove build deps

## Updating Dependencies

When updating npm packages:

```bash
# Update package.json
cd backend
npm update

# Rebuild image
cd ..
./k8s/build-arm.sh latest

# Test locally first
# Then transfer to Pi
```

## Kubernetes Integration

The image is designed to work with the k8s manifests in `/k8s`:

- `deployment.yaml` - Runs the image
- `configmap.yaml` - Non-sensitive config
- `secret.yaml` - Database credentials
- `service.yaml` - Exposes the container

See `k8s/README.md` for deployment instructions.

## Build Arguments

The Dockerfile doesn't currently use build args, but you could add them:

```dockerfile
ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-alpine AS builder
```

Then build with:
```bash
docker build --build-arg NODE_VERSION=18 -f docker/Dockerfile.backend -t 3rax-backend:node18 .
```

## Health Check

The image includes a built-in health check:

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
```

This checks `/health` endpoint every 30 seconds.

## Further Reading

- [Docker Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)
- [Docker Buildx](https://docs.docker.com/buildx/working-with-buildx/)
- [Alpine Linux Packages](https://pkgs.alpinelinux.org/packages)
- [node-canvas Documentation](https://github.com/Automattic/node-canvas)

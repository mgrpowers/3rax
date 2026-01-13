#!/bin/bash

# Local Development Setup Script

set -e

echo "Setting up local development environment..."

# Find docker command (check common locations)
if command -v docker > /dev/null 2>&1; then
    DOCKER_CMD="docker"
elif [ -x /usr/bin/docker ]; then
    DOCKER_CMD="/usr/bin/docker"
else
    echo "⚠️  Docker not found. Please install Docker."
    exit 1
fi

# Check if Docker is running
# Try without sudo first, then with sudo (for Raspberry Pi)
if ! $DOCKER_CMD ps > /dev/null 2>&1; then
    if sudo $DOCKER_CMD ps > /dev/null 2>&1; then
        echo "⚠️  Docker requires sudo. Adding user to docker group is recommended:"
        echo "   sudo usermod -aG docker $USER"
        echo "   (Then log out and back in)"
        echo ""
        echo "Continuing with sudo..."
        DOCKER_CMD="sudo $DOCKER_CMD"
    else
        echo "⚠️  Docker is not running. Please start Docker:"
        echo "   sudo systemctl start docker  (systemd)"
        echo "   OR start Docker Desktop"
        exit 1
    fi
fi

# Start PostgreSQL container
echo "Starting PostgreSQL container..."
$DOCKER_CMD run --name inventory-postgres \
    -e POSTGRES_USER=inventory \
    -e POSTGRES_PASSWORD=inventory \
    -e POSTGRES_DB=inventory \
    -p 5432:5432 \
    -d postgres:16-alpine 2>/dev/null || $DOCKER_CMD start inventory-postgres

echo "Waiting for PostgreSQL to be ready..."
sleep 5

# Check if PostgreSQL is ready
until $DOCKER_CMD exec inventory-postgres pg_isready -U inventory > /dev/null 2>&1; do
    echo "Waiting for PostgreSQL..."
    sleep 2
done

echo "✅ PostgreSQL is ready!"

# Create .env file if it doesn't exist
echo "Setting up environment variables..."
cd backend
if [ ! -f .env ]; then
    cat > .env << EOF
DATABASE_URL="postgresql://inventory:inventory@localhost:5432/inventory?schema=public"
PORT=3001
NODE_ENV=development
EOF
    echo "Created .env file"
fi

# Install system dependencies for canvas (needed on Raspberry Pi)
if command -v apt-get > /dev/null 2>&1; then
    echo "Installing system dependencies for canvas (Raspberry Pi)..."
    sudo apt-get update -qq
    sudo apt-get install -y \
        build-essential \
        libcairo2-dev \
        libpango1.0-dev \
        libjpeg-dev \
        libgif-dev \
        librsvg2-dev \
        2>/dev/null || echo "⚠️  Could not install system dependencies (may need manual install)"
fi

# Install backend dependencies
echo "Installing backend dependencies..."
npm install

# Rebuild canvas for ARM architecture if on Raspberry Pi
if uname -m | grep -q "arm"; then
    echo "Rebuilding canvas for ARM architecture..."
    npm rebuild canvas 2>/dev/null || echo "⚠️  Canvas rebuild failed, but continuing..."
fi

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Run migrations
echo "Running database migrations..."
npx prisma migrate dev --name init

cd ..

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
npm install

cd ..

# Setup pitft-scanner (optional - for Raspberry Pi with Mini PiTFT)
if [ -d "pitft-scanner" ]; then
    echo ""
    echo "Setting up pitft-scanner..."
    cd pitft-scanner
    
    # Install Python dependencies for Mini PiTFT display
    echo "Installing Python dependencies for Mini PiTFT..."
    if command -v pip3 > /dev/null 2>&1; then
        # Try without --break-system-packages first, then with it
        if pip3 install --user luma.lcd Pillow 2>/dev/null; then
            echo "✅ Python dependencies installed (user directory)"
        elif sudo pip3 install --break-system-packages luma.lcd Pillow 2>/dev/null; then
            echo "✅ Python dependencies installed (system-wide)"
        else
            echo "⚠️  Warning: Could not install Python dependencies"
            echo "   You may need to install manually:"
            echo "   pip3 install --user luma.lcd Pillow"
            echo "   OR: sudo pip3 install --break-system-packages luma.lcd Pillow"
        fi
    else
        echo "⚠️  Warning: pip3 not found. Python dependencies not installed."
    fi
    
    # Install Node.js dependencies
    echo "Installing Node.js dependencies for pitft-scanner..."
    npm install
    
    # Create .env file if it doesn't exist
    if [ ! -f .env ]; then
        cat > .env << EOF
API_URL=http://localhost:3001
DISPLAY_TYPE=st7789
DISPLAY_WIDTH=135
DISPLAY_HEIGHT=240
EOF
        echo "Created pitft-scanner/.env file"
        echo "⚠️  Note: Update API_URL in pitft-scanner/.env with your backend URL"
    fi
    
    cd ..
    echo "✅ pitft-scanner setup complete!"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the application:"
echo "  1. Start backend: cd backend && npm run dev"
echo "  2. Start frontend: cd frontend && npm run dev"
echo ""
if [ -d "pitft-scanner" ]; then
    echo "To start pitft-scanner (on Raspberry Pi with Mini PiTFT):"
    echo "  cd pitft-scanner && npm start"
    echo ""
fi
echo "Backend will run on http://localhost:3001"
echo "Frontend will run on http://localhost:3000"


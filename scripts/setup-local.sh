#!/bin/bash

# Local Development Setup Script

set -e

echo "Setting up local development environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "⚠️  Docker is not running. Please start Docker Desktop or Docker daemon."
    echo "   Then run this script again."
    exit 1
fi

# Start PostgreSQL container
echo "Starting PostgreSQL container..."
docker run --name inventory-postgres \
    -e POSTGRES_USER=inventory \
    -e POSTGRES_PASSWORD=inventory \
    -e POSTGRES_DB=inventory \
    -p 5432:5432 \
    -d postgres:16-alpine 2>/dev/null || docker start inventory-postgres

echo "Waiting for PostgreSQL to be ready..."
sleep 5

# Check if PostgreSQL is ready
until docker exec inventory-postgres pg_isready -U inventory > /dev/null 2>&1; do
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

# Install backend dependencies
echo "Installing backend dependencies..."
npm install

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

echo "✅ Setup complete!"
echo ""
echo "To start the application:"
echo "  1. Start backend: cd backend && npm run dev"
echo "  2. Start frontend: cd frontend && npm run dev"
echo ""
echo "Backend will run on http://localhost:3001"
echo "Frontend will run on http://localhost:3000"


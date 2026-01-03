# Local Development Guide

This guide explains how to run the inventory management system locally for development and testing.

## Prerequisites

- Node.js 20+ installed
- Docker Desktop or Docker daemon running
- npm or yarn package manager

## Quick Start

### Option 1: Automated Setup (Recommended)

Run the setup script:

```bash
./scripts/setup-local.sh
```

This will:
- Start a PostgreSQL Docker container
- Install all dependencies
- Generate Prisma client
- Run database migrations

Then start the servers:

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

### Option 2: Manual Setup

#### 1. Start PostgreSQL

```bash
docker run --name inventory-postgres \
    -e POSTGRES_USER=inventory \
    -e POSTGRES_PASSWORD=inventory \
    -e POSTGRES_DB=inventory \
    -p 5432:5432 \
    -d postgres:16-alpine
```

Or if the container already exists:

```bash
docker start inventory-postgres
```

#### 2. Install Backend Dependencies

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
```

#### 3. Install Frontend Dependencies

```bash
cd frontend
npm install
```

#### 4. Start Backend Server

```bash
cd backend
npm run dev
```

Backend will run on http://localhost:3001

#### 5. Start Frontend Server

In a new terminal:

```bash
cd frontend
npm run dev
```

Frontend will run on http://localhost:3000

## Environment Variables

Create a `.env` file in the root directory (copy from `.env.example` if it exists):

```env
DATABASE_URL="postgresql://inventory:inventory@localhost:5432/inventory?schema=public"
PORT=3001
NODE_ENV=development
VITE_API_URL=http://localhost:3001
```

## Database Management

### Run Migrations

```bash
cd backend
npx prisma migrate dev
```

### Open Prisma Studio (Database GUI)

```bash
cd backend
npx prisma studio
```

This opens a web interface at http://localhost:5555 to browse and edit your database.

### Reset Database

```bash
cd backend
npx prisma migrate reset
```

This will drop the database, recreate it, and run all migrations.

## Testing the Application

### 1. Create a Node

- Navigate to http://localhost:3000
- Go to "Nodes" page
- Create a new node (e.g., "Basement", "Garage")

### 2. Create a Bin

- Go to "Bins" page
- Create a bin and assign it to a node
- Generate or register QR codes

### 3. Create an Item

- Go to "Items" page
- Create an item with a name and description
- Optionally upload an image
- Generate or register a QR code

### 4. Test Check-In/Check-Out

- Go to "Scanner" page
- Select "Check In" or "Check Out"
- Scan QR codes (or manually enter them)
- Verify transactions are recorded

### 5. Test Search

- Go to "Search" page
- Search for items by name
- Verify location information is displayed

## Troubleshooting

### Docker Not Running

If you see "Cannot connect to Docker daemon":
- Start Docker Desktop (Mac/Windows)
- Or start Docker service: `sudo systemctl start docker` (Linux)

### Port Already in Use

If port 3001 or 5432 is already in use:

**Backend (3001):**
- Change PORT in `.env` file
- Update VITE_API_URL in frontend if needed

**PostgreSQL (5432):**
- Stop existing PostgreSQL service
- Or change port mapping: `-p 5433:5432`

### Database Connection Errors

1. Verify PostgreSQL container is running:
   ```bash
   docker ps | grep inventory-postgres
   ```

2. Check database URL in `.env` file

3. Verify PostgreSQL is ready:
   ```bash
   docker exec inventory-postgres pg_isready -U inventory
   ```

### Prisma Client Not Generated

Run:
```bash
cd backend
npx prisma generate
```

### Migration Issues

Reset and re-run migrations:
```bash
cd backend
npx prisma migrate reset
```

## Development Tips

- Use Prisma Studio to inspect and modify data directly
- Backend hot-reloads automatically with `npm run dev`
- Frontend hot-reloads automatically with `npm run dev`
- Check browser console and terminal for errors
- Use network tab in browser DevTools to debug API calls

## Stopping Services

### Stop Backend/Frontend
Press `Ctrl+C` in the terminal running the server

### Stop PostgreSQL
```bash
docker stop inventory-postgres
```

### Remove PostgreSQL Container
```bash
docker stop inventory-postgres
docker rm inventory-postgres
```


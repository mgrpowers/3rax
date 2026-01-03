# Quick Start Guide

## Prerequisites Check

1. **Docker Desktop** must be running (or Docker daemon on Linux)
2. **Node.js 20+** installed

## Step 1: Start Docker

- **macOS/Windows**: Open Docker Desktop
- **Linux**: `sudo systemctl start docker`

Verify Docker is running:
```bash
docker ps
```

## Step 2: Setup and Start

Run the setup script (this only needs to be done once):

```bash
./scripts/setup-local.sh
```

If the script fails, you can set up manually (see LOCAL_DEVELOPMENT.md).

## Step 3: Start Servers

Open two terminals:

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

## Step 4: Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Prisma Studio (database GUI): `cd backend && npx prisma studio` → http://localhost:5555

## Quick Test

1. Open http://localhost:3000
2. Go to "Nodes" → Create a node (e.g., "Basement")
3. Go to "Bins" → Create a bin
4. Go to "Items" → Create an item
5. Go to "Scanner" → Test check-in/checkout workflow

## Troubleshooting

**Docker not running?**
- Start Docker Desktop
- Then run `./scripts/setup-local.sh` again

**Port already in use?**
- Backend (3001): Change PORT in `.env`
- PostgreSQL (5432): Stop other PostgreSQL services or change port in docker command

**Database errors?**
- Make sure PostgreSQL container is running: `docker ps | grep postgres`
- Check `.env` file has correct DATABASE_URL

See LOCAL_DEVELOPMENT.md for detailed troubleshooting.


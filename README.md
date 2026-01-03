# House Inventory Management System

A centralized inventory management system with QR code tracking, designed to run on a Docker Swarm cluster of Raspberry Pis.

## Features

- **Multi-location Support**: Organize inventory across multiple nodes (basement, garage, office, etc.)
- **QR Code Tracking**: Each bin and item has QR codes for check-in/checkout operations
- **Custom QR Code Registration**: Scan existing QR codes or generate new ones
- **Label Printing**: Print QR code labels using CUPS
- **Full-Text Search**: Search items with location information (like IKEA)
- **MTG Card Support**: Identify Magic: The Gathering cards (name-based)
- **Image Uploads**: Attach images to items for easier identification
- **Scanner Workflow**: Web-based scanner for check-in/checkout operations

## Architecture

- **Backend**: Node.js/Express with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Frontend**: React with TypeScript and Tailwind CSS
- **Deployment**: Docker Swarm on Raspberry Pi cluster
- **QR Codes**: QR code generation and scanning support

## Prerequisites

- Docker and Docker Swarm installed on Raspberry Pi cluster
- PostgreSQL database (included in Docker Compose)
- CUPS installed on host (for printing - optional)
- Node.js 20+ (for local development)

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd 3rax
```

### 2. Set Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env` with your database credentials and configuration.

### 3. Initialize Docker Swarm

On your manager node:

```bash
docker swarm init
```

On worker nodes:

```bash
docker swarm join --token <token> <manager-ip>:2377
```

### 4. Build and Deploy

```bash
docker stack deploy -c docker-compose.yml inventory
```

### 5. Run Database Migrations

```bash
docker exec -it $(docker ps -q -f name=inventory_backend) npx prisma migrate deploy
```

Or run migrations manually by connecting to the backend container.

## Development Setup

### Backend

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

- `GET /api/nodes` - List all nodes
- `POST /api/nodes` - Create a node
- `GET /api/bins` - List all bins
- `POST /api/bins` - Create a bin
- `GET /api/items` - List all items
- `POST /api/items` - Create an item (with optional image)
- `POST /api/transactions/checkin` - Check item into bin
- `POST /api/transactions/checkout` - Check item out of bin
- `GET /api/search?q=<query>` - Search items
- `POST /api/mtg/identify` - Identify MTG card (requires card name)

See the plan document for complete API documentation.

## Usage

### Creating a Node

1. Navigate to Nodes page
2. Create a new node (e.g., "Basement", "Garage")

### Creating a Bin

1. Navigate to Bins page
2. Create a bin and assign it to a node
3. Optionally register custom QR codes or generate new ones
4. Print QR code labels if needed

### Registering an Item

1. Navigate to Items page
2. Click "Add Item"
3. Fill in item details (name, description, type)
4. Optionally upload an image
5. Register a custom QR code or generate one
6. Print QR code label if needed

### Check-In/Check-Out

1. Navigate to Scanner page
2. Select "Check In" or "Check Out"
3. Scan the bin's QR code (check-in or checkout QR code)
4. Scan the item's QR code
5. Transaction is recorded automatically

### Searching

1. Navigate to Search page
2. Enter search query (e.g., "HDMI cable")
3. View results with location and bin information

## CUPS Printing Setup

See `backend/docs/CUPS_SETUP.md` for detailed printing setup instructions.

## Docker Swarm Management

### View Services

```bash
docker service ls
```

### View Logs

```bash
docker service logs inventory_backend
docker service logs inventory_frontend
docker service logs inventory_postgres
```

### Scale Services

```bash
docker service scale inventory_backend=2
```

### Update Services

```bash
docker service update --image <new-image> inventory_backend
```

### Remove Stack

```bash
docker stack rm inventory
```

## Troubleshooting

### Database Connection Issues

- Verify PostgreSQL service is running: `docker service ps inventory_postgres`
- Check database credentials in `.env`
- Verify network connectivity: `docker network ls`

### Printing Issues

- Ensure CUPS is installed on the host
- Check CUPS socket permissions
- Verify printer is accessible
- See CUPS setup documentation

### Build Issues

- Ensure Docker buildx is available for ARM builds
- Check Docker daemon is running
- Verify sufficient disk space

## License

MIT

# Deployment Guide

This guide covers deploying the inventory management system on a Docker Swarm cluster of Raspberry Pis.

## Prerequisites

- Multiple Raspberry Pis (3+ recommended)
- Docker installed on each Pi
- Docker Swarm initialized
- Network connectivity between Pis

## Initial Setup

### 1. Prepare Raspberry Pis

On each Raspberry Pi:

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Docker (if not already installed)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Log out and back in for group changes to take effect
```

### 2. Initialize Docker Swarm

On the manager node:

```bash
docker swarm init --advertise-addr <MANAGER_IP>
```

Save the join token that's displayed.

On worker nodes:

```bash
docker swarm join --token <TOKEN> <MANAGER_IP>:2377
```

Verify nodes:

```bash
docker node ls
```

### 3. Build Images

You have two options:

#### Option A: Build on Manager Node

Build images on the manager and push to a registry:

```bash
# Build for ARM64
docker buildx create --use
docker buildx build --platform linux/arm64 -t your-registry/inventory-backend:latest -f docker/Dockerfile.backend --push .
docker buildx build --platform linux/arm64 -t your-registry/inventory-frontend:latest -f docker/Dockerfile.frontend --push .
```

Then update `docker-compose.yml` to use the registry images.

#### Option B: Build on Each Node

Build images directly on each node (simpler but slower):

```bash
# On manager node
docker build -f docker/Dockerfile.backend -t inventory-backend:latest .
docker build -f docker/Dockerfile.frontend -t inventory-frontend:latest .
```

### 4. Configure Environment

Create `.env` file:

```bash
POSTGRES_USER=inventory
POSTGRES_PASSWORD=<secure-password>
POSTGRES_DB=inventory
VITE_API_URL=http://<manager-ip>:3001
```

### 5. Deploy Stack

```bash
docker stack deploy -c docker-compose.yml inventory
```

### 6. Run Database Migrations

Wait for services to start:

```bash
docker service ls
```

Once backend is running:

```bash
# Get backend container ID
BACKEND_CONTAINER=$(docker ps -q -f name=inventory_backend)

# Run migrations
docker exec -it $BACKEND_CONTAINER npx prisma migrate deploy
```

Or create an init script that runs migrations on startup.

## CUPS Printing Setup (Optional)

If you want printing support:

1. Install CUPS on the host (one of the Pis):

```bash
sudo apt-get install cups
sudo systemctl start cups
sudo systemctl enable cups
sudo usermod -a -G lpadmin $USER
```

2. Configure printer via CUPS web interface: `http://<pi-ip>:631`

3. Uncomment the CUPS socket volume in `docker-compose.yml`:

```yaml
volumes:
  - /var/run/cups/cups.sock:/var/run/cups/cups.sock:ro
```

See `backend/docs/CUPS_SETUP.md` for detailed instructions.

## Accessing the Application

- Frontend: `http://<manager-ip>`
- Backend API: `http://<manager-ip>:3001`
- Health Check: `http://<manager-ip>:3001/health`

## Monitoring

### View Service Status

```bash
docker service ls
docker service ps inventory_backend
docker service ps inventory_frontend
docker service ps inventory_postgres
```

### View Logs

```bash
docker service logs -f inventory_backend
docker service logs -f inventory_frontend
docker service logs -f inventory_postgres
```

### Service Health

Check health endpoints:

```bash
curl http://localhost:3001/health
```

## Scaling

Scale services as needed:

```bash
docker service scale inventory_backend=2
docker service scale inventory_frontend=2
```

Note: PostgreSQL should remain at 1 replica (stateful service).

## Updates

To update a service:

1. Build new image
2. Update the stack:

```bash
docker service update --image <new-image> inventory_backend
```

Or redeploy the entire stack:

```bash
docker stack rm inventory
docker stack deploy -c docker-compose.yml inventory
```

## Backup

### Database Backup

```bash
# Create backup
docker exec $(docker ps -q -f name=inventory_postgres) pg_dump -U inventory inventory > backup.sql

# Restore backup
docker exec -i $(docker ps -q -f name=inventory_postgres) psql -U inventory inventory < backup.sql
```

### Volume Backup

Backup named volumes:

```bash
docker run --rm -v inventory_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz /data
```

## Troubleshooting

### Service Won't Start

1. Check logs: `docker service logs <service-name>`
2. Check resource constraints: `docker node inspect <node-name>`
3. Verify image exists: `docker images`
4. Check network: `docker network ls`

### Database Connection Issues

1. Verify PostgreSQL is healthy: `docker service ps inventory_postgres`
2. Check database URL in environment
3. Verify network connectivity
4. Check database logs

### High Resource Usage

Adjust resource limits in `docker-compose.yml`:

```yaml
deploy:
  resources:
    limits:
      cpus: '0.5'
      memory: 256M
```

### Port Conflicts

If ports are already in use, modify port mappings or stop conflicting services.

## Maintenance

### Update Dependencies

1. Update package.json files
2. Rebuild images
3. Redeploy stack

### Database Migrations

Run new migrations:

```bash
docker exec -it $(docker ps -q -f name=inventory_backend) npx prisma migrate deploy
```

### Clean Up

Remove unused resources:

```bash
docker system prune -a
docker volume prune
```

## Security Considerations

1. Change default passwords
2. Use Docker secrets for sensitive data
3. Enable TLS/HTTPS for production
4. Restrict network access
5. Keep system and Docker updated
6. Use firewall rules to restrict access

## Production Recommendations

1. Use a reverse proxy (nginx/traefik) with SSL/TLS
2. Set up automated backups
3. Monitor resource usage
4. Use Docker secrets for credentials
5. Implement log rotation
6. Set up health check monitoring
7. Use persistent volumes for critical data
8. Implement disaster recovery procedures


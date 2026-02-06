# Kubernetes Manifests for 3rax Backend

This directory contains Kubernetes manifests for deploying the 3rax inventory backend on Raspberry Pi using K3s.

## Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - Get started in 30 minutes
- **[K8S-DEPLOYMENT.md](../K8S-DEPLOYMENT.md)** - Complete deployment guide
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Common issues and solutions

## Files

### Kubernetes Manifests

- `namespace.yaml` - Creates the `3rax` namespace
- `configmap.yaml` - Configuration (NATS URL, environment)
- `secret.yaml` - Sensitive data (database credentials)
- `pvc.yaml` - Persistent volume claim for uploads
- `deployment.yaml` - Backend deployment (2 replicas)
- `service.yaml` - ClusterIP and NodePort services
- `postgres.yaml` - PostgreSQL deployment (optional)
- `ingress.yaml` - Ingress for domain access (optional)

### Scripts

- `build-arm.sh` - Build Docker image for ARM64
- `deploy.sh` - Deploy all manifests to K8s
- `fix-cgroups.sh` - Fix cgroup issue on Raspberry Pi (run before K3s install!)

## Quick Deploy

```bash
# 1. Build image
./build-arm.sh

# 2. Transfer to Raspberry Pi and import
# (see QUICKSTART.md)

# 3. Deploy
./deploy.sh
```

## Architecture

```
┌─────────────────────────────────────┐
│         K3s Cluster (Pi)            │
│                                     │
│  ┌──────────────┐  ┌────────────┐  │
│  │   Backend    │  │ PostgreSQL │  │
│  │   (2 pods)   │  │  (1 pod)   │  │
│  └──────┬───────┘  └──────┬─────┘  │
│         │                 │         │
│         └────────┬────────┘         │
│                  │                  │
└──────────────────┼──────────────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
    NATS Server           Scanners
 192.168.50.118:4222   (Raspberry Pi)
```

## Configuration

### Required Changes

Before deploying, update:

1. **Database URL** in `secret.yaml`:
   ```yaml
   DATABASE_URL: "postgresql://inventory:inventory@postgres-service:5432/inventory"
   ```

2. **NATS URL** in `configmap.yaml` (already set):
   ```yaml
   NATS_URL: "nats://192.168.50.118:4222"
   ```

### Optional Changes

- **Replicas**: Edit `deployment.yaml` to change number of backend pods
- **Resources**: Adjust CPU/memory limits for your Pi
- **Storage**: Change PVC size in `pvc.yaml` and `postgres.yaml`
- **NodePort**: Change port in `service.yaml` (default: 30001)

## Deployment Order

The `deploy.sh` script applies manifests in this order:

1. Namespace
2. ConfigMap and Secret
3. PVC
4. PostgreSQL (optional)
5. Backend Deployment
6. Services
7. Ingress (optional)

## Access Methods

### 1. NodePort (Default)

Access directly at: `http://<pi-ip>:30001`

### 2. Port Forward

```bash
kubectl port-forward -n 3rax svc/backend-service 3001:3001
```

Then access at: `http://localhost:3001`

### 3. Ingress

Add to `/etc/hosts`:
```
<pi-ip>  3rax.local
```

Access at: `http://3rax.local`

## Health Checks

The deployment includes:

- **Liveness probe**: Restarts pod if unhealthy
- **Readiness probe**: Removes pod from service if not ready
- **Startup probe**: Implicit via initialDelaySeconds

All probes check: `GET /health`

## Storage

### Backend Uploads

- PVC: `backend-uploads-pvc`
- Size: 10Gi
- Access: ReadWriteMany
- Mount: `/app/uploads`

### PostgreSQL Data

- PVC: `postgres-pvc`
- Size: 20Gi
- Access: ReadWriteOnce
- Mount: `/var/lib/postgresql/data`

## Resource Limits

Configured for Raspberry Pi 4 (4GB):

**Backend Pod**:
- Request: 256Mi RAM, 100m CPU
- Limit: 512Mi RAM, 500m CPU

**PostgreSQL Pod**:
- Request: 256Mi RAM, 100m CPU
- Limit: 512Mi RAM, 500m CPU

Adjust in manifests if you have more/less resources.

## Scaling

### Horizontal (More Pods)

```bash
kubectl scale deployment backend -n 3rax --replicas=3
```

### Vertical (More Resources)

Edit `deployment.yaml` and apply:
```bash
kubectl apply -f deployment.yaml
```

## Monitoring

### View Status

```bash
kubectl get all -n 3rax
kubectl get pods -n 3rax -w
```

### View Logs

```bash
# All pods
kubectl logs -f deployment/backend -n 3rax

# Specific pod
kubectl logs -f <pod-name> -n 3rax

# Previous pod (if crashed)
kubectl logs --previous <pod-name> -n 3rax
```

### View Events

```bash
kubectl get events -n 3rax --sort-by='.lastTimestamp'
```

### Resource Usage

```bash
kubectl top nodes
kubectl top pods -n 3rax
```

## Maintenance

### Update Image

```bash
# Build new image and import to Pi
./build-arm.sh v1.1

# Restart deployment
kubectl rollout restart deployment/backend -n 3rax
kubectl rollout status deployment/backend -n 3rax
```

### Backup Database

```bash
kubectl exec deployment/postgres -n 3rax -- \
  pg_dump -U inventory inventory > backup.sql
```

### View Configuration

```bash
kubectl get configmap backend-config -n 3rax -o yaml
kubectl get secret backend-secret -n 3rax -o yaml
```

## Troubleshooting

### Pods Not Starting

```bash
kubectl describe pod <pod-name> -n 3rax
kubectl logs <pod-name> -n 3rax
```

### Database Connection Issues

```bash
# Test from backend pod
kubectl exec -it deployment/backend -n 3rax -- sh
nc -zv postgres-service 5432
```

### Image Not Found

```bash
# On Pi, list images
sudo k3s ctr images ls | grep 3rax

# If missing, re-import
gunzip -c 3rax-backend.tar.gz | sudo k3s ctr images import -
```

## Cleanup

### Remove Application

```bash
kubectl delete -f .
```

### Remove Namespace

```bash
kubectl delete namespace 3rax
```

### Uninstall K3s

```bash
sudo /usr/local/bin/k3s-uninstall.sh
```

## Support

- Full guide: [K8S-DEPLOYMENT.md](../K8S-DEPLOYMENT.md)
- Quick start: [QUICKSTART.md](QUICKSTART.md)
- K3s docs: https://docs.k3s.io/

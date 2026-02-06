# Kubernetes Deployment Guide for Raspberry Pi

This guide covers deploying the 3rax backend on a Kubernetes cluster running on Raspberry Pi using K3s.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                 K3s Cluster                         │
│                                                     │
│  ┌──────────────┐         ┌──────────────┐        │
│  │ Master Node  │◄───────►│ Worker Node  │        │
│  │ Raspberry Pi │         │ Raspberry Pi │        │
│  │              │         │              │        │
│  │  ┌────────┐  │         │  ┌────────┐  │        │
│  │  │Backend │  │         │  │Backend │  │        │
│  │  │  Pod   │  │         │  │  Pod   │  │        │
│  │  └────────┘  │         │  └────────┘  │        │
│  │              │         │              │        │
│  │  ┌────────┐  │         │              │        │
│  │  │Postgres│  │         │              │        │
│  │  └────────┘  │         │              │        │
│  └──────────────┘         └──────────────┘        │
│                                                     │
└─────────────────────────────────────────────────────┘
         ↓                           ↓
    NATS Server                 Scanners
  192.168.50.118           (Raspberry Pi devices)
```

## Prerequisites

- Raspberry Pi 4 (4GB+ RAM recommended) x1 for master, x1+ for workers
- Raspberry Pi OS Lite (64-bit) installed on all nodes
- Static IP addresses for all nodes
- Network connectivity between all nodes
- SSH access to all nodes

## Part 1: K3s Installation

### 1.1 Enable Cgroups (REQUIRED!)

Before installing K3s, you **must** enable cgroups on Raspberry Pi:

```bash
# Option A: Use the fix script (recommended)
cd ~/code/3rax/k8s
chmod +x fix-cgroups.sh
./fix-cgroups.sh

# Option B: Manual fix
# Determine which file exists:
ls /boot/firmware/cmdline.txt  # Newer OS (Bookworm)
# OR
ls /boot/cmdline.txt  # Older OS (Bullseye)

# Edit the appropriate file:
sudo nano /boot/firmware/cmdline.txt  # or /boot/cmdline.txt

# Add to the END of the existing line (don't create a new line!):
cgroup_memory=1 cgroup_enable=memory

# Save and reboot
sudo reboot
```

**After reboot, verify cgroups are enabled:**
```bash
cat /proc/cgroups | grep memory
# Should show: memory  0  0  1
```

**If you skip this step, K3s will fail with: "failed to find memory cgroup"**

### 1.2 Install K3s on Master Node

After enabling cgroups and rebooting, SSH into your master Raspberry Pi:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install K3s (master node)
curl -sfL https://get.k3s.io | sh -s - server \
  --write-kubeconfig-mode 644 \
  --disable traefik \
  --node-name rpi-master

# Check status
sudo systemctl status k3s

# Get node token (needed for worker nodes)
sudo cat /var/lib/rancher/k3s/server/node-token

# Test kubectl
sudo kubectl get nodes
```

**If K3s fails to start:**
- Check logs: `sudo journalctl -xeu k3s.service`
- See `k8s/TROUBLESHOOTING.md` for solutions

### 1.3 Configure kubectl Access

```bash
# Copy kubeconfig to your local machine (from master node)
# On master node:
sudo cat /etc/rancher/k3s/k3s.yaml

# On your local machine:
mkdir -p ~/.kube
scp pi@rpi-master:/etc/rancher/k3s/k3s.yaml ~/.kube/config-rpi

# Edit the file and replace 127.0.0.1 with your master node IP
sed -i 's/127.0.0.1/192.168.50.xxx/g' ~/.kube/config-rpi

# Set KUBECONFIG environment variable
export KUBECONFIG=~/.kube/config-rpi

# Test connection
kubectl get nodes
```

### 1.4 Install K3s on Worker Nodes (Optional)

On each worker Raspberry Pi:

```bash
# Replace with your master node IP and token from step 1.1
export MASTER_IP="192.168.50.xxx"
export NODE_TOKEN="<token-from-master>"

# Install K3s agent
curl -sfL https://get.k3s.io | K3S_URL=https://${MASTER_IP}:6443 \
  K3S_TOKEN=${NODE_TOKEN} \
  sh -s - agent --node-name rpi-worker-1

# Check status
sudo systemctl status k3s-agent
```

Verify on master node:
```bash
kubectl get nodes
```

You should see all nodes listed.

## Part 2: Build and Push Docker Image

### 2.1 Build for ARM64

On your development machine:

```bash
cd /path/to/3rax

# Make build script executable
chmod +x k8s/build-arm.sh

# Build image
./k8s/build-arm.sh latest
```

### 2.2 Transfer Image to Raspberry Pi

```bash
# Save image
docker save 3rax-backend:latest | gzip > 3rax-backend-arm64.tar.gz

# Transfer to master node
scp 3rax-backend-arm64.tar.gz pi@rpi-master:~/

# On master node, import into k3s
ssh pi@rpi-master
gunzip -c 3rax-backend-arm64.tar.gz | sudo k3s ctr images import -

# Verify image is loaded
sudo k3s ctr images ls | grep 3rax
```

If you have worker nodes, repeat the import step on each worker.

## Part 3: Configure Database

Choose one option:

### Option A: PostgreSQL in Cluster (Recommended for small setups)

Edit `k8s/secret.yaml`:
```yaml
DATABASE_URL: "postgresql://inventory:inventory@postgres-service:5432/inventory?schema=public"
```

### Option B: External PostgreSQL

Edit `k8s/secret.yaml`:
```yaml
DATABASE_URL: "postgresql://inventory:inventory@192.168.50.xxx:5432/inventory?schema=public"
```

Make sure PostgreSQL is accessible from the cluster.

## Part 4: Deploy Application

### 4.1 Update Configuration

Edit `k8s/configmap.yaml` if needed:
```yaml
NATS_URL: "nats://192.168.50.118:4222"  # Your NATS server
```

Edit `k8s/secret.yaml`:
```yaml
DATABASE_URL: "<your-database-url>"
```

### 4.2 Deploy Using Script

```bash
cd k8s
chmod +x deploy.sh
./deploy.sh
```

### 4.3 Or Deploy Manually

```bash
cd k8s

# Create namespace
kubectl apply -f namespace.yaml

# Create ConfigMap and Secret
kubectl apply -f configmap.yaml
kubectl apply -f secret.yaml

# Create PVC
kubectl apply -f pvc.yaml

# Deploy PostgreSQL (if using in-cluster)
kubectl apply -f postgres.yaml

# Wait for PostgreSQL to be ready
kubectl wait --for=condition=ready pod -l app=postgres -n 3rax --timeout=120s

# Run database migrations (if PostgreSQL is new)
kubectl exec -it deployment/postgres -n 3rax -- psql -U inventory -d inventory -c "SELECT version();"

# Deploy backend
kubectl apply -f deployment.yaml

# Create services
kubectl apply -f service.yaml

# Optional: Create ingress
kubectl apply -f ingress.yaml
```

## Part 5: Run Database Migrations

### 5.1 Copy Prisma Schema

```bash
# On master node, copy prisma directory to a backend pod
kubectl cp backend/prisma $(kubectl get pod -n 3rax -l app=backend -o jsonpath='{.items[0].metadata.name}'):/tmp/prisma -n 3rax
```

### 5.2 Run Migrations

```bash
# Get a shell in a backend pod
kubectl exec -it deployment/backend -n 3rax -- sh

# Inside pod:
cd /tmp
npx prisma migrate deploy

# Exit pod
exit
```

Or run migrations from your local machine if you have database access:
```bash
cd backend
DATABASE_URL="postgresql://inventory:inventory@192.168.50.xxx:5432/inventory" npx prisma migrate deploy
```

## Part 6: Verify Deployment

### 6.1 Check Pod Status

```bash
kubectl get pods -n 3rax
```

Expected output:
```
NAME                        READY   STATUS    RESTARTS   AGE
backend-xxxxxxxxxx-xxxxx    1/1     Running   0          1m
backend-xxxxxxxxxx-xxxxx    1/1     Running   0          1m
postgres-xxxxxxxxxx-xxxxx   1/1     Running   0          2m
```

### 6.2 Check Logs

```bash
# Backend logs
kubectl logs -f deployment/backend -n 3rax

# Look for:
# ✅ Connected to NATS at nats://192.168.50.118:4222
# 📡 Subscribed to scanner.scans
# Scanner event listener active
```

### 6.3 Test Health Endpoint

```bash
# Port forward to test locally
kubectl port-forward -n 3rax svc/backend-service 3001:3001

# In another terminal
curl http://localhost:3001/health
```

Or access via NodePort:
```bash
curl http://<rpi-master-ip>:30001/health
```

## Part 7: Access the Backend

### Option 1: NodePort (Easiest)

Access directly via any node IP:
```
http://<node-ip>:30001/api/items
```

### Option 2: Port Forward (Development)

```bash
kubectl port-forward -n 3rax svc/backend-service 3001:3001
```

Access at `http://localhost:3001`

### Option 3: Ingress (Production)

Add DNS entry or edit `/etc/hosts`:
```
192.168.50.xxx  3rax.local
```

Access at `http://3rax.local`

## Part 8: Scaling

### Scale Backend Replicas

```bash
# Scale to 3 replicas
kubectl scale deployment backend -n 3rax --replicas=3

# Verify
kubectl get pods -n 3rax
```

### Add Worker Nodes

Repeat step 1.3 for each new worker node. Pods will automatically be scheduled on new nodes.

## Part 9: Monitoring and Maintenance

### View All Resources

```bash
kubectl get all -n 3rax
```

### Watch Pod Status

```bash
kubectl get pods -n 3rax -w
```

### View Events

```bash
kubectl get events -n 3rax --sort-by='.lastTimestamp'
```

### Access Pod Shell

```bash
kubectl exec -it deployment/backend -n 3rax -- sh
```

### View Resource Usage

```bash
kubectl top nodes
kubectl top pods -n 3rax
```

### Update Image

```bash
# Build and transfer new image (see Part 2)

# Restart deployment to use new image
kubectl rollout restart deployment/backend -n 3rax

# Watch rollout
kubectl rollout status deployment/backend -n 3rax
```

## Part 10: Backup and Recovery

### Backup Database

```bash
# Backup PostgreSQL
kubectl exec deployment/postgres -n 3rax -- \
  pg_dump -U inventory inventory > backup-$(date +%Y%m%d).sql

# Or use persistent volume backup
kubectl get pvc -n 3rax
```

### Restore Database

```bash
# Restore from SQL file
kubectl exec -i deployment/postgres -n 3rax -- \
  psql -U inventory inventory < backup-20240205.sql
```

## Part 11: Troubleshooting

### Pods Not Starting

```bash
# Describe pod for events
kubectl describe pod <pod-name> -n 3rax

# Check logs
kubectl logs <pod-name> -n 3rax

# Common issues:
# - Image not found: Verify image is imported on the node
# - Database connection: Check DATABASE_URL in secret
# - NATS connection: Verify NATS server is accessible
```

### Image Pull Errors

```bash
# List images on node
sudo k3s ctr images ls

# Re-import if needed
gunzip -c 3rax-backend-arm64.tar.gz | sudo k3s ctr images import -
```

### Database Connection Issues

```bash
# Test from pod
kubectl exec -it deployment/backend -n 3rax -- sh
nc -zv postgres-service 5432

# Or test PostgreSQL connection
kubectl exec -it deployment/postgres -n 3rax -- psql -U inventory -d inventory -c "SELECT 1;"
```

### NATS Connection Issues

```bash
# Test from pod
kubectl exec -it deployment/backend -n 3rax -- sh
nc -zv 192.168.50.118 4222
```

## Part 12: Uninstall

### Remove Application

```bash
cd k8s
kubectl delete -f .
kubectl delete namespace 3rax
```

### Uninstall K3s

On worker nodes:
```bash
sudo /usr/local/bin/k3s-agent-uninstall.sh
```

On master node:
```bash
sudo /usr/local/bin/k3s-uninstall.sh
```

## Performance Tips for Raspberry Pi

1. **Use external SSD/NVMe** - Boot from USB SSD for better I/O performance
2. **Enable GPU memory split** - Set `gpu_mem=16` in `/boot/config.txt` for more RAM
3. **Use lightweight base images** - We use `node:20-alpine` to reduce memory footprint
4. **Limit resource requests** - Adjusted for Pi's limited resources
5. **Monitor temperature** - Use `vcgencmd measure_temp` to check Pi temperature
6. **Use ethernet** - WiFi adds latency and can be unstable under load

## Production Considerations

1. **High Availability**:
   - Run 3+ master nodes for HA control plane
   - Use external etcd cluster

2. **Storage**:
   - Use NFS or Longhorn for shared storage
   - Consider USB SSD for database

3. **Networking**:
   - Use MetalLB for LoadBalancer services
   - Configure network policies for security

4. **Monitoring**:
   - Install Prometheus and Grafana
   - Monitor node temperatures

5. **Backup**:
   - Regular database backups
   - Snapshot persistent volumes
   - Keep cluster config in git

## Next Steps

- Connect frontend to the backend service
- Set up continuous deployment (GitOps with ArgoCD/Flux)
- Configure HTTPS with cert-manager
- Add monitoring with Prometheus
- Set up log aggregation with Loki

## Resources

- K3s Documentation: https://docs.k3s.io/
- Kubectl Cheatsheet: https://kubernetes.io/docs/reference/kubectl/cheatsheet/
- Raspberry Pi K3s Guide: https://rancher.com/docs/k3s/latest/en/installation/

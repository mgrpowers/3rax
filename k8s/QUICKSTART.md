# Kubernetes Quick Start

Get your 3rax backend running on Raspberry Pi K3s in under 30 minutes.

## Prerequisites

- Raspberry Pi 4 (4GB+ RAM)
- Raspberry Pi OS Lite 64-bit
- Static IP configured
- Development machine (Mac/Linux) with Docker installed

## Step-by-Step

### 1. Enable Cgroups on Pi (Required!)

SSH into your Raspberry Pi:

```bash
ssh raspberry@<pi-ip>

# Edit boot config (check which file exists):
# Newer OS (Bookworm):
sudo nano /boot/firmware/cmdline.txt
# Older OS (Bullseye):
# sudo nano /boot/cmdline.txt

# Add to the END of the existing line (don't create a new line!):
cgroup_memory=1 cgroup_enable=memory

# Save and reboot
sudo reboot
```

After reboot, verify:
```bash
cat /proc/cgroups | grep memory
# Should show: memory  0  0  1
```

### 2. Install K3s on Pi (Master Node)

SSH into Pi after reboot:

```bash
ssh raspberry@<pi-ip>

# Install K3s
curl -sfL https://get.k3s.io | sh -s - server --write-kubeconfig-mode 644

# Wait ~30 seconds for it to start, then verify
sudo kubectl get nodes
```

**If K3s fails to start**, see `TROUBLESHOOTING.md`.

### 3. Build ARM64 Docker Image

On your **development machine** (Mac/Linux):

```bash
cd /path/to/3rax
./k8s/build-arm.sh latest
```

### 4. Transfer Image to Pi

On your **development machine**:

```bash
# Save image to file
docker save 3rax-backend:latest | gzip > 3rax-backend.tar.gz

# Copy to Pi
scp 3rax-backend.tar.gz raspberry@<pi-ip>:~/
```

On the **Pi**:

```bash
# Import image into K3s
gunzip -c ~/3rax-backend.tar.gz | sudo k3s ctr images import -

# Verify it was imported
sudo k3s ctr images ls | grep 3rax
```

### 5. Copy K8s Manifests to Pi

On your **development machine**:

```bash
# Copy the k8s directory to the Pi
scp -r /path/to/3rax/k8s raspberry@<pi-ip>:~/k8s
```

### 6. Configure

On the **Pi**:

```bash
cd ~/k8s

# Update database URL if using external PostgreSQL (skip if using in-cluster)
nano secret.yaml

# Update NATS URL if needed (already set to 192.168.50.118:4222)
nano configmap.yaml
```

### 7. Deploy

On the **Pi**:

```bash
cd ~/k8s

# Create namespace
sudo kubectl apply -f namespace.yaml

# Create config and secrets
sudo kubectl apply -f configmap.yaml
sudo kubectl apply -f secret.yaml

# Create persistent storage
sudo kubectl apply -f pvc.yaml

# Deploy PostgreSQL (skip if using external database)
sudo kubectl apply -f postgres.yaml

# Wait for PostgreSQL to be ready (~1-2 min)
sudo kubectl wait --for=condition=ready pod -l app=postgres -n 3rax --timeout=120s

# Deploy backend
sudo kubectl apply -f deployment.yaml

# Create services
sudo kubectl apply -f service.yaml
```

### 8. Run Database Migrations

On the **Pi**, once the backend pod is running:

```bash
# Wait for backend to start
sudo kubectl wait --for=condition=ready pod -l app=backend -n 3rax --timeout=120s

# Run Prisma migrations from inside the pod
sudo kubectl exec -it deployment/backend -n 3rax -- npx prisma migrate deploy
```

### 9. Verify

```bash
# Check all pods are running
sudo kubectl get pods -n 3rax

# Expected output:
# NAME                        READY   STATUS    RESTARTS   AGE
# postgres-xxxxx              1/1     Running   0          2m
# backend-xxxxx               1/1     Running   0          1m

# Check backend logs (should show NATS connection)
sudo kubectl logs -f deployment/backend -n 3rax

# Test health endpoint
curl http://localhost:30001/health
```

### 10. Access

Your backend is now available at:
- **From the Pi**: `http://localhost:30001`
- **From the network**: `http://<pi-ip>:30001`
- **Health check**: `http://<pi-ip>:30001/health`
- **API**: `http://<pi-ip>:30001/api/items`

## Add Worker Nodes

On master Pi, get the join token:
```bash
sudo cat /var/lib/rancher/k3s/server/node-token
```

On each worker Pi (after enabling cgroups and rebooting):
```bash
curl -sfL https://get.k3s.io | K3S_URL=https://<master-ip>:6443 \
  K3S_TOKEN=<token> sh -s - agent --node-name rpi-worker-1
```

Verify on master:
```bash
sudo kubectl get nodes
```

## Common Commands

```bash
# View all resources
sudo kubectl get all -n 3rax

# Scale replicas
sudo kubectl scale deployment backend -n 3rax --replicas=3

# Update image (after importing new image)
sudo kubectl rollout restart deployment/backend -n 3rax

# View logs
sudo kubectl logs -f deployment/backend -n 3rax

# Shell into pod
sudo kubectl exec -it deployment/backend -n 3rax -- sh

# Delete everything
sudo kubectl delete namespace 3rax
```

## Troubleshooting

**Pods stuck in ImagePullBackOff or ErrImagePull**:
```bash
# Verify image exists in K3s
sudo k3s ctr images ls | grep 3rax
# If not found, re-import the image
```

**Pods stuck in CrashLoopBackOff**:
```bash
# Check logs for error
sudo kubectl logs deployment/backend -n 3rax
# Common cause: database not ready or DATABASE_URL wrong
```

**Database connection failed**:
```bash
sudo kubectl get pods -n 3rax
sudo kubectl logs deployment/postgres -n 3rax
```

**NATS connection failed**:
```bash
# Test from pod
sudo kubectl exec -it deployment/backend -n 3rax -- nc -zv 192.168.50.118 4222
```

## Next Steps

- See full guide: `../K8S-DEPLOYMENT.md`
- See troubleshooting: `TROUBLESHOOTING.md`
- Add monitoring and logging
- Configure ingress for domain access
- Set up automated backups

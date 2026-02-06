# Kubernetes Quick Start

Get your 3rax backend running on Raspberry Pi K3s in under 30 minutes.

## Prerequisites

- Raspberry Pi 4 (4GB+ RAM)
- Raspberry Pi OS Lite 64-bit
- Static IP configured

## Step-by-Step

### 1. Enable Cgroups (Required!)

SSH into your Raspberry Pi and enable cgroups first:

```bash
# Download and run the fix script
./k8s/fix-cgroups.sh

# Or manually edit boot config:
sudo nano /boot/firmware/cmdline.txt  # or /boot/cmdline.txt on older OS

# Add to the END of the line (no new line!):
cgroup_memory=1 cgroup_enable=memory

# Reboot
sudo reboot
```

### 2. Install K3s (Master Node)

After reboot:

```bash
# Install K3s
curl -sfL https://get.k3s.io | sh -s - server --write-kubeconfig-mode 644

# Verify
sudo kubectl get nodes
```

**If K3s fails to start**, see `TROUBLESHOOTING.md` for the cgroup fix.

### 3. Build ARM64 Image

On your development machine:

```bash
cd 3rax
./k8s/build-arm.sh latest
```

### 4. Transfer Image to Pi

```bash
# Save and compress
docker save 3rax-backend:latest | gzip > 3rax-backend.tar.gz

# Copy to Pi
scp 3rax-backend.tar.gz pi@<pi-ip>:~/

# Import on Pi
ssh pi@<pi-ip>
gunzip -c 3rax-backend.tar.gz | sudo k3s ctr images import -
```

### 5. Configure

```bash
# On Pi, edit configuration
cd ~/3rax/k8s

# Update database URL in secret.yaml
nano secret.yaml

# Update NATS URL if needed (already set to 192.168.50.118:4222)
nano configmap.yaml
```

### 6. Deploy

```bash
# Deploy everything
./deploy.sh

# Or manually:
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f secret.yaml
kubectl apply -f pvc.yaml
kubectl apply -f postgres.yaml  # Wait ~2 min for ready
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
```

### 7. Verify

```bash
# Check pods
kubectl get pods -n 3rax

# Check logs
kubectl logs -f deployment/backend -n 3rax

# Test health
curl http://localhost:30001/health
```

### 8. Access

Your backend is now available at:
- **NodePort**: `http://<pi-ip>:30001`
- **ClusterIP**: Port-forward with `kubectl port-forward -n 3rax svc/backend-service 3001:3001`

## Add Worker Nodes

On master, get token:
```bash
sudo cat /var/lib/rancher/k3s/server/node-token
```

On worker Pi:
```bash
curl -sfL https://get.k3s.io | K3S_URL=https://<master-ip>:6443 \
  K3S_TOKEN=<token> sh -s - agent
```

## Common Commands

```bash
# View all resources
kubectl get all -n 3rax

# Scale replicas
kubectl scale deployment backend -n 3rax --replicas=3

# Update image
kubectl rollout restart deployment/backend -n 3rax

# View logs
kubectl logs -f deployment/backend -n 3rax

# Shell into pod
kubectl exec -it deployment/backend -n 3rax -- sh

# Delete everything
kubectl delete namespace 3rax
```

## Troubleshooting

**Pods stuck in ImagePullBackOff**:
```bash
sudo k3s ctr images ls | grep 3rax
# If not found, re-import image
```

**Database connection failed**:
```bash
kubectl get pods -n 3rax
kubectl logs deployment/postgres -n 3rax
```

**NATS connection failed**:
```bash
# Test from pod
kubectl exec -it deployment/backend -n 3rax -- nc -zv 192.168.50.118 4222
```

## Next Steps

- See full guide: `K8S-DEPLOYMENT.md`
- Add monitoring and logging
- Configure ingress for domain access
- Set up automated backups

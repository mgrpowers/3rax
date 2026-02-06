# K3s Troubleshooting Guide for Raspberry Pi

## Common Issues and Solutions

### 1. "Failed to find memory cgroup" Error

**Symptoms:**
```
level=fatal msg="Error: failed to find memory cgroup"
k3s.service: Failed with result 'exit-code'
```

**Cause:** K3s requires cgroups to be enabled in the kernel boot parameters.

**Solution:**

#### Step 1: Enable cgroups

```bash
# For Raspberry Pi OS Bookworm (newer) - check which file exists:
ls /boot/firmware/cmdline.txt
# OR for older versions:
ls /boot/cmdline.txt

# Edit the appropriate file:
# For newer OS (Bookworm):
sudo nano /boot/firmware/cmdline.txt
# OR for older OS:
sudo nano /boot/cmdline.txt
```

#### Step 2: Add cgroup parameters

Add these parameters to the **end of the existing line** (do not create a new line):

```
cgroup_memory=1 cgroup_enable=memory
```

**Example before:**
```
console=serial0,115200 console=tty1 root=PARTUUID=xxxxxxxx-xx rootfstype=ext4 fsck.repair=yes rootwait
```

**Example after:**
```
console=serial0,115200 console=tty1 root=PARTUUID=xxxxxxxx-xx rootfstype=ext4 fsck.repair=yes rootwait cgroup_memory=1 cgroup_enable=memory
```

**Important:** Make sure everything is on ONE line with spaces between parameters!

#### Step 3: Reboot

```bash
sudo reboot
```

#### Step 4: Verify cgroups are enabled

```bash
# After reboot, check if cgroups are mounted
cat /proc/cgroups | grep memory

# You should see output like:
# memory  0  0  1
```

#### Step 5: Reinstall K3s

```bash
# Uninstall if it was partially installed
sudo /usr/local/bin/k3s-uninstall.sh 2>/dev/null || true

# Install K3s
curl -sfL https://get.k3s.io | sh -s - server --write-kubeconfig-mode 644

# Check status
sudo systemctl status k3s
```

### 2. K3s Service Keeps Restarting

**Check logs:**
```bash
sudo journalctl -xeu k3s.service -n 100
```

Common causes:
- Missing cgroups (see #1)
- Insufficient memory
- Port conflicts

### 3. kubectl Connection Refused

**Symptoms:**
```
The connection to the server localhost:8080 was refused
```

**Cause:** kubectl is not configured or K3s is not running.

**Solution:**

```bash
# Check if K3s is running
sudo systemctl status k3s

# If not running, start it
sudo systemctl start k3s

# Configure kubectl for non-root user
mkdir -p ~/.kube
sudo cat /etc/rancher/k3s/k3s.yaml > ~/.kube/config
sudo chown $USER:$USER ~/.kube/config
export KUBECONFIG=~/.kube/config

# Or use sudo with kubectl
sudo kubectl get nodes
```

### 4. Out of Memory Issues

**Symptoms:**
```
OOMKilled
Node pressure
```

**Solutions:**

#### Increase GPU memory split
```bash
sudo nano /boot/config.txt
# Add or change:
gpu_mem=16

sudo reboot
```

#### Reduce K3s components
```bash
# Reinstall K3s with minimal components
sudo /usr/local/bin/k3s-uninstall.sh

curl -sfL https://get.k3s.io | sh -s - server \
  --write-kubeconfig-mode 644 \
  --disable traefik \
  --disable servicelb
```

#### Reduce backend replicas
```bash
kubectl scale deployment backend -n 3rax --replicas=1
```

### 5. Image Pull Errors

**Symptoms:**
```
ImagePullBackOff
ErrImagePull
```

**Solution:**

```bash
# Check if image exists in k3s
sudo k3s ctr images ls | grep 3rax

# If not found, import it
gunzip -c 3rax-backend.tar.gz | sudo k3s ctr images import -

# Verify import
sudo k3s ctr images ls | grep 3rax

# Restart deployment
kubectl rollout restart deployment/backend -n 3rax
```

### 6. Database Connection Failed

**Check PostgreSQL is running:**
```bash
kubectl get pods -n 3rax
kubectl logs deployment/postgres -n 3rax
```

**Test connection from backend pod:**
```bash
kubectl exec -it deployment/backend -n 3rax -- sh
nc -zv postgres-service 5432
exit
```

**Check database URL:**
```bash
kubectl get secret backend-secret -n 3rax -o yaml
```

### 7. NATS Connection Failed

**Test NATS connectivity:**
```bash
# From Pi
nc -zv 192.168.50.118 4222

# From pod
kubectl exec -it deployment/backend -n 3rax -- sh
nc -zv 192.168.50.118 4222
```

**Check firewall:**
```bash
# On NATS server
sudo ufw status
sudo ufw allow 4222/tcp
```

### 8. Persistent Volume Issues

**Check PVC status:**
```bash
kubectl get pvc -n 3rax
```

**If pending:**
```bash
# K3s uses local-path provisioner by default
kubectl get storageclass

# Check local-path-provisioner is running
kubectl get pods -n kube-system | grep local-path
```

### 9. Node Not Ready

**Check node status:**
```bash
kubectl get nodes
kubectl describe node <node-name>
```

**Common fixes:**

```bash
# Check disk space
df -h

# Check memory
free -h

# Restart kubelet
sudo systemctl restart k3s

# Check for errors
sudo journalctl -u k3s -f
```

### 10. Pods Stuck in Pending

**Check why:**
```bash
kubectl describe pod <pod-name> -n 3rax
```

**Common causes:**
- Insufficient resources
- PVC not bound
- Node selector mismatch

**Solutions:**

```bash
# Check resource availability
kubectl describe nodes

# Check events
kubectl get events -n 3rax --sort-by='.lastTimestamp'

# Reduce resource requests in deployment.yaml
```

## System Requirements Check

Run this script to verify your Pi meets requirements:

```bash
#!/bin/bash
echo "=== Raspberry Pi K3s Readiness Check ==="
echo ""

# OS version
echo "OS Version:"
cat /etc/os-release | grep PRETTY_NAME

# Architecture
echo ""
echo "Architecture:"
uname -m

# Memory
echo ""
echo "Memory:"
free -h | grep Mem

# Disk space
echo ""
echo "Disk Space:"
df -h / | tail -1

# Cgroups
echo ""
echo "Cgroups:"
cat /proc/cgroups | head -5

# Kernel modules
echo ""
echo "Kernel Modules:"
lsmod | grep -E "br_netfilter|overlay" || echo "Missing modules (K3s will load them)"

# Check cmdline for cgroups
echo ""
echo "Boot Parameters:"
if [ -f /boot/firmware/cmdline.txt ]; then
    cat /boot/firmware/cmdline.txt | grep -o "cgroup_[^ ]*"
elif [ -f /boot/cmdline.txt ]; then
    cat /boot/cmdline.txt | grep -o "cgroup_[^ ]*"
fi

echo ""
echo "=== End Check ==="
```

## Complete Fresh Install

If you're having persistent issues, try a complete fresh install:

```bash
# 1. Uninstall K3s completely
sudo /usr/local/bin/k3s-uninstall.sh
sudo rm -rf /var/lib/rancher/k3s
sudo rm -rf /etc/rancher

# 2. Enable cgroups (see step 1 above)
sudo nano /boot/firmware/cmdline.txt  # or /boot/cmdline.txt
# Add: cgroup_memory=1 cgroup_enable=memory

# 3. Reboot
sudo reboot

# 4. Verify cgroups
cat /proc/cgroups | grep memory

# 5. Install K3s
curl -sfL https://get.k3s.io | sh -s - server --write-kubeconfig-mode 644

# 6. Wait for it to be ready
sudo systemctl status k3s
sudo kubectl get nodes

# 7. Deploy application
cd ~/code/3rax/k8s
./deploy.sh
```

## Getting Help

### Collect Diagnostic Information

```bash
# System info
uname -a
free -h
df -h

# K3s status
sudo systemctl status k3s
sudo journalctl -u k3s -n 100 --no-pager

# Kubernetes resources
kubectl get all -n 3rax
kubectl get events -n 3rax --sort-by='.lastTimestamp'

# Pod details
kubectl describe pod <pod-name> -n 3rax
kubectl logs <pod-name> -n 3rax

# Node details
kubectl describe node <node-name>
```

### Useful Commands

```bash
# Watch pods
watch kubectl get pods -n 3rax

# Follow logs
kubectl logs -f deployment/backend -n 3rax

# Check resource usage
kubectl top nodes
kubectl top pods -n 3rax

# Shell into pod
kubectl exec -it deployment/backend -n 3rax -- sh

# View all resources
kubectl get all --all-namespaces
```

## Additional Resources

- K3s Documentation: https://docs.k3s.io/
- K3s GitHub Issues: https://github.com/k3s-io/k3s/issues
- Raspberry Pi Forums: https://forums.raspberrypi.com/
- Kubernetes Troubleshooting: https://kubernetes.io/docs/tasks/debug/

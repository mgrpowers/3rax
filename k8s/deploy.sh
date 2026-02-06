#!/bin/bash
# Deploy 3rax backend to Kubernetes

set -e

echo "================================"
echo "Deploying 3rax Backend to K8s"
echo "================================"
echo ""

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "Error: kubectl is not installed"
    echo "Install with: curl -LO https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/arm64/kubectl"
    exit 1
fi

# Apply manifests in order
echo "1. Creating namespace..."
kubectl apply -f namespace.yaml

echo ""
echo "2. Creating ConfigMap..."
kubectl apply -f configmap.yaml

echo ""
echo "3. Creating Secret..."
kubectl apply -f secret.yaml

echo ""
echo "4. Creating PVC..."
kubectl apply -f pvc.yaml

echo ""
echo "5. Deploying PostgreSQL (optional, comment out if using external DB)..."
read -p "Deploy PostgreSQL in cluster? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    kubectl apply -f postgres.yaml
    echo "Waiting for PostgreSQL to be ready..."
    kubectl wait --for=condition=ready pod -l app=postgres -n 3rax --timeout=120s
fi

echo ""
echo "6. Deploying Backend..."
kubectl apply -f deployment.yaml

echo ""
echo "7. Creating Services..."
kubectl apply -f service.yaml

echo ""
echo "8. Creating Ingress (optional)..."
read -p "Deploy Ingress? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    kubectl apply -f ingress.yaml
fi

echo ""
echo "================================"
echo "Deployment complete!"
echo "================================"
echo ""
echo "Check status:"
echo "  kubectl get all -n 3rax"
echo ""
echo "View logs:"
echo "  kubectl logs -f deployment/backend -n 3rax"
echo ""
echo "Access backend:"
echo "  kubectl port-forward -n 3rax svc/backend-service 3001:3001"
echo "  Or via NodePort: http://<node-ip>:30001"
echo ""

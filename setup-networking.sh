#!/bin/bash

# Network Configuration Script for Hybrid Deployment
# Sets up networking between Cloud Run and GKE services

set -e

PROJECT_ID=""
REGION="us-central1"
CLUSTER_NAME="vibe-check-security"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if PROJECT_ID is set
if [ -z "$PROJECT_ID" ]; then
    print_error "PROJECT_ID is not set."
    echo "Usage: PROJECT_ID=your-project-id ./setup-networking.sh"
    exit 1
fi

print_status "Setting up networking for hybrid deployment..."

# Get cluster credentials
gcloud container clusters get-credentials $CLUSTER_NAME --zone=$REGION-a --project=$PROJECT_ID

# Reserve static IP for ingress
print_status "Reserving static IP for ingress..."
gcloud compute addresses create vibe-check-ip --global --project=$PROJECT_ID || true

# Get the reserved IP
STATIC_IP=$(gcloud compute addresses describe vibe-check-ip --global --project=$PROJECT_ID --format='value(address)')
print_status "Reserved IP: $STATIC_IP"

# Apply networking configuration
print_status "Applying networking configuration..."
kubectl apply -f k8s/networking.yaml

# Wait for services to be ready
print_status "Waiting for services to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/redis -n security-services
kubectl wait --for=condition=available --timeout=300s deployment/zap-scanner -n security-services
kubectl wait --for=condition=available --timeout=300s deployment/trivy-scanner -n security-services

# Get internal service IPs
REDIS_INTERNAL=$(kubectl get service redis-internal -n security-services -o jsonpath='{.spec.clusterIP}')
ZAP_INTERNAL=$(kubectl get service zap-scanner-internal -n security-services -o jsonpath='{.spec.clusterIP}')
TRIVY_INTERNAL=$(kubectl get service trivy-scanner-internal -n security-services -o jsonpath='{.spec.clusterIP}')

print_status "Internal service IPs:"
print_status "Redis: $REDIS_INTERNAL:6379"
print_status "ZAP: $ZAP_INTERNAL:8080"
print_status "Trivy: $TRIVY_INTERNAL:8080"

# Update Cloud Run services with internal IPs
print_status "Updating Cloud Run services with internal service IPs..."

# Update backend service
gcloud run services update vibe-check-backend \
    --region=$REGION \
    --set-env-vars REDIS_URL=redis://$REDIS_INTERNAL:6379 \
    --set-env-vars ZAP_API_URL=http://$ZAP_INTERNAL:8080 \
    --set-env-vars TRIVY_API_URL=http://$TRIVY_INTERNAL:8080

print_status "Networking setup completed!"
echo ""
echo "🌐 Static IP: $STATIC_IP"
echo "🔧 Internal Service IPs:"
echo "   Redis: $REDIS_INTERNAL:6379"
echo "   ZAP:   $ZAP_INTERNAL:8080"
echo "   Trivy: $TRIVY_INTERNAL:8080"
echo ""
print_warning "Note: Update your DNS records to point to $STATIC_IP"
print_warning "Configure your domain in k8s/networking.yaml"

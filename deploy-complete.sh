#!/bin/bash

# Complete Hybrid Deployment Script
# Deploys Cloud Run + GKE + Monitoring + Networking

set -e

# Configuration
PROJECT_ID=""
REGION="us-central1"
ZONE="us-central1-a"
CLUSTER_NAME="vibe-check-security"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if PROJECT_ID is set
if [ -z "$PROJECT_ID" ]; then
    print_error "PROJECT_ID is not set. Please set your Google Cloud Project ID."
    echo "Usage: PROJECT_ID=your-project-id ./deploy-complete.sh"
    exit 1
fi

print_status "Starting complete hybrid deployment..."
print_status "Project ID: $PROJECT_ID"
print_status "Region: $REGION"
print_status "Cluster: $CLUSTER_NAME"

# Check if gcloud is installed and authenticated
if ! command -v gcloud &> /dev/null; then
    print_error "gcloud CLI is not installed. Please install it first."
    exit 1
fi

# Set the project
print_status "Setting Google Cloud project..."
gcloud config set project $PROJECT_ID

# Enable required APIs
print_step "Enabling required Google Cloud APIs..."
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable container.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable compute.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable monitoring.googleapis.com
gcloud services enable logging.googleapis.com

# Create GKE cluster
print_step "Creating GKE cluster for security services..."
gcloud container clusters create $CLUSTER_NAME \
    --zone=$ZONE \
    --num-nodes=3 \
    --machine-type=e2-standard-2 \
    --enable-autoscaling \
    --min-nodes=1 \
    --max-nodes=5 \
    --enable-autorepair \
    --enable-autoupgrade \
    --enable-ip-alias \
    --enable-network-policy \
    --addons=HttpLoadBalancing,HorizontalPodAutoscaling

# Get cluster credentials
print_step "Getting cluster credentials..."
gcloud container clusters get-credentials $CLUSTER_NAME --zone=$ZONE

# Create namespace for security services
print_step "Creating namespace for security services..."
kubectl create namespace security-services || true

# Deploy security services
print_step "Deploying security services..."
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/zap.yaml
kubectl apply -f k8s/trivy.yaml

# Deploy monitoring
print_step "Deploying monitoring stack..."
kubectl apply -f k8s/monitoring.yaml

# Deploy networking
print_step "Deploying networking configuration..."
kubectl apply -f k8s/networking.yaml

# Wait for services to be ready
print_step "Waiting for services to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/redis -n security-services
kubectl wait --for=condition=available --timeout=300s deployment/zap-scanner -n security-services
kubectl wait --for=condition=available --timeout=300s deployment/trivy-scanner -n security-services
kubectl wait --for=condition=available --timeout=300s deployment/prometheus -n security-services
kubectl wait --for=condition=available --timeout=300s deployment/grafana -n security-services

# Get service IPs
REDIS_IP=$(kubectl get service redis -n security-services -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
ZAP_IP=$(kubectl get service zap-scanner -n security-services -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
TRIVY_IP=$(kubectl get service trivy-scanner -n security-services -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
PROMETHEUS_IP=$(kubectl get service prometheus -n security-services -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
GRAFANA_IP=$(kubectl get service grafana -n security-services -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

print_status "Security services deployed:"
print_status "Redis: $REDIS_IP:6379"
print_status "ZAP Scanner: $ZAP_IP:8080"
print_status "Trivy Scanner: $TRIVY_IP:8080"
print_status "Prometheus: $PROMETHEUS_IP:9090"
print_status "Grafana: $GRAFANA_IP:3000"

# Build and deploy Cloud Run services
print_step "Building and deploying Cloud Run services..."

# Build and push backend image
print_status "Building backend image..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/vibe-check-backend:latest \
    -f Dockerfile.backend.prod \
    --substitutions=_BACKEND_DIR=backend .

# Build and push frontend image
print_status "Building frontend image..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/vibe-check-frontend:latest \
    -f Dockerfile.frontend.prod \
    --substitutions=_FRONTEND_DIR=. .

# Deploy backend service
print_status "Deploying backend to Cloud Run..."
gcloud run deploy vibe-check-backend \
    --image gcr.io/$PROJECT_ID/vibe-check-backend:latest \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --port 8080 \
    --memory 2Gi \
    --cpu 2 \
    --min-instances 1 \
    --max-instances 10 \
    --timeout 300 \
    --set-env-vars NODE_ENV=production,PORT=8080,REDIS_URL=redis://$REDIS_IP:6379,ZAP_API_URL=http://$ZAP_IP:8080,TRIVY_API_URL=http://$TRIVY_IP:8080

# Get backend URL
BACKEND_URL=$(gcloud run services describe vibe-check-backend --region=$REGION --format='value(status.url)')
print_status "Backend deployed at: $BACKEND_URL"

# Deploy frontend service
print_status "Deploying frontend to Cloud Run..."
gcloud run deploy vibe-check-frontend \
    --image gcr.io/$PROJECT_ID/vibe-check-frontend:latest \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --port 8080 \
    --memory 512Mi \
    --cpu 1 \
    --min-instances 1 \
    --max-instances 10 \
    --timeout 60 \
    --set-env-vars REACT_APP_API_URL=$BACKEND_URL

# Get frontend URL
FRONTEND_URL=$(gcloud run services describe vibe-check-frontend --region=$REGION --format='value(status.url)')
print_status "Frontend deployed at: $FRONTEND_URL"

print_status "Complete hybrid deployment finished successfully!"
echo ""
echo "🌐 Application URLs:"
echo "   Frontend: $FRONTEND_URL"
echo "   Backend:  $BACKEND_URL"
echo ""
echo "🔧 Security Services (GKE):"
echo "   Redis:     $REDIS_IP:6379"
echo "   ZAP:       $ZAP_IP:8080"
echo "   Trivy:     $TRIVY_IP:8080"
echo ""
echo "📊 Monitoring:"
echo "   Prometheus: http://$PROMETHEUS_IP:9090"
echo "   Grafana:    http://$GRAFANA_IP:3000 (admin/admin123)"
echo ""
print_warning "Note: It may take a few minutes for all services to be fully ready."
print_warning "Check service status with: kubectl get pods -n security-services"
print_warning "Change the default Grafana password in production!"

#!/bin/bash

# Monitoring and Logging Setup Script for Hybrid Deployment

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
    echo "Usage: PROJECT_ID=your-project-id ./setup-monitoring.sh"
    exit 1
fi

print_status "Setting up monitoring and logging for hybrid deployment..."

# Get cluster credentials
gcloud container clusters get-credentials $CLUSTER_NAME --zone=$REGION-a --project=$PROJECT_ID

# Enable monitoring APIs
print_status "Enabling monitoring APIs..."
gcloud services enable monitoring.googleapis.com
gcloud services enable logging.googleapis.com

# Deploy monitoring stack
print_status "Deploying monitoring stack..."
kubectl apply -f k8s/monitoring.yaml

# Wait for monitoring services to be ready
print_status "Waiting for monitoring services to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/prometheus -n security-services
kubectl wait --for=condition=available --timeout=300s deployment/grafana -n security-services

# Get monitoring service IPs
PROMETHEUS_IP=$(kubectl get service prometheus -n security-services -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
GRAFANA_IP=$(kubectl get service grafana -n security-services -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

print_status "Monitoring services deployed:"
print_status "Prometheus: http://$PROMETHEUS_IP:9090"
print_status "Grafana: http://$GRAFANA_IP:3000 (admin/admin123)"

# Set up Cloud Logging
print_status "Setting up Cloud Logging..."

# Create log sink for Cloud Run
gcloud logging sinks create vibe-check-cloudrun-sink \
    bigquery.googleapis.com/projects/$PROJECT_ID/datasets/vibe_check_logs \
    --log-filter='resource.type="cloud_run_revision"' \
    --project=$PROJECT_ID || true

# Create log sink for GKE
gcloud logging sinks create vibe-check-gke-sink \
    bigquery.googleapis.com/projects/$PROJECT_ID/datasets/vibe_check_logs \
    --log-filter='resource.type="k8s_container"' \
    --project=$PROJECT_ID || true

print_status "Monitoring and logging setup completed!"
echo ""
echo "📊 Monitoring URLs:"
echo "   Prometheus: http://$PROMETHEUS_IP:9090"
echo "   Grafana:    http://$GRAFANA_IP:3000"
echo ""
echo "📝 Logging:"
echo "   Cloud Run logs: Available in Cloud Logging"
echo "   GKE logs: Available in Cloud Logging"
echo "   BigQuery: vibe_check_logs dataset"
echo ""
print_warning "Default Grafana credentials: admin/admin123"
print_warning "Change the default password in production!"

#!/bin/bash

# Google Cloud Run Deployment Script for Vibe Check
# This script deploys the vibe-check application to Google Cloud Run

set -e

# Configuration
PROJECT_ID=""
REGION="us-central1"
SERVICE_NAME_BACKEND="vibe-check-backend"
SERVICE_NAME_FRONTEND="vibe-check-frontend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
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
    print_error "PROJECT_ID is not set. Please set your Google Cloud Project ID."
    echo "Usage: PROJECT_ID=your-project-id ./deploy-gcp.sh"
    exit 1
fi

print_status "Starting deployment to Google Cloud Run..."
print_status "Project ID: $PROJECT_ID"
print_status "Region: $REGION"

# Check if gcloud is installed and authenticated
if ! command -v gcloud &> /dev/null; then
    print_error "gcloud CLI is not installed. Please install it first."
    echo "Visit: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Set the project
print_status "Setting Google Cloud project..."
gcloud config set project $PROJECT_ID

# Enable required APIs
print_status "Enabling required Google Cloud APIs..."
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Build and push backend image
print_status "Building and pushing backend image..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME_BACKEND:latest \
    -f Dockerfile.backend.prod \
    --substitutions=_BACKEND_DIR=backend .

# Build and push frontend image
print_status "Building and pushing frontend image..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME_FRONTEND:latest \
    -f Dockerfile.frontend.prod \
    --substitutions=_FRONTEND_DIR=. .

# Deploy backend service
print_status "Deploying backend service..."
gcloud run deploy $SERVICE_NAME_BACKEND \
    --image gcr.io/$PROJECT_ID/$SERVICE_NAME_BACKEND:latest \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --port 8080 \
    --memory 2Gi \
    --cpu 2 \
    --min-instances 1 \
    --max-instances 10 \
    --timeout 300 \
    --set-env-vars NODE_ENV=production,PORT=8080

# Get backend URL
BACKEND_URL=$(gcloud run services describe $SERVICE_NAME_BACKEND --region=$REGION --format='value(status.url)')
print_status "Backend deployed at: $BACKEND_URL"

# Deploy frontend service
print_status "Deploying frontend service..."
gcloud run deploy $SERVICE_NAME_FRONTEND \
    --image gcr.io/$PROJECT_ID/$SERVICE_NAME_FRONTEND:latest \
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
FRONTEND_URL=$(gcloud run services describe $SERVICE_NAME_FRONTEND --region=$REGION --format='value(status.url)')
print_status "Frontend deployed at: $FRONTEND_URL"

print_status "Deployment completed successfully!"
echo ""
echo "🌐 Your application is now live:"
echo "   Frontend: $FRONTEND_URL"
echo "   Backend:  $BACKEND_URL"
echo ""
print_warning "Note: Security scanning services (ZAP, Trivy, Redis) need to be deployed separately."
print_warning "Consider using Google Kubernetes Engine (GKE) for full container orchestration."

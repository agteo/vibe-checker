# Google Cloud Secret Manager Setup Script

#!/bin/bash

# This script sets up Google Cloud Secret Manager for storing sensitive environment variables

set -e

PROJECT_ID=""
REGION="us-central1"

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
    print_error "PROJECT_ID is not set. Please set your Google Cloud Project ID."
    echo "Usage: PROJECT_ID=your-project-id ./setup-secrets.sh"
    exit 1
fi

print_status "Setting up Google Cloud Secret Manager for project: $PROJECT_ID"

# Enable Secret Manager API
print_status "Enabling Secret Manager API..."
gcloud services enable secretmanager.googleapis.com --project=$PROJECT_ID

# Create secrets
print_status "Creating secrets..."

# Semgrep API Key
if [ -n "$SEMGREP_API_KEY" ]; then
    echo "$SEMGREP_API_KEY" | gcloud secrets create semgrep-api-key \
        --data-file=- \
        --project=$PROJECT_ID
    print_status "Created semgrep-api-key secret"
else
    print_warning "SEMGREP_API_KEY not set, skipping semgrep-api-key secret"
fi

# GitHub Token
if [ -n "$GITHUB_TOKEN" ]; then
    echo "$GITHUB_TOKEN" | gcloud secrets create github-token \
        --data-file=- \
        --project=$PROJECT_ID
    print_status "Created github-token secret"
else
    print_warning "GITHUB_TOKEN not set, skipping github-token secret"
fi

# Session Secret
if [ -n "$SESSION_SECRET" ]; then
    echo "$SESSION_SECRET" | gcloud secrets create session-secret \
        --data-file=- \
        --project=$PROJECT_ID
    print_status "Created session-secret secret"
else
    print_warning "SESSION_SECRET not set, skipping session-secret secret"
fi

# JWT Secret
if [ -n "$JWT_SECRET" ]; then
    echo "$JWT_SECRET" | gcloud secrets create jwt-secret \
        --data-file=- \
        --project=$PROJECT_ID
    print_status "Created jwt-secret secret"
else
    print_warning "JWT_SECRET not set, skipping jwt-secret secret"
fi

# Get project number for service account
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")

# Grant access to Cloud Run service account
print_status "Granting access to Cloud Run service account..."
gcloud secrets add-iam-policy-binding semgrep-api-key \
    --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor" \
    --project=$PROJECT_ID

gcloud secrets add-iam-policy-binding github-token \
    --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor" \
    --project=$PROJECT_ID

gcloud secrets add-iam-policy-binding session-secret \
    --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor" \
    --project=$PROJECT_ID

gcloud secrets add-iam-policy-binding jwt-secret \
    --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor" \
    --project=$PROJECT_ID

print_status "Secret Manager setup completed successfully!"
echo ""
echo "🔐 Secrets created:"
echo "   - semgrep-api-key"
echo "   - github-token"
echo "   - session-secret"
echo "   - jwt-secret"
echo ""
print_warning "Remember to update your Cloud Run services to use these secrets."
print_warning "Use the following command to reference secrets in Cloud Run:"
echo "   gcloud run services update SERVICE_NAME --set-secrets SECRET_NAME=SECRET_NAME:latest"

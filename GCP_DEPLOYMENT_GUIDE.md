# Google Cloud Run Deployment Guide

## Prerequisites

1. **Google Cloud Account**: Sign up at [cloud.google.com](https://cloud.google.com)
2. **Google Cloud CLI**: Install from [cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install)
3. **Docker**: Ensure Docker is installed and running
4. **API Keys**: Configure your security tool API keys

## Quick Deployment

### 1. Set up Google Cloud Project

```bash
# Create a new project (optional)
gcloud projects create vibe-check-security --name="Vibe Check Security"

# Set your project ID
export PROJECT_ID=your-project-id
gcloud config set project $PROJECT_ID

# Enable billing (required for Cloud Run)
# Go to: https://console.cloud.google.com/billing
```

### 2. Authenticate with Google Cloud

```bash
# Login to Google Cloud
gcloud auth login

# Set application default credentials
gcloud auth application-default login
```

### 3. Deploy the Application

```bash
# Make the deployment script executable
chmod +x deploy-gcp.sh

# Run the deployment script
PROJECT_ID=your-project-id ./deploy-gcp.sh
```

## Manual Deployment Steps

If you prefer to deploy manually:

### 1. Enable Required APIs

```bash
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

### 2. Build and Push Images

```bash
# Backend
gcloud builds submit --tag gcr.io/$PROJECT_ID/vibe-check-backend:latest \
    -f Dockerfile.backend.prod \
    --substitutions=_BACKEND_DIR=backend .

# Frontend
gcloud builds submit --tag gcr.io/$PROJECT_ID/vibe-check-frontend:latest \
    -f Dockerfile.frontend.prod \
    --substitutions=_FRONTEND_DIR=. .
```

### 3. Deploy Services

```bash
# Deploy backend
gcloud run deploy vibe-check-backend \
    --image gcr.io/$PROJECT_ID/vibe-check-backend:latest \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated \
    --port 8080 \
    --memory 2Gi \
    --cpu 2 \
    --min-instances 1 \
    --max-instances 10

# Deploy frontend
gcloud run deploy vibe-check-frontend \
    --image gcr.io/$PROJECT_ID/vibe-check-frontend:latest \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated \
    --port 8080 \
    --memory 512Mi \
    --cpu 1 \
    --min-instances 1 \
    --max-instances 10
```

## Environment Variables

### Required Environment Variables

Set these in the Google Cloud Console or via CLI:

```bash
# Backend environment variables
gcloud run services update vibe-check-backend \
    --set-env-vars NODE_ENV=production,PORT=8080

# Frontend environment variables
gcloud run services update vibe-check-frontend \
    --set-env-vars REACT_APP_API_URL=https://vibe-check-backend-PROJECT_ID.a.run.app
```

### Security Tool API Keys

Configure these in Google Cloud Secret Manager:

```bash
# Create secrets
gcloud secrets create semgrep-api-key --data-file=- <<< "your_semgrep_api_key"
gcloud secrets create github-token --data-file=- <<< "your_github_token"

# Grant access to Cloud Run
gcloud secrets add-iam-policy-binding semgrep-api-key \
    --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

## Alternative: Google Kubernetes Engine (GKE)

For full container orchestration including security scanning services:

### 1. Create GKE Cluster

```bash
gcloud container clusters create vibe-check-cluster \
    --num-nodes 3 \
    --machine-type e2-standard-2 \
    --region us-central1
```

### 2. Deploy with Kubernetes

```bash
# Get cluster credentials
gcloud container clusters get-credentials vibe-check-cluster --region us-central1

# Deploy using kubectl
kubectl apply -f k8s/
```

## Monitoring and Logging

### View Logs

```bash
# Backend logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=vibe-check-backend" --limit 50

# Frontend logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=vibe-check-frontend" --limit 50
```

### Monitor Performance

- Go to [Google Cloud Console > Cloud Run](https://console.cloud.google.com/run)
- View metrics, logs, and performance data
- Set up alerts for errors and performance issues

## Cost Optimization

### Cloud Run Pricing
- **CPU**: $0.00002400 per vCPU-second
- **Memory**: $0.00000250 per GiB-second
- **Requests**: $0.40 per million requests
- **Minimum instances**: $0.00000240 per vCPU-second

### Cost-Saving Tips
1. **Set appropriate min/max instances**
2. **Use smaller memory allocations** where possible
3. **Enable CPU throttling** for non-critical services
4. **Monitor usage** with Cloud Monitoring

## Security Considerations

### Network Security
- Use VPC connector for private networking
- Configure firewall rules appropriately
- Enable Cloud Armor for DDoS protection

### Authentication
- Consider requiring authentication for admin functions
- Use IAM roles for service-to-service communication
- Enable audit logging

### Data Protection
- Store sensitive data in Secret Manager
- Use encrypted storage for scan results
- Implement data retention policies

## Troubleshooting

### Common Issues

**Service won't start:**
```bash
# Check logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=SERVICE_NAME" --limit 10

# Check service status
gcloud run services describe SERVICE_NAME --region=us-central1
```

**Image build fails:**
```bash
# Check build logs
gcloud builds list --limit 5
gcloud builds log BUILD_ID
```

**Environment variables not working:**
```bash
# List current environment variables
gcloud run services describe SERVICE_NAME --region=us-central1 --format="value(spec.template.spec.template.spec.containers[0].env[].name,spec.template.spec.template.spec.containers[0].env[].value)"
```

## Next Steps

1. **Set up custom domain** with Cloud DNS
2. **Configure SSL certificates** with Certificate Manager
3. **Set up CI/CD pipeline** with Cloud Build
4. **Deploy security scanning services** to GKE
5. **Configure monitoring and alerting**

## Support

- [Google Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud Run Pricing](https://cloud.google.com/run/pricing)
- [Cloud Run Best Practices](https://cloud.google.com/run/docs/best-practices)

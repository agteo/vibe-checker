# Hybrid Google Cloud Deployment Guide
# Cloud Run (Web App) + GKE (Security Services)

## 🏗️ Architecture Overview

This hybrid approach provides the best of both worlds:

- **Cloud Run**: Hosts your React frontend and Express backend (cost-effective, auto-scaling)
- **GKE**: Hosts security scanning services (ZAP, Trivy, Redis) with persistent storage and long-running processes

## 🎯 Benefits of Hybrid Approach

### ✅ **Advantages**
- **Cost-effective**: Cloud Run scales to zero when not in use
- **Persistent storage**: GKE provides persistent volumes for scan data
- **Long-running processes**: Security scanners can run extended scans
- **Resource isolation**: Security services don't impact web app performance
- **Scalability**: Each component scales independently

### ⚠️ **Considerations**
- **Networking**: Services communicate across different platforms
- **Management**: Two different deployment models to maintain
- **Cost**: GKE cluster runs continuously (~$70/month)

## 🚀 Quick Start

### Prerequisites

1. **Google Cloud Account** with billing enabled
2. **Google Cloud CLI** installed and authenticated
3. **kubectl** installed (comes with gcloud)
4. **Docker** installed locally

### Step 1: Set up your project

```bash
# Set your project ID
export PROJECT_ID=your-project-id
gcloud config set project $PROJECT_ID

# Authenticate
gcloud auth login
gcloud auth application-default login
```

### Step 2: Deploy the hybrid solution

```bash
# Make the script executable
chmod +x deploy-hybrid.sh

# Deploy everything
PROJECT_ID=your-project-id ./deploy-hybrid.sh
```

## 📋 What Gets Deployed

### **Cloud Run Services**
- **Frontend**: React app with Nginx (port 8080)
- **Backend**: Express API server (port 8080)

### **GKE Services** (in `security-services` namespace)
- **Redis**: Job queue and caching (port 6379)
- **ZAP Scanner**: OWASP ZAP security scanner (port 8080)
- **Trivy Scanner**: Container vulnerability scanner (port 8080)

## 🔧 Configuration Details

### **GKE Cluster Settings**
- **Nodes**: 3 e2-standard-2 instances
- **Auto-scaling**: 1-5 nodes based on demand
- **Auto-repair**: Enabled
- **Auto-upgrade**: Enabled
- **Network policies**: Enabled for security

### **Persistent Storage**
- **Redis**: 10GB persistent volume
- **ZAP**: 20GB persistent volume (scan data)
- **Trivy**: 10GB persistent volume (cache)

### **Resource Limits**
- **Redis**: 512Mi memory, 500m CPU
- **ZAP**: 2Gi memory, 1000m CPU
- **Trivy**: 1Gi memory, 500m CPU

## 🌐 Networking Configuration

### **Service Communication**
```
Cloud Run Backend → GKE Services
├── Redis: redis://REDIS_IP:6379
├── ZAP: http://ZAP_IP:8080
└── Trivy: http://TRIVY_IP:8080
```

### **Load Balancer IPs**
The script automatically configures LoadBalancer services for external access:
- Each service gets a public IP
- Services are accessible from Cloud Run
- Firewall rules allow necessary traffic

## 💰 Cost Breakdown

### **Monthly Costs** (approximate)
- **GKE Cluster**: ~$70/month (3 nodes)
- **Cloud Run**: ~$15-45/month (usage-based)
- **Load Balancers**: ~$18/month (3 services)
- **Persistent Storage**: ~$5/month (40GB total)
- **Total**: ~$108-138/month

### **Cost Optimization Tips**
1. **Use preemptible nodes** for non-critical workloads
2. **Set appropriate resource limits** to avoid over-provisioning
3. **Monitor usage** with Cloud Monitoring
4. **Consider regional persistent disks** for better performance

## 🔍 Monitoring and Management

### **Check Service Status**

```bash
# Check GKE pods
kubectl get pods -n security-services

# Check Cloud Run services
gcloud run services list

# Check service logs
kubectl logs -f deployment/zap-scanner -n security-services
gcloud logging read "resource.type=cloud_run_revision" --limit 50
```

### **Scale Services**

```bash
# Scale GKE deployments
kubectl scale deployment zap-scanner --replicas=2 -n security-services

# Scale Cloud Run (automatic, but you can set min/max)
gcloud run services update vibe-check-backend \
    --min-instances=2 \
    --max-instances=20
```

## 🛠️ Troubleshooting

### **Common Issues**

**Services not communicating:**
```bash
# Check service IPs
kubectl get services -n security-services

# Test connectivity from Cloud Run
gcloud run services update vibe-check-backend \
    --set-env-vars REDIS_URL=redis://NEW_REDIS_IP:6379
```

**Pods not starting:**
```bash
# Check pod status
kubectl describe pod POD_NAME -n security-services

# Check events
kubectl get events -n security-services --sort-by='.lastTimestamp'
```

**Storage issues:**
```bash
# Check persistent volumes
kubectl get pv
kubectl get pvc -n security-services
```

## 🔒 Security Considerations

### **Network Security**
- **VPC**: Services run in default VPC
- **Firewall**: LoadBalancer services have public IPs
- **Network policies**: Enabled on GKE cluster

### **Access Control**
- **IAM**: Use service accounts for secure communication
- **Secrets**: Store API keys in Google Secret Manager
- **RBAC**: Kubernetes RBAC enabled

### **Data Protection**
- **Encryption**: Data encrypted at rest and in transit
- **Backup**: Persistent volumes can be backed up
- **Retention**: Configure data retention policies

## 🚀 Advanced Configuration

### **Custom Domain Setup**

```bash
# Map custom domain to Cloud Run
gcloud run domain-mappings create \
    --service=vibe-check-frontend \
    --domain=your-domain.com \
    --region=us-central1
```

### **SSL Certificates**

```bash
# Create managed SSL certificate
gcloud compute ssl-certificates create vibe-check-ssl \
    --domains=your-domain.com \
    --global
```

### **Monitoring and Alerting**

```bash
# Create uptime check
gcloud monitoring uptime-checks create \
    --display-name="Vibe Check Frontend" \
    --http-check-path="/" \
    --http-check-host="your-domain.com"
```

## 📊 Performance Optimization

### **Cloud Run Optimization**
- **Cold starts**: Set min-instances to reduce cold starts
- **Memory**: Right-size memory allocation
- **CPU**: Use CPU throttling for cost savings

### **GKE Optimization**
- **Node pools**: Use different machine types for different workloads
- **Horizontal Pod Autoscaling**: Automatically scale based on metrics
- **Vertical Pod Autoscaling**: Automatically adjust resource requests

## 🔄 CI/CD Integration

### **Cloud Build Pipeline**

```yaml
# cloudbuild.yaml
steps:
  # Build and deploy Cloud Run services
  - name: 'gcr.io/cloud-builders/gcloud'
    args: ['run', 'deploy', 'vibe-check-backend', '--image', 'gcr.io/$PROJECT_ID/vibe-check-backend:$COMMIT_SHA']
  
  # Update GKE deployments
  - name: 'gcr.io/cloud-builders/kubectl'
    args: ['set', 'image', 'deployment/zap-scanner', 'zap-scanner=gcr.io/$PROJECT_ID/zap-scanner:$COMMIT_SHA']
```

## 📞 Support and Resources

- [Google Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Google Kubernetes Engine Documentation](https://cloud.google.com/kubernetes-engine/docs)
- [Hybrid Architecture Best Practices](https://cloud.google.com/architecture/hybrid-and-multicloud-patterns)

## 🎯 Next Steps

1. **Deploy the hybrid solution** using the provided script
2. **Configure monitoring** and alerting
3. **Set up CI/CD pipeline** for automated deployments
4. **Implement custom domain** and SSL certificates
5. **Optimize costs** based on usage patterns

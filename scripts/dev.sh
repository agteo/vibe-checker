#!/bin/bash

echo "🚀 Starting Vibe Check Development Environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp env.example .env
    echo "⚠️  Please update .env with your API keys before running scans"
fi

# Start services
echo "🐳 Starting Docker containers..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
echo "🔍 Checking service health..."
curl -f http://localhost:3001/health || echo "❌ Backend not ready"
curl -f http://localhost:8080/JSON/core/view/version/ || echo "❌ ZAP not ready"
curl -f http://localhost:8081/health || echo "❌ Trivy not ready"

echo "✅ Development environment ready!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:3001"
echo "🛡️  ZAP Scanner: http://localhost:8080"
echo "🔍 Trivy Scanner: http://localhost:8081"
echo ""
echo "📋 Available FREE security tools:"
echo "   • OWASP ZAP (DAST) - Web application scanning"
echo "   • OSV.dev (SCA) - Vulnerability database"
echo "   • Trivy (Container/FS) - Container & filesystem scanning"
echo "   • GitHub Security (SCA) - Dependabot alerts"
echo "   • Semgrep (SAST) - Static analysis (requires free API key)"

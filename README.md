# Vibe Check: Security Orchestration Tool

A comprehensive security orchestration tool that safely orchestrates automated security tests (DAST/SCA/secret scans/static checks) against explicitly authorized targets and produces actionable, auditable reports mapped to OWASP Top 10 and common standards.

## 🎯 Vulnerability Detection Capabilities

### OWASP Top 10 Coverage
- **A01: Broken Access Control** - Authentication bypass, privilege escalation
- **A02: Cryptographic Failures** - Weak encryption, sensitive data exposure
- **A03: Injection** - SQL injection, NoSQL injection, LDAP injection
- **A04: Insecure Design** - Business logic flaws, architectural weaknesses
- **A05: Security Misconfiguration** - Default credentials, exposed services
- **A06: Vulnerable Components** - Outdated dependencies, known CVEs
- **A07: Authentication Failures** - Weak passwords, session management
- **A08: Software Integrity Failures** - Code tampering, supply chain issues
- **A09: Logging Failures** - Insufficient logging, log injection
- **A10: Server-Side Request Forgery** - SSRF attacks, internal network access

### Additional Security Checks
- **Cross-Site Scripting (XSS)** - Reflected, stored, and DOM-based XSS
- **Cross-Site Request Forgery (CSRF)** - Unauthorized state-changing requests
- **Server-Side Request Forgery (SSRF)** - Internal network and service access
- **XML External Entity (XXE)** - XML processing vulnerabilities
- **Insecure Direct Object References** - Unauthorized resource access
- **Security Headers** - Missing or misconfigured security headers
- **Information Disclosure** - Sensitive data exposure, error messages
- **Directory Traversal** - File system access vulnerabilities
- **Command Injection** - OS command execution vulnerabilities
- **Path Traversal** - Unauthorized file access

## 🚀 Quick Start

### Prerequisites
- Docker Desktop on Windows, or Docker Engine on Linux/macOS
- Docker Compose / `docker compose`
- Node.js 18+ if you want to run frontend or backend outside Docker
- Git

### 1. Clone the repo
```bash
git clone <your-repo-url>
cd vibe-check
```

### 2. Create `.env`
```bash
cp env.example .env
```

For a first run, you can leave most values unchanged.

### 3. Start the full stack
```bash
docker compose up -d
```

If your machine only supports the older syntax:
```bash
docker-compose up -d
```

### 4. Wait for scanners to start
Give ZAP 30-60 seconds on first startup.

### 5. Verify the stack is ready
```bash
curl http://localhost:3001/health
curl http://localhost:8082/JSON/core/view/version/
curl http://localhost:3001/api/scans/health
```

## 🌐 Access Points

Before you begin, choose a setup mode:

- Beginner path: run the full stack with `docker compose up -d`
- Local app + Docker scanners: run frontend/backend with `npm`, but start `zap`, `trivy`, and `redis` with Docker
- Repo-root `npm run dev`: starts only the frontend and backend. It does **not** start scanner services

Important beginner notes:

- On Windows, open Docker Desktop first and wait until it says Docker is running.
- If Docker is not running, the UI may load but scans can finish with warnings and zero findings because ZAP and Trivy are offline.
- If your backend runs locally instead of inside Docker, use localhost scanner URLs in `.env`:

```bash
ZAP_API_URL=http://localhost:8082
TRIVY_API_URL=http://localhost:8081
REDIS_URL=redis://localhost:6379
```

- Docker-only hostnames like `http://zap:8080` and `http://trivy:8080` work when the backend runs inside Docker, not when it runs directly on your machine.

Recommended first run:

```bash
cp env.example .env
docker compose up -d
```

Wait 30-60 seconds for ZAP to finish starting, then verify:

```bash
curl http://localhost:3001/health
curl http://localhost:8082/JSON/core/view/version/
curl http://localhost:3001/api/scans/health
```

Only start a web scan after those checks succeed.

Once running, you can access:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **ZAP Scanner**: http://localhost:8082 (Web UI)
- **Trivy Scanner**: http://localhost:8081

## 📋 Understanding Scan Policies

Scan policies define how security scans are performed. Think of them as "scanning recipes" that determine:
- **Which tools to use** for testing
- **How thorough the scan should be**
- **How fast the scan runs**
- **What type of vulnerabilities to look for**

### Available Policy Types

#### 🛡️ **Safe Default** (Recommended)
- **Best for**: Production applications, regular security checks
- **Duration**: 20-30 minutes
- **Coverage**: Comprehensive web application testing + dependency scanning
- **Tools**: ZAP (web security) + OSV (dependency vulnerabilities)
- **Speed**: Moderate (120 requests/minute)

#### ⚡ **Quick Scan**
- **Best for**: Development testing, rapid checks
- **Duration**: 10-15 minutes
- **Coverage**: Basic web application testing + dependency scanning
- **Tools**: ZAP (web security) + OSV (dependency vulnerabilities)
- **Speed**: Fast (200 requests/minute)

#### 🔍 **Comprehensive Scan**
- **Best for**: Critical applications, thorough security audits
- **Duration**: 30-45 minutes
- **Coverage**: Deep web application testing + dependency scanning
- **Tools**: ZAP (web security) + OSV (dependency vulnerabilities)
- **Speed**: Thorough (80 requests/minute, deeper crawling)

#### 📦 **Dependency Check**
- **Best for**: Quick package vulnerability checks
- **Duration**: 2-5 minutes
- **Coverage**: Only dependency/package scanning
- **Tools**: OSV (dependency vulnerabilities only)
- **Speed**: Very fast

#### 🛡️ **All Scans Use Passive Mode (Non-Intrusive)**
- **Best for**: All environments including production
- **Duration**: 15-20 minutes
- **Coverage**: Web application discovery + passive analysis only
- **Tools**: ZAP (spider + passive scanning only, no active tests)
- **Speed**: Moderate (120 requests/minute)
- **Safety**: ✅ Safe for production - no intrusive testing

### Policy Settings Explained

- **Max Requests Per Minute**: How many requests the scanner sends to your application per minute
  - Lower = Slower scan, less impact on your application
  - Higher = Faster scan, more impact on your application

- **Spider Depth**: How deep the scanner crawls into your application
  - Depth 1 = Only main pages
  - Depth 5 = Main pages + 4 levels of links
  - Depth 10 = Very thorough crawling

- **Scan Mode**: Always "Passive" - non-intrusive scanning that doesn't damage your application

### Choosing the Right Policy

#### 🎯 **For Production Applications**
- **Use**: Safe Default or Comprehensive Scan
- **Why**: Thorough testing without overwhelming your application
- **Expected Results**: 200-800+ vulnerabilities found

#### 🚀 **For Development & Testing**
- **Use**: Quick Scan
- **Why**: Fast feedback during development
- **Expected Results**: 50-200 vulnerabilities found

#### 🔒 **For Critical Applications**
- **Use**: Comprehensive Scan
- **Why**: Deep security analysis for high-risk applications
- **Expected Results**: 500-1000+ vulnerabilities found

#### 📦 **For Package/Dependency Checks**
- **Use**: Dependency Check
- **Why**: Quick check for known vulnerabilities in dependencies
- **Expected Results**: 10-50 dependency vulnerabilities found

### Policy Customization

You can create custom policies by adjusting:
- **Tools**: Choose which security tools to use (ZAP, OSV, etc.)
- **Speed**: Adjust requests per minute (50-300)
- **Depth**: Set spider depth (1-10 levels)
- **Mode**: Always "Passive" (non-intrusive) - ensures safe scanning for your application
- **URL Exclusions**: Exclude sensitive endpoints using wildcard patterns (e.g., `/api/admin/*`, `*/payment/*`)

## 🔑 API Keys Setup

### Essential (Free)
- **Semgrep**: Sign up at https://semgrep.dev/ (free tier)
  - Get API key from Settings → API Tokens
  - Add to `.env`: `SEMGREP_API_KEY=your_key_here`

### Optional (For Better Rate Limits)
- **GitHub Token**: Personal access token from GitHub
  - Go to GitHub Settings → Developer settings → Personal access tokens
  - Create token with `repo` and `security_events` scopes
  - Add to `.env`: `GITHUB_TOKEN=your_token_here`

## 🛡️ Security Tools & Capabilities

### Primary Scanning Engine
- **OWASP ZAP (Zed Attack Proxy)** - Comprehensive web application security testing
  - **Spider Crawling**: Discovers all URLs and endpoints on target applications
  - **Active Scanning**: Performs automated vulnerability testing with 100+ security rules
  - **Passive Scanning**: Analyzes traffic for security issues in real-time
  - **Scan Duration**: 20-30 minutes for comprehensive coverage
  - **Vulnerability Detection**: SQL injection, XSS, CSRF, SSRF, authentication bypass, and more

### Dependency & Component Analysis
- **OSV.dev** - Open source vulnerability database for dependency scanning
  - Scans package.json, requirements.txt, and other dependency files
  - Maps vulnerabilities to CVEs and security advisories
  - Provides remediation recommendations

### Container & Infrastructure Scanning
- **Trivy** - Container and filesystem vulnerability scanner
  - Scans Docker images for known vulnerabilities
  - Filesystem security analysis
  - Infrastructure as Code (IaC) scanning

### Why We Continue Using Trivy

We reviewed the March 2026 Trivy incident and chose to continue using Trivy in this repository rather than replace it with a different scanner.

- The incident was primarily a supply-chain compromise of specific release artifacts and GitHub Action distribution paths, not evidence that Trivy's scanning engine was no longer viable.
- This repository uses Trivy as an application-integrated scanner service and does not rely on the compromised GitHub Actions wrappers as part of its normal local runtime.
- Replacing Trivy would add migration risk across backend services, deployment manifests, policy configuration, and documentation without a clear security gain if we can instead harden how we consume Trivy.
- Trivy still fits the product surface we want here: container scanning, filesystem scanning, and room for broader infrastructure-oriented checks.

Our decision is to keep Trivy and harden usage:

- Prefer pinned versions or immutable image digests over mutable tags like `latest`.
- Verify release provenance before upgrading scanner images or binaries.
- Review image pull history and rotate secrets if there is any indication affected artifacts were previously executed.
- Treat scanner upgrades as controlled dependency updates, not ambient infrastructure drift.

### Static Analysis (Optional)
- **Semgrep** - Static application security testing (SAST)
  - Code analysis for security vulnerabilities
  - Custom rule support
  - Multiple language support (JavaScript, Python, Java, etc.)

### GitHub Integration
- **GitHub Security APIs** - Repository security analysis
  - Dependabot alerts integration
  - Security advisory scanning
  - Secret detection

## 🏗️ Architecture

### Docker Services
- **frontend** - React application (port 3000)
- **backend** - Express API server (port 3001)
- **zap** - OWASP ZAP scanner (port 8082)
- **trivy** - Trivy vulnerability scanner (port 8081)
- **redis** - Job queue and caching (port 6379)

### Project Structure
```
vibe-check/
├── backend/                 # Backend API server
│   ├── src/
│   │   ├── services/        # Security tool integrations
│   │   ├── routes/          # API endpoints
│   │   └── server.ts        # Main server
│   └── package.json
├── src/                     # Frontend React app
│   ├── api/                 # API client
│   ├── hooks/               # React hooks
│   ├── components/          # UI components
│   └── pages/               # Page components
├── docker-compose.yml       # Multi-container setup
├── Dockerfile.frontend      # Frontend container
├── Dockerfile.backend       # Backend container
└── scripts/dev.sh           # Development startup script
```

## 🔧 Development Commands

### Start All Services
```bash
docker compose up -d
```

### View Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f zap
```

### Stop Services
```bash
docker compose down
```

### Rebuild Containers
```bash
docker compose up --build -d
```

### Backend Development
```bash
cd backend
npm install
npm run dev
```

### Frontend Development
```bash
npm install
npm run dev:frontend
```

### Frontend + Backend Only
```bash
npm run dev
```

This does not start ZAP, Trivy, or Redis.

## 🧪 Testing API Connections

Test that all security tools are working:

```bash
# Test ZAP connection
curl http://localhost:3001/api/scans/test/zap

# Test OSV connection
curl http://localhost:3001/api/scans/test/osv

# Test GitHub Security (if token provided)
curl http://localhost:3001/api/scans/test/github

# Test Trivy connection
curl http://localhost:3001/api/scans/test/trivy

# Test combined scanner readiness
curl http://localhost:3001/api/scans/health
```

## 🔒 Security Features

### Consent & Safety Gates
- **Ownership Attestation**: Users must confirm authorization to test targets
- **Scope Definition**: Testing limited to declared scope
- **Passive Mode Only**: All scans use non-intrusive passive scanning with rate limiting

### Audit Trail
- Immutable audit logs of all scan activities
- User action tracking with timestamps
- Scan configuration snapshots

### Data Protection
- PII redaction in logs and evidence
- Encrypted evidence storage
- Secure API key management

## 📊 Features & Performance

### Scan Capabilities
- **Multi-Target Support**: Web apps, APIs, repositories
- **Policy Management**: Configurable scan policies with non-intrusive passive scanning
- **Passive-Only Mode**: All scans use non-intrusive passive scanning - safe for production environments
- **URL Exclusions**: Exclude sensitive endpoints from scanning using wildcard patterns
- **Real-time Monitoring**: Live scan status updates with progress tracking
- **Comprehensive Coverage**: 15-20 minute scans discovering security issues through passive analysis
- **OWASP Top 10 Mapping**: Automatic vulnerability categorization
- **Report Generation**: PDF/CSV exports with compliance mapping
- **CI/CD Integration**: Webhook support for automated scans

### Scan Performance
- **Typical Results**: 200-800+ vulnerabilities found per comprehensive scan
- **Scan Duration**: 20-30 minutes for thorough coverage
- **URL Discovery**: Spider crawling discovers all application endpoints
- **Vulnerability Types**: SQL injection, XSS, CSRF, authentication bypass, and more
- **Real-time Updates**: Live progress tracking during scans

## 🚀 Production Deployment

### Deployment Options

Vibe Check supports multiple deployment strategies:

1. **Google Cloud Run** (Simple, serverless)
   - See [GCP_DEPLOYMENT_GUIDE.md](./GCP_DEPLOYMENT_GUIDE.md) for detailed instructions
   - Best for: Quick deployment, auto-scaling, cost-effective

2. **Hybrid Deployment** (Cloud Run + GKE)
   - See [HYBRID_DEPLOYMENT_GUIDE.md](./HYBRID_DEPLOYMENT_GUIDE.md) for detailed instructions
   - Best for: Production environments requiring persistent storage and long-running scans

3. **Local Development**
   - See [LOCAL_TESTING_GUIDE.md](./LOCAL_TESTING_GUIDE.md) for testing and development
   - Best for: Development, testing new features, local scanning

### Quick Deployment (Cloud Run)
```bash
# Set your project ID
export PROJECT_ID=your-project-id

# Deploy using the automated script
chmod +x deploy-gcp.sh
PROJECT_ID=your-project-id ./deploy-gcp.sh
```

### Environment Variables for Production
```bash
NODE_ENV=production
FRONTEND_URL=https://your-domain.com
DATABASE_URL=postgresql://user:pass@host:port/db
REDIS_URL=redis://your-redis-host:6379
```

**Note**: For production deployments, store sensitive API keys in Google Secret Manager. See `setup-secrets.sh` for setup instructions.

## 🐛 Troubleshooting

### Common Issues

**Services not starting:**
```bash
# Check Docker is running
docker info

# Check service status
docker compose ps

# View service logs
docker compose logs [service-name]
```

**API connection errors:**
```bash
# Test backend health
curl http://localhost:3001/health

# Check ZAP is running
curl http://localhost:8082/JSON/core/view/version/

# Check backend scanner readiness
curl http://localhost:3001/api/scans/health
```

**Scans finish quickly with 0 findings:**
```bash
curl http://localhost:3001/api/scans/health
```

That usually means scanner services are offline or unreachable. If your backend runs locally, make sure `.env` uses `localhost:8082` and `localhost:8081` rather than Docker hostnames.

**Port conflicts:**
```bash
# Check what's using ports
netstat -tulpn | grep :3000
netstat -tulpn | grep :3001
netstat -tulpn | grep :8082
```

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📚 Additional Documentation

- **[Local Testing Guide](./LOCAL_TESTING_GUIDE.md)** - Comprehensive guide for local development and testing
- **[GCP Deployment Guide](./GCP_DEPLOYMENT_GUIDE.md)** - Step-by-step Google Cloud Run deployment
- **[Hybrid Deployment Guide](./HYBRID_DEPLOYMENT_GUIDE.md)** - Cloud Run + GKE hybrid deployment
- **[Scan Capability Assessment](./SCAN_CAPABILITY_ASSESSMENT.md)** - Detailed analysis of scanning capabilities
- **[Security Tools Implementation](./SECURITY_TOOLS_IMPLEMENTATION.md)** - Technical details on security tool integrations

## 📞 Support

For issues and questions:
- Create an issue in the repository
- Check the troubleshooting section above
- Review the documentation guides listed above

# Local Testing Guide

This guide will help you run Vibe Check locally to test the features:
- ✅ OWASP Top 10 mapping
- ✅ Non-intrusive passive scanning
- ✅ URL exclusion patterns
- ✅ Loading indicators and timeout detection

## 🚀 Quick Start (Recommended - Docker Compose)

### Prerequisites
- **Docker Desktop** (Windows) or **Docker** (Linux/Mac)
- **Node.js 18+** (for local development if not using Docker)
- **Git**

### Step 1: Setup Environment

```powershell
# Navigate to project directory
cd "c:\Path\to\your\project"

# Create .env file from template (if it doesn't exist)
if (!(Test-Path .env)) {
    Copy-Item env.example .env
    Write-Host "✅ Created .env file - you can edit it later if needed"
}
```

**Note:** The `.env` file is optional for basic testing. You can test with:
- ✅ ZAP (works without API keys)
- ✅ OSV (works without API keys)
- ✅ Trivy (works without API keys)
- ⚠️ Semgrep (requires free API key - optional)
- ⚠️ GitHub (requires token - optional)

### Step 2: Start Services with Docker Compose

```powershell
# Start all services (frontend, backend, ZAP, Trivy, Redis)
docker-compose up -d

# Or use the dev script (if on Linux/Mac)
# chmod +x scripts/dev.sh
# ./scripts/dev.sh
```

**Wait 30-60 seconds** for all services to start up, especially ZAP which takes a moment to initialize.

### Step 3: Verify Services Are Running

```powershell
# Check if containers are running
docker-compose ps

# Test backend health
curl http://localhost:3001/health

# Test ZAP (should return version info)
curl http://localhost:8082/JSON/core/view/version/
```

### Step 4: Access the Application

- **Frontend UI**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **ZAP Web UI**: http://localhost:8082 (optional - for debugging)

## 🧪 Testing the New Features

### Test 1: Non-Intrusive Passive Scanning

1. **Open Frontend**: http://localhost:3000
2. **Navigate to**: Targets page → Select a target → Click "Run Scan"
3. **Select Policy**: Choose any policy (all use passive scanning)
4. **Verify**:
   - ✅ Policy details show "🛡️ Passive (Non-Intrusive)" badge
   - ✅ Green info box says "Safe for production"
   - ✅ All scans use non-intrusive passive scanning only

### Test 2: URL Exclusions

1. **Create a Policy with Exclusions**:
   - Go to Policies page
   - Click "Add Policy"
   - Add exclusion patterns like:
     - `/api/admin/*`
     - `*/payment/*`
   - Save the policy

2. **Run a Scan**:
   - Use the policy with exclusions
   - Check console logs for "Filtered X alerts based on exclusions"

### Test 3: OWASP Top 10 Mapping

1. **Run a Scan**:
   - Use a test target like `http://testphp.vulnweb.com`
   - Wait for scan to complete

2. **Check Findings**:
   - **Option 1**: Click on any summary card (e.g., "15 Medium Findings") on the Dashboard to navigate to Findings page
   - **Option 2**: Use the sidebar to navigate to "Findings" page
   - Click on any finding row to open detailed view
   - Verify OWASP Top 10 tags are displayed (e.g., `A03` for SQL injection)
   - Tags appear as purple badges in the finding details modal

### Test 4: Loading Indicators & Timeout Detection

1. **Start a Scan**:
   - Use "Comprehensive Scan" policy (longer duration)
   - Watch for:
     - ✅ Spinner when starting scan
     - ✅ Progress bar with shimmer animation
     - ✅ Real-time progress updates

2. **Test Timeout Detection**:
   - If a scan runs longer than 1.5x estimated duration
   - You should see:
     - ⚠️ Yellow timeout warning in scan progress
     - Browser notification (if supported)

## 🔧 Alternative: Run Without Docker (Development Mode)

If you prefer to run frontend/backend separately:

### Terminal 1: Backend

```powershell
cd backend
npm install
npm run dev
# Backend runs on http://localhost:3001
```

### Terminal 2: Frontend

```powershell
# In project root
npm install
npm run dev
# Frontend runs on http://localhost:3000
```

### Terminal 3: Start Only Required Services

```powershell
# Start just ZAP, Trivy, and Redis
docker-compose up zap trivy redis -d
```

**Note**: You'll need to update `.env` to point to `http://localhost:8082` for ZAP instead of `http://zap:8080`.

## 🐛 Troubleshooting

### Issue: "Cannot connect to ZAP"

**Solution**:
```powershell
# Check if ZAP container is running
docker-compose ps

# Check ZAP logs
docker-compose logs zap

# Restart ZAP
docker-compose restart zap

# Wait 60 seconds for ZAP to fully start
```

### Issue: "Backend not responding"

**Solution**:
```powershell
# Check backend logs
docker-compose logs backend

# Restart backend
docker-compose restart backend

# Or if running locally
cd backend
npm run dev
```

### Issue: "Frontend can't connect to backend"

**Solution**:
- Check that backend is running on port 3001
- Verify `REACT_APP_API_URL` in frontend environment
- Check browser console for CORS errors

### Issue: "Port already in use"

**Solution**:
```powershell
# Find what's using the port (Windows)
netstat -ano | findstr :3000
netstat -ano | findstr :3001

# Stop the process or change ports in docker-compose.yml
```

## 📝 Test Scenarios

### Scenario 1: Quick Test (5 minutes)
1. Start services: `docker-compose up -d`
2. Open http://localhost:3000
3. Create a target with URL: `http://testphp.vulnweb.com`
4. Run "Quick Scan" policy
5. Verify findings appear with OWASP tags

### Scenario 2: Passive Scanning Test (10 minutes)
1. Select any policy (all use passive scanning)
2. Run scan on a test target
3. Verify:
   - Only spider + passive scanning occurs
   - Non-intrusive findings only
   - Green badge shows "Passive mode active"

### Scenario 3: Exclusions Test (10 minutes)
1. Create policy with exclusions: `/api/admin/*`, `*/test/*`
2. Run scan
3. Check console logs for filtering messages
4. Verify excluded URLs don't appear in findings

### Scenario 4: Timeout Detection (15+ minutes)
1. Run "Comprehensive Scan" (30+ min estimated)
2. Let it run past estimated time
3. Verify timeout warning appears
4. Check for browser notifications

## 📍 Finding Details Navigation

### How to View Finding Details

**From Dashboard Summary Cards:**
1. Click on any summary card (e.g., "15 Medium Findings", "0 Critical Findings")
2. You'll be taken to the Findings page with that filter applied
3. Click on any finding row to see full details

**From Findings Page:**
1. Navigate to "Findings" in the sidebar
2. Use the filter dropdowns to filter by severity or status
3. Click on any finding row to open the detailed modal
4. The modal shows:
   - Full description and analysis
   - Recommendations
   - OWASP Top 10 tags (as purple badges)
   - Scan configuration details
   - Target and tool information

## 🎯 What to Look For

### ✅ Success Indicators

1. **OWASP Mapping**:
   - Findings have OWASP Top 10 tags displayed as purple badges
   - Tags match vulnerability types (A03 for injection, A06 for dependencies, etc.)
   - Tags appear in the finding details modal

2. **Passive Mode**:
   - Console shows "Passive scanning enabled - analyzing discovered URLs without intrusive testing"
   - No intrusive test payloads sent
   - Safe for production environments

3. **Exclusions**:
   - Console shows "Filtered X alerts based on exclusions"
   - Excluded URLs don't appear in findings

4. **Loading States**:
   - Spinner appears when starting scan
   - Progress bar animates during scan
   - Status updates every 3 seconds

5. **Timeout Detection**:
   - Yellow warning appears after 1.5x estimated time
   - Alert message explains the timeout

## 🔍 Debugging Tips

### View Logs

```powershell
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f zap

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Check API Endpoints

```powershell
# Test backend health
curl http://localhost:3001/health

# Test ZAP connection
curl http://localhost:3001/api/scans/test/zap

# Get policies
curl http://localhost:3001/api/policies
```

### Browser DevTools

- **Console**: Check for errors and scan status updates
- **Network Tab**: Monitor API calls to `/api/scans`
- **React DevTools**: Inspect component state

## 🛑 Stopping Services

```powershell
# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v

# Stop but keep containers
docker-compose stop
```

## 📚 Next Steps

After testing locally:

1. **Verify all features work**:
   - [ ] Passive mode uses non-intrusive scanning only
   - [ ] Exclusions filter findings correctly
   - [ ] OWASP tags appear in findings
   - [ ] Loading indicators show properly
   - [ ] Timeout warnings appear when appropriate

2. **Test with real targets** (with permission):
   - Your own applications
   - Staging environments
   - Test applications

3. **Review findings**:
   - Check OWASP tag accuracy
   - Verify exclusion patterns work
   - Confirm passive mode findings are appropriate

## 💡 Quick Reference

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:3000 | Main UI |
| Backend API | http://localhost:3001 | REST API |
| ZAP Scanner | http://localhost:8082 | Web security testing |
| Trivy | http://localhost:8081 | Container scanning |

| Command | Purpose |
|---------|---------|
| `docker-compose up -d` | Start all services |
| `docker-compose down` | Stop all services |
| `docker-compose logs -f` | View live logs |
| `docker-compose ps` | Check service status |
| `docker-compose restart backend` | Restart backend only |

Happy testing! 🎉

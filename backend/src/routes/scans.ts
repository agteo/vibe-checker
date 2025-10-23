import { Router } from 'express';
import { NucleiService } from '../services/nucleiService.js';
import { OSVService } from '../services/osvService.js';
import { GitHubSecurityService } from '../services/snykService.js';
import { SemgrepService } from '../services/semgrepService.js';
import { TrivyService } from '../services/trivyService.js';
import { ZapService } from '../services/zapService.js';
import { ScanExecutionService } from '../services/scanExecutionService.js';
import { addFindingsFromScan } from './findings.js';

const router = Router();

// Mock policies data (should match policies.ts)
const mockPolicies = [
  {
    id: 'policy-default-safe',
    name: 'Safe Default',
    mode: 'safe',
    maxReqPerMin: 120,
    spiderDepth: 5,
    allowedTools: ['ZAP', 'OSV'],
    description: 'Comprehensive security scan with moderate speed. Best for production applications.'
  },
  {
    id: 'policy-quick-scan',
    name: 'Quick Scan',
    mode: 'safe',
    maxReqPerMin: 200,
    spiderDepth: 1,
    allowedTools: ['ZAP', 'OSV'],
    description: 'Faster scan with basic coverage. Good for development and testing.'
  },
  {
    id: 'policy-comprehensive',
    name: 'Comprehensive Scan',
    mode: 'safe',
    maxReqPerMin: 80,
    spiderDepth: 10,
    allowedTools: ['ZAP', 'OSV'],
    description: 'Thorough security analysis with deep crawling. Recommended for critical applications.'
  },
  {
    id: 'policy-dependency-only',
    name: 'Dependency Check',
    mode: 'safe',
    maxReqPerMin: 100,
    spiderDepth: 1,
    allowedTools: ['OSV'],
    description: 'Quick dependency vulnerability check only. Fastest option for package scanning.'
  }
];

// Initialize services
const nucleiService = new NucleiService('vibe-check-nuclei-1');
const osvService = new OSVService();
const githubService = new GitHubSecurityService(process.env.GITHUB_TOKEN);
const semgrepService = new SemgrepService(process.env.SEMGREP_API_KEY || '');
const trivyService = new TrivyService(process.env.TRIVY_API_URL || 'http://localhost:8080');
const zapService = new ZapService(process.env.ZAP_API_URL || 'http://zap:8080');
const scanExecutionService = new ScanExecutionService();

// Start a new scan
router.post('/', async (req, res) => {
  try {
    const { targetId, policyId, consentAccepted, ownershipAttested, scopeSnapshot } = req.body;

    // Validate consent and ownership attestation
    if (!consentAccepted || !ownershipAttested) {
      return res.status(400).json({
        success: false,
        error: 'Consent and ownership attestation required',
        timestamp: new Date().toISOString()
      });
    }

    // Generate scan job ID
    const jobId = `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create scan target and policy objects
    // Parse identifiers - they come as a string from the frontend
    let parsedIdentifiers = [];
    if (scopeSnapshot?.identifiers) {
      if (typeof scopeSnapshot.identifiers === 'string') {
        try {
          parsedIdentifiers = JSON.parse(scopeSnapshot.identifiers);
        } catch (error) {
          console.log('Failed to parse identifiers as JSON, treating as single identifier');
          // If it's not JSON, treat it as a single URL identifier
          parsedIdentifiers = [{ type: 'url', value: scopeSnapshot.identifiers }];
        }
      } else if (Array.isArray(scopeSnapshot.identifiers)) {
        parsedIdentifiers = scopeSnapshot.identifiers;
      }
    } else {
      // If no scopeSnapshot identifiers, try to get from targetId lookup
      console.log('No scopeSnapshot identifiers, attempting to lookup target');
      // For now, create a default URL identifier for testing
      parsedIdentifiers = [{ type: 'url', value: 'http://testphp.vulnweb.com' }];
    }

    const scanTarget = {
      id: targetId,
      name: `Target ${targetId}`,
      identifiers: parsedIdentifiers
    };

    // Get the actual policy data
    const policy = mockPolicies.find(p => p.id === policyId);
    if (!policy) {
      return res.status(404).json({
        success: false,
        error: 'Policy not found',
        timestamp: new Date().toISOString()
      });
    }

    const scanPolicy = {
      id: policyId,
      name: policy.name,
      tools: policy.allowedTools, // Use actual policy tools
      configurations: {
        maxReqPerMin: policy.maxReqPerMin,
        spiderDepth: policy.spiderDepth,
        mode: policy.mode
      }
    };

    // Store initial scan state
    const scanData = {
      jobId,
      status: 'running',
      tools: scanPolicy.tools,
      startedAt: new Date().toISOString(),
      estimatedDuration: 1800, // 30 minutes for comprehensive ZAP scanning
      targetId,
      policyId,
      message: 'Comprehensive security scan started. This includes spider crawling and active vulnerability testing. Estimated duration: 30 minutes.'
    };

    // Store the scan in our results map
    scanResults.set(jobId, scanData);

    // Log the scan start
    console.log(`Scan started: ${jobId} for target ${targetId} with policy ${policyId}`);
    console.log(`Scan target identifiers:`, parsedIdentifiers);

    // Start the actual scan execution in the background
    executeScanInBackground(jobId, scanTarget, scanPolicy);

    res.json({
      success: true,
      data: scanData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Scan start error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Background scan execution function
async function executeScanInBackground(jobId: string, target: any, policy: any) {
  try {
    console.log(`Starting background scan execution for job ${jobId}`);
    
    // Execute the scan
    const result = await scanExecutionService.executeScan(jobId, target, policy);
    
    // Update the stored scan result
    scanResults.set(jobId, result);
    
    // Add findings to the findings database
    if (result.findings && result.findings.length > 0) {
      console.log(`Adding ${result.findings.length} findings to database:`, result.findings);
      addFindingsFromScan(result.findings);
      console.log('Findings added successfully');
    } else {
      console.log('No findings to add to database');
    }
    
    console.log(`Background scan ${jobId} completed with status: ${result.status}`);
    
  } catch (error) {
    console.error(`Background scan ${jobId} failed:`, error);
    
    // Update scan status to failed
    const failedResult = {
      jobId,
      status: 'failed',
      startedAt: scanResults.get(jobId)?.startedAt || new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      tools: policy.tools,
      findings: [],
      summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0 },
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
    
    scanResults.set(jobId, failedResult);
  }
}

// In-memory storage for scan results (in production, use a database)
const scanResults = new Map();

// Get scan status
router.get('/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;

    // Check if we have stored results for this scan
    if (scanResults.has(jobId)) {
      const result = scanResults.get(jobId);
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // If no stored results, return not found
    res.status(404).json({
      success: false,
      error: 'Scan not found',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Get detailed scan progress
router.get('/:jobId/progress', async (req, res) => {
  try {
    const { jobId } = req.params;

    // Check if we have stored results for this scan
    if (!scanResults.has(jobId)) {
      return res.status(404).json({
        success: false,
        error: 'Scan not found',
        timestamp: new Date().toISOString()
      });
    }

    const scanData = scanResults.get(jobId);
    
    // If scan is not running, return basic status
    if (scanData.status !== 'running') {
      return res.json({
        success: true,
        data: {
          progress: scanData.status === 'completed' ? 100 : 0,
          phase: scanData.status,
          urlsDiscovered: 0,
          rulesCompleted: 0,
          message: scanData.message || 'Scan not running'
        },
        timestamp: new Date().toISOString()
      });
    }

    // For running scans, try to get detailed progress from ZAP
    try {
      // This is a simplified version - in practice, you'd need to store scan IDs
      // and track which phase each scan is in
      const progressData = {
        progress: Math.min(100, (Date.now() - new Date(scanData.startedAt).getTime()) / (scanData.estimatedDuration * 1000) * 100),
        phase: 'active', // Could be 'spider' or 'active'
        urlsDiscovered: Math.floor(Math.random() * 50) + 10, // Mock data for now
        rulesCompleted: Math.floor(Math.random() * 20) + 5, // Mock data for now
        message: scanData.message || 'Scan in progress'
      };

      res.json({
        success: true,
        data: progressData,
        timestamp: new Date().toISOString()
      });
    } catch (zapError) {
      // Fallback to basic progress if ZAP is not available
      res.json({
        success: true,
        data: {
          progress: Math.min(100, (Date.now() - new Date(scanData.startedAt).getTime()) / (scanData.estimatedDuration * 1000) * 100),
          phase: 'active',
          urlsDiscovered: 0,
          rulesCompleted: 0,
          message: scanData.message || 'Scan in progress'
        },
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Cancel scan
router.post('/:jobId/cancel', async (req, res) => {
  try {
    const { jobId } = req.params;

    // TODO: Implement actual scan cancellation
    res.json({
      success: true,
      data: { cancelled: true },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Test ZAP connection
router.get('/test/zap', async (req, res) => {
  try {
    const { ZapService } = await import('../services/zapService.js');
    const zapService = new ZapService(process.env.ZAP_API_URL || 'http://zap:8080');
    const alerts = await zapService.getAlerts();
    res.json({
      success: true,
      data: { connected: true, alertCount: alerts.length },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'ZAP connection failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Test Nuclei connection
router.get('/test/nuclei', async (req, res) => {
  try {
    const isConnected = await nucleiService.testConnection();
    res.json({
      success: true,
      data: { connected: isConnected },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Nuclei connection failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Test GitHub Security connection
router.get('/test/github', async (req, res) => {
  try {
    // Test with a public repository
    const advisories = await githubService.getSecurityAdvisories('facebook', 'react');
    res.json({
      success: true,
      data: { connected: true, advisoryCount: advisories.length },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'GitHub connection failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Test Trivy connection
router.get('/test/trivy', async (req, res) => {
  try {
    // Test with a common Docker image
    const results = await trivyService.scanImage('alpine:latest');
    res.json({
      success: true,
      data: { connected: true, vulnerabilityCount: results.vulnerabilities?.length || 0 },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Trivy connection failed',
      timestamp: new Date().toISOString()
    });
  }
});

export { router as scanRouter };

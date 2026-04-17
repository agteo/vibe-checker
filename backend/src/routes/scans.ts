import { Router, type Request, type Response } from 'express';
import { OSVService } from '../services/osvService.js';
import { GitHubSecurityService } from '../services/snykService.js';
import { TrivyService } from '../services/trivyService.js';
import { ZapService } from '../services/zapService.js';
import { ScanExecutionService } from '../services/scanExecutionService.js';
import { addFindingsFromScan } from './findings.js';
import { dataStore, type PersistedScan } from '../services/dataStore.js';

const router = Router();

const osvService = new OSVService();
const githubService = new GitHubSecurityService(process.env.GITHUB_TOKEN);
const trivyService = new TrivyService(process.env.TRIVY_API_URL || 'http://localhost:8080');
const zapService = new ZapService(process.env.ZAP_API_URL || 'http://zap:8080');
const scanExecutionService = new ScanExecutionService();

const runningScans = new Set<string>();

async function getScannerHealth() {
  const [zap, osv, trivy] = await Promise.all([
    (async () => {
      try {
        const version = await zapService.getVersion();
        return { available: true, version };
      } catch (error) {
        return { available: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    })(),
    (async () => {
      try {
        const results = await osvService.queryVulnerabilities({
          name: 'react',
          version: '18.2.0',
          ecosystem: 'npm',
        });
        return { available: true, sampleCount: results.length };
      } catch (error) {
        return { available: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    })(),
    (async () => {
      try {
        const version = await trivyService.getVersion();
        return { available: true, version };
      } catch (error) {
        return { available: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    })(),
  ]);

  return {
    overallReady: zap.available || osv.available || trivy.available,
    zap,
    osv,
    trivy,
  };
}

function estimateDurationSeconds(tools: string[], health: Awaited<ReturnType<typeof getScannerHealth>>) {
  let seconds = 30;

  if (tools.includes('ZAP')) {
    seconds += health.zap.available ? 8 * 60 : 45;
  }
  if (tools.includes('OSV')) {
    seconds += health.osv.available ? 90 : 20;
  }
  if (tools.includes('Trivy')) {
    seconds += health.trivy.available ? 4 * 60 : 30;
  }
  if (tools.includes('Semgrep') || tools.includes('GitHub')) {
    seconds += 2 * 60;
  }

  return seconds;
}

function buildScanMessage(tools: string[], health: Awaited<ReturnType<typeof getScannerHealth>>, estimatedDuration: number) {
  const issues: string[] = [];

  if (tools.includes('ZAP') && !health.zap.available) {
    issues.push('ZAP is offline');
  }
  if (tools.includes('Trivy') && !health.trivy.available) {
    issues.push('Trivy is offline');
  }
  if (tools.includes('OSV') && !health.osv.available) {
    issues.push('OSV is unreachable');
  }

  const estimatedMinutes = Math.max(1, Math.ceil(estimatedDuration / 60));

  if (issues.length > 0) {
    return `Preflight warning: ${issues.join(', ')}. This scan may finish quickly with partial coverage or no findings. Estimated time: about ${estimatedMinutes} minute${estimatedMinutes === 1 ? '' : 's'}.`;
  }

  return `Scan started. Estimated time: about ${estimatedMinutes} minute${estimatedMinutes === 1 ? '' : 's'} based on the selected tools.`;
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const state = await dataStore.getState();
    const scans = [...state.scans].sort((left, right) =>
      new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime()
    );

    res.json({
      success: true,
      data: scans,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

router.get('/health', async (_req: Request, res: Response) => {
  try {
    const health = await getScannerHealth();
    res.json({
      success: true,
      data: health,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { targetId, policyId, consentAccepted, ownershipAttested, scopeSnapshot } = req.body;

    if (!consentAccepted || !ownershipAttested) {
      return res.status(400).json({
        success: false,
        error: 'Consent and ownership attestation required',
        timestamp: new Date().toISOString(),
      });
    }

    const state = await dataStore.getState();
    const target = state.targets.find((entry) => entry.id === targetId);
    const policy = state.policies.find((entry) => entry.id === policyId);

    if (!policy) {
      return res.status(404).json({
        success: false,
        error: 'Policy not found',
        timestamp: new Date().toISOString(),
      });
    }

    let parsedIdentifiers = [];
    if (scopeSnapshot?.identifiers) {
      if (typeof scopeSnapshot.identifiers === 'string') {
        try {
          parsedIdentifiers = JSON.parse(scopeSnapshot.identifiers);
        } catch {
          parsedIdentifiers = [{ type: 'url', value: scopeSnapshot.identifiers }];
        }
      } else if (Array.isArray(scopeSnapshot.identifiers)) {
        parsedIdentifiers = scopeSnapshot.identifiers;
      }
    } else if (target?.identifiers) {
      try {
        parsedIdentifiers = JSON.parse(target.identifiers);
      } catch {
        parsedIdentifiers = [{ type: 'url', value: target.identifiers }];
      }
    }

    const scanTarget = {
      id: targetId,
      name: target?.name || `Target ${targetId}`,
      identifiers: parsedIdentifiers,
    };

    const scanPolicy = {
      id: String(policy.id),
      name: String(policy.name),
      tools: Array.isArray(policy.allowedTools) ? policy.allowedTools.map(String) : [],
      configurations: {
        maxReqPerMin: policy.maxReqPerMin,
        spiderDepth: policy.spiderDepth,
        mode: policy.mode,
        exclusions: Array.isArray(policy.exclusions) ? policy.exclusions : [],
      },
    };

    const jobId = `scan_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const scannerHealth = await getScannerHealth();
    const estimatedDuration = estimateDurationSeconds(scanPolicy.tools, scannerHealth);
    const message = buildScanMessage(scanPolicy.tools, scannerHealth, estimatedDuration);
    const scanData: PersistedScan = {
      id: jobId,
      jobId,
      status: 'running',
      tools: scanPolicy.tools,
      startedAt: new Date().toISOString(),
      estimatedDuration,
      targetId,
      policyId,
      message,
    };

    await dataStore.update((draft) => {
      draft.scans.unshift(scanData);
      if (target) {
        const targetIndex = draft.targets.findIndex((entry) => entry.id === target.id);
        if (targetIndex !== -1) {
          draft.targets[targetIndex].lastScanAt = scanData.startedAt;
        }
      }
    });

    await dataStore.appendAuditLog('scan.started', 'scan', jobId, {
      targetId,
      policyId,
      tools: scanPolicy.tools,
      scannerHealth,
    });

    void executeScanInBackground(jobId, scanTarget, scanPolicy);

    res.json({
      success: true,
      data: scanData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Scan start error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

router.get('/test/zap', async (_req: Request, res: Response) => {
  try {
    const version = await zapService.getVersion();
    res.json({
      success: true,
      data: { connected: true, version },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'ZAP connection failed',
      timestamp: new Date().toISOString(),
    });
  }
});

router.get('/test/osv', async (_req: Request, res: Response) => {
  try {
    const results = await osvService.queryVulnerabilities({
      name: 'react',
      version: '18.2.0',
      ecosystem: 'npm',
    });
    res.json({
      success: true,
      data: { connected: true, vulnerabilityCount: results.length },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'OSV connection failed',
      timestamp: new Date().toISOString(),
    });
  }
});

router.get('/test/github', async (_req: Request, res: Response) => {
  try {
    const advisories = await githubService.getSecurityAdvisories('facebook', 'react');
    res.json({
      success: true,
      data: { connected: true, advisoryCount: advisories.length },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'GitHub connection failed',
      timestamp: new Date().toISOString(),
    });
  }
});

router.get('/test/trivy', async (_req: Request, res: Response) => {
  try {
    const version = await trivyService.getVersion();
    res.json({
      success: true,
      data: { connected: true, version },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Trivy connection failed',
      timestamp: new Date().toISOString(),
    });
  }
});

router.get('/:jobId', async (req: Request, res: Response) => {
  try {
    const state = await dataStore.getState();
    const result = state.scans.find((scan) => scan.jobId === req.params.jobId);
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Scan not found',
        timestamp: new Date().toISOString(),
      });
    }

    return res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

router.get('/:jobId/progress', async (req: Request, res: Response) => {
  try {
    const state = await dataStore.getState();
    const scanData = state.scans.find((scan) => scan.jobId === req.params.jobId);

    if (!scanData) {
      return res.status(404).json({
        success: false,
        error: 'Scan not found',
        timestamp: new Date().toISOString(),
      });
    }

    if (scanData.status !== 'running') {
      return res.json({
        success: true,
        data: {
          progress: scanData.status === 'completed' ? 100 : 0,
          phase: scanData.status,
          urlsDiscovered: 0,
          rulesCompleted: 0,
          message: scanData.message || 'Scan not running',
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.json({
      success: true,
      data: {
        progress: Math.min(100, ((Date.now() - new Date(scanData.startedAt).getTime()) / ((scanData.estimatedDuration || 1800) * 1000)) * 100),
        phase: 'active',
        urlsDiscovered: 0,
        rulesCompleted: 0,
        message: scanData.message || 'Scan in progress',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

router.post('/:jobId/cancel', async (req: Request, res: Response) => {
  try {
    const state = await dataStore.getState();
    const existingScan = state.scans.find((scan) => scan.jobId === req.params.jobId);

    if (!existingScan) {
      return res.status(404).json({
        success: false,
        error: 'Scan not found',
        timestamp: new Date().toISOString(),
      });
    }

    if (existingScan.status !== 'running' && existingScan.status !== 'queued') {
      return res.status(400).json({
        success: false,
        error: `Scan cannot be cancelled from status ${existingScan.status}`,
        timestamp: new Date().toISOString(),
      });
    }

    const updatedState = await dataStore.update((draft) => {
      const scan = draft.scans.find((entry) => entry.jobId === req.params.jobId);
      if (scan) {
        scan.status = 'cancelled';
        scan.finishedAt = new Date().toISOString();
        scan.message = 'Scan cancelled by user.';
      }
    });

    runningScans.delete(req.params.jobId);
    await dataStore.appendAuditLog('scan.cancelled', 'scan', req.params.jobId);

    return res.json({
      success: true,
      data: updatedState.scans.find((scan) => scan.jobId === req.params.jobId),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

async function executeScanInBackground(jobId: string, target: any, policy: any) {
  runningScans.add(jobId);

  try {
    const result = await scanExecutionService.executeScan(jobId, target, policy);

    if (!runningScans.has(jobId)) {
      return;
    }

    await dataStore.update((draft) => {
      const scanIndex = draft.scans.findIndex((scan) => scan.jobId === jobId);
      if (scanIndex !== -1) {
        const existingScan = draft.scans[scanIndex];
        const totalFindings = result.summary.total;
        const finalMessage = result.errors && result.errors.length > 0
          ? totalFindings === 0
            ? `Scan completed with scanner errors and no findings. ${result.errors[0]}`
            : `Scan completed with ${totalFindings} findings and some scanner errors.`
          : totalFindings === 0
            ? 'Scan completed with 0 findings.'
            : `Scan completed with ${totalFindings} findings.`;
        const persistedResult: PersistedScan = {
          ...existingScan,
          id: result.jobId,
          ...result,
          targetId: existingScan.targetId,
          policyId: existingScan.policyId,
          message: finalMessage,
        };

        draft.scans[scanIndex] = {
          ...existingScan,
          ...persistedResult,
        };
      }
    });

    if (result.findings.length > 0) {
      await addFindingsFromScan(result.findings);
    }

    await dataStore.appendAuditLog(`scan.${result.status}`, 'scan', jobId, {
      findings: result.summary.total,
      errors: result.errors || [],
    });
  } catch (error) {
    console.error(`Background scan ${jobId} failed:`, error);

    await dataStore.update((draft) => {
      const scan = draft.scans.find((entry) => entry.jobId === jobId);
      if (scan) {
        scan.status = 'failed';
        scan.finishedAt = new Date().toISOString();
        scan.errors = [error instanceof Error ? error.message : 'Unknown error'];
        scan.message = `Scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    });

    await dataStore.appendAuditLog('scan.failed', 'scan', jobId, {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  } finally {
    runningScans.delete(jobId);
  }
}

export { router as scanRouter };

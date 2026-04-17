import { Router, type Request, type Response } from 'express';
import { dataStore } from '../services/dataStore.js';

const router = Router();

export const addFindingsFromScan = async (findings: any[]) => {
  await dataStore.update((draft) => {
    findings.forEach((finding) => {
      const normalizedFinding = {
        ...finding,
        lastSeenAt: finding.lastSeenAt || finding.lastUpdatedAt || new Date().toISOString(),
      };

      const existingIndex = draft.findings.findIndex((existingFinding) => existingFinding.id === finding.id);
      if (existingIndex === -1) {
        draft.findings.push(normalizedFinding);
      } else {
        draft.findings[existingIndex] = {
          ...draft.findings[existingIndex],
          ...normalizedFinding,
          lastSeenAt: new Date().toISOString(),
        };
      }
    });
  });
};

router.get('/', async (req: Request, res: Response) => {
  try {
    const { severity, status, tool, targetId } = req.query;
    const state = await dataStore.getState();
    let filteredFindings = [...state.findings];

    if (severity) {
      filteredFindings = filteredFindings.filter((finding) => finding.severity === severity);
    }
    if (status) {
      filteredFindings = filteredFindings.filter((finding) => finding.status === status);
    }
    if (tool) {
      filteredFindings = filteredFindings.filter((finding) => finding.tool === tool);
    }
    if (targetId) {
      filteredFindings = filteredFindings.filter((finding) => finding.targetId === targetId);
    }

    res.json({
      success: true,
      data: filteredFindings,
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

router.get('/target/:targetId', async (req: Request, res: Response) => {
  try {
    const { targetId } = req.params;
    const state = await dataStore.getState();
    const targetFindings = state.findings.filter((finding) => finding.targetId === targetId);

    res.json({
      success: true,
      data: targetFindings,
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

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const state = await dataStore.getState();
    const finding = state.findings.find((entry) => entry.id === req.params.id);
    if (!finding) {
      return res.status(404).json({
        success: false,
        error: 'Finding not found',
        timestamp: new Date().toISOString(),
      });
    }

    return res.json({
      success: true,
      data: finding,
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

router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, justification } = req.body;
    let updatedFinding: any = null;
    const state = await dataStore.update((draft) => {
      const findingIndex = draft.findings.findIndex((finding) => finding.id === id);
      if (findingIndex === -1) {
        return;
      }

      draft.findings[findingIndex] = {
        ...draft.findings[findingIndex],
        status,
        lastUpdatedAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        justification,
      };
      updatedFinding = draft.findings[findingIndex];
    });

    const findingIndex = state.findings.findIndex((finding) => finding.id === id);
    if (findingIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Finding not found',
        timestamp: new Date().toISOString(),
      });
    }

    await dataStore.appendAuditLog('finding.status.updated', 'finding', id, { status, justification });

    return res.json({
      success: true,
      data: updatedFinding,
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

export { router as findingsRouter };

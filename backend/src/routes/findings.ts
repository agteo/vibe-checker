import { Router, type Request, type Response } from 'express';

const router = Router();
const mockFindings: any[] = [];

export const addFindingsFromScan = (findings: any[]) => {
  findings.forEach((finding) => {
    const existingIndex = mockFindings.findIndex((existingFinding) => existingFinding.id === finding.id);
    if (existingIndex === -1) {
      mockFindings.push(finding);
    } else {
      mockFindings[existingIndex] = finding;
    }
  });
};

router.get('/', (req: Request, res: Response) => {
  try {
    const { severity, status, tool, targetId } = req.query;
    let filteredFindings = [...mockFindings];

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

router.get('/target/:targetId', (req: Request, res: Response) => {
  try {
    const { targetId } = req.params;
    const targetFindings = mockFindings.filter((finding) => finding.targetId === targetId);

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

router.get('/:id', (req: Request, res: Response) => {
  const finding = mockFindings.find((entry) => entry.id === req.params.id);
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
});

router.patch('/:id/status', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, justification } = req.body;

    const findingIndex = mockFindings.findIndex((finding) => finding.id === id);
    if (findingIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Finding not found',
        timestamp: new Date().toISOString(),
      });
    }

    mockFindings[findingIndex] = {
      ...mockFindings[findingIndex],
      status,
      lastUpdatedAt: new Date().toISOString(),
      justification,
    };

    return res.json({
      success: true,
      data: mockFindings[findingIndex],
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

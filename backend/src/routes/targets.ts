import { Router, type Request, type Response } from 'express';

const router = Router();
const mockTargets: any[] = [];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: mockTargets,
    timestamp: new Date().toISOString(),
  });
});

router.get('/:id', (req: Request, res: Response) => {
  const target = mockTargets.find((entry) => entry.id === req.params.id);
  if (!target) {
    return res.status(404).json({
      success: false,
      error: 'Target not found',
      timestamp: new Date().toISOString(),
    });
  }

  return res.json({
    success: true,
    data: target,
    timestamp: new Date().toISOString(),
  });
});

router.post('/', (req: Request, res: Response) => {
  try {
    const { name, type, identifiers, riskTier, tags } = req.body;

    if (!name || !type || !identifiers) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, type, identifiers',
        timestamp: new Date().toISOString(),
      });
    }

    const newTarget = {
      id: `target-${Date.now()}`,
      name,
      type,
      identifiers,
      riskTier: riskTier || 'medium',
      lastScanAt: new Date().toISOString(),
      tags: tags || [],
    };

    mockTargets.push(newTarget);

    return res.status(201).json({
      success: true,
      data: newTarget,
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

router.put('/:id', (req: Request, res: Response) => {
  try {
    const targetIndex = mockTargets.findIndex((entry) => entry.id === req.params.id);
    if (targetIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Target not found',
        timestamp: new Date().toISOString(),
      });
    }

    mockTargets[targetIndex] = {
      ...mockTargets[targetIndex],
      ...req.body,
      id: req.params.id,
    };

    return res.json({
      success: true,
      data: mockTargets[targetIndex],
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

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const targetIndex = mockTargets.findIndex((entry) => entry.id === req.params.id);
    if (targetIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Target not found',
        timestamp: new Date().toISOString(),
      });
    }

    mockTargets.splice(targetIndex, 1);

    return res.json({
      success: true,
      data: { deleted: true },
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

export { router as targetsRouter };

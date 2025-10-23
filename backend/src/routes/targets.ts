import { Router } from 'express';

const router = Router();

// Mock data for now - will be replaced with database integration
const mockTargets: any[] = [];

// Get all targets
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: mockTargets,
    timestamp: new Date().toISOString()
  });
});

// Get target by ID
router.get('/:id', (req, res) => {
  const target = mockTargets.find(t => t.id === req.params.id);
  if (!target) {
    return res.status(404).json({
      success: false,
      error: 'Target not found',
      timestamp: new Date().toISOString()
    });
  }

  res.json({
    success: true,
    data: target,
    timestamp: new Date().toISOString()
  });
});

// Create new target
router.post('/', (req, res) => {
  try {
    const { name, type, identifiers, riskTier, tags } = req.body;

    if (!name || !type || !identifiers) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, type, identifiers',
        timestamp: new Date().toISOString()
      });
    }

    const newTarget = {
      id: `target-${Date.now()}`,
      name,
      type,
      identifiers,
      riskTier: riskTier || 'medium',
      lastScanAt: new Date().toISOString(),
      tags: tags || []
    };

    mockTargets.push(newTarget);

    res.status(201).json({
      success: true,
      data: newTarget,
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

// Update target
router.put('/:id', (req, res) => {
  try {
    const targetIndex = mockTargets.findIndex(t => t.id === req.params.id);
    if (targetIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Target not found',
        timestamp: new Date().toISOString()
      });
    }

    mockTargets[targetIndex] = {
      ...mockTargets[targetIndex],
      ...req.body,
      id: req.params.id // Ensure ID doesn't change
    };

    res.json({
      success: true,
      data: mockTargets[targetIndex],
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

// Delete target
router.delete('/:id', (req, res) => {
  try {
    const targetIndex = mockTargets.findIndex(t => t.id === req.params.id);
    if (targetIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Target not found',
        timestamp: new Date().toISOString()
      });
    }

    mockTargets.splice(targetIndex, 1);

    res.json({
      success: true,
      data: { deleted: true },
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

export { router as targetsRouter };

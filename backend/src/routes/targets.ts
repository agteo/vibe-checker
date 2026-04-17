import { Router, type Request, type Response } from 'express';
import { dataStore } from '../services/dataStore.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const state = await dataStore.getState();
    res.json({
      success: true,
      data: state.targets,
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
    const target = state.targets.find((entry) => entry.id === req.params.id);
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
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

router.post('/', async (req: Request, res: Response) => {
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

    await dataStore.update((draft) => {
      draft.targets.push(newTarget);
    });
    await dataStore.appendAuditLog('target.created', 'target', newTarget.id, { name, type });

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

router.put('/:id', async (req: Request, res: Response) => {
  try {
    let updatedTarget: any = null;
    const state = await dataStore.update((draft) => {
      const targetIndex = draft.targets.findIndex((entry) => entry.id === req.params.id);
      if (targetIndex === -1) {
        return;
      }

      draft.targets[targetIndex] = {
        ...draft.targets[targetIndex],
        ...req.body,
        id: req.params.id,
      };

      updatedTarget = draft.targets[targetIndex];
    });

    const targetIndex = state.targets.findIndex((entry) => entry.id === req.params.id);
    if (targetIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Target not found',
        timestamp: new Date().toISOString(),
      });
    }

    await dataStore.appendAuditLog('target.updated', 'target', req.params.id, req.body);

    return res.json({
      success: true,
      data: updatedTarget,
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

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const state = await dataStore.getState();
    const targetIndex = state.targets.findIndex((entry) => entry.id === req.params.id);
    if (targetIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Target not found',
        timestamp: new Date().toISOString(),
      });
    }

    await dataStore.update((draft) => {
      draft.targets = draft.targets.filter((entry) => entry.id !== req.params.id);
    });
    await dataStore.appendAuditLog('target.deleted', 'target', req.params.id);

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

import { Router, type Request, type Response } from 'express';
import { dataStore } from '../services/dataStore.js';
const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const state = await dataStore.getState();
    res.json({
      success: true,
      data: state.policies,
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
    const policy = state.policies.find((entry) => entry.id === req.params.id);
    if (!policy) {
      return res.status(404).json({
        success: false,
        error: 'Policy not found',
        timestamp: new Date().toISOString(),
      });
    }

    return res.json({
      success: true,
      data: policy,
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
    const { name, mode, maxReqPerMin, spiderDepth, allowedTools, exclusions, description } = req.body;

    if (!name || !mode || !allowedTools || !Array.isArray(allowedTools)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, mode, allowedTools',
        timestamp: new Date().toISOString(),
      });
    }

    const newPolicy = {
      id: `policy-${Date.now()}`,
      name,
      mode,
      maxReqPerMin: maxReqPerMin || 100,
      spiderDepth: spiderDepth || 3,
      allowedTools,
      description: description || 'Custom passive scan policy.',
      exclusions: exclusions || [],
    };

    await dataStore.update((draft) => {
      draft.policies.push(newPolicy);
    });
    await dataStore.appendAuditLog('policy.created', 'policy', newPolicy.id, { name, mode });

    return res.status(201).json({
      success: true,
      data: newPolicy,
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
    let updatedPolicy: any = null;
    const state = await dataStore.update((draft) => {
      const policyIndex = draft.policies.findIndex((entry) => entry.id === req.params.id);
      if (policyIndex === -1) {
        return;
      }

      draft.policies[policyIndex] = {
        ...draft.policies[policyIndex],
        ...req.body,
        id: req.params.id,
      };

      updatedPolicy = draft.policies[policyIndex];
    });

    const policyIndex = state.policies.findIndex((entry) => entry.id === req.params.id);
    if (policyIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Policy not found',
        timestamp: new Date().toISOString(),
      });
    }

    await dataStore.appendAuditLog('policy.updated', 'policy', req.params.id, req.body);

    return res.json({
      success: true,
      data: updatedPolicy,
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
    const policyIndex = state.policies.findIndex((entry) => entry.id === req.params.id);
    if (policyIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Policy not found',
        timestamp: new Date().toISOString(),
      });
    }

    await dataStore.update((draft) => {
      draft.policies = draft.policies.filter((entry) => entry.id !== req.params.id);
    });
    await dataStore.appendAuditLog('policy.deleted', 'policy', req.params.id);

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

export { router as policiesRouter };

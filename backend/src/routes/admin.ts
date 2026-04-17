import { Router, type Request, type Response } from 'express';
import { dataStore } from '../services/dataStore.js';

const router = Router();

router.get('/audit-logs', async (_req: Request, res: Response) => {
  try {
    const state = await dataStore.getState();
    res.json({
      success: true,
      data: state.auditLogs,
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

router.get('/settings', async (_req: Request, res: Response) => {
  try {
    const state = await dataStore.getState();
    res.json({
      success: true,
      data: state.settings,
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

router.put('/settings', async (req: Request, res: Response) => {
  try {
    const { dataRetentionDays, scanConcurrencyCap, defaultRateLimit } = req.body;

    if (![dataRetentionDays, scanConcurrencyCap, defaultRateLimit].every((value) => Number.isFinite(value))) {
      return res.status(400).json({
        success: false,
        error: 'Settings must be numeric values',
        timestamp: new Date().toISOString(),
      });
    }

    const state = await dataStore.update((draft) => {
      draft.settings = {
        dataRetentionDays: Number(dataRetentionDays),
        scanConcurrencyCap: Number(scanConcurrencyCap),
        defaultRateLimit: Number(defaultRateLimit),
      };
    });

    await dataStore.appendAuditLog('admin.settings.updated', 'settings', 'global', state.settings);

    return res.json({
      success: true,
      data: state.settings,
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

export { router as adminRouter };

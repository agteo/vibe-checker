import { Router, type Request, type Response } from 'express';

const router = Router();

const mockPolicies = [
  {
    id: 'policy-default-safe',
    name: 'Safe Default',
    mode: 'passive',
    maxReqPerMin: 120,
    spiderDepth: 5,
    allowedTools: ['ZAP', 'OSV'],
    description: 'Comprehensive security scan with moderate speed. Best for production applications. Non-intrusive passive scanning only.',
    exclusions: [],
  },
  {
    id: 'policy-quick-scan',
    name: 'Quick Scan',
    mode: 'passive',
    maxReqPerMin: 200,
    spiderDepth: 1,
    allowedTools: ['ZAP', 'OSV'],
    description: 'Faster scan with basic coverage. Good for development and testing. Non-intrusive passive scanning only.',
    exclusions: [],
  },
  {
    id: 'policy-comprehensive',
    name: 'Comprehensive Scan',
    mode: 'passive',
    maxReqPerMin: 80,
    spiderDepth: 10,
    allowedTools: ['ZAP', 'OSV'],
    description: 'Thorough security analysis with deep crawling. Recommended for critical applications. Non-intrusive passive scanning only.',
    exclusions: [],
  },
  {
    id: 'policy-dependency-only',
    name: 'Dependency Check',
    mode: 'passive',
    maxReqPerMin: 100,
    spiderDepth: 1,
    allowedTools: ['OSV'],
    description: 'Quick dependency vulnerability check only. Fastest option for package scanning.',
    exclusions: [],
  },
  {
    id: 'policy-passive-only',
    name: 'Passive Scan (Non-Intrusive)',
    mode: 'passive',
    maxReqPerMin: 150,
    spiderDepth: 5,
    allowedTools: ['ZAP', 'OSV'],
    description: 'Non-intrusive scan using spider and passive scanning only. Safe for production environments. No active vulnerability testing.',
    exclusions: [],
  },
];

router.get('/', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: mockPolicies,
    timestamp: new Date().toISOString(),
  });
});

router.get('/:id', (req: Request, res: Response) => {
  const policy = mockPolicies.find((entry) => entry.id === req.params.id);
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
});

router.post('/', (req: Request, res: Response) => {
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

    mockPolicies.push(newPolicy);

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

router.put('/:id', (req: Request, res: Response) => {
  try {
    const policyIndex = mockPolicies.findIndex((entry) => entry.id === req.params.id);
    if (policyIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Policy not found',
        timestamp: new Date().toISOString(),
      });
    }

    mockPolicies[policyIndex] = {
      ...mockPolicies[policyIndex],
      ...req.body,
      id: req.params.id,
    };

    return res.json({
      success: true,
      data: mockPolicies[policyIndex],
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
    const policyIndex = mockPolicies.findIndex((entry) => entry.id === req.params.id);
    if (policyIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Policy not found',
        timestamp: new Date().toISOString(),
      });
    }

    mockPolicies.splice(policyIndex, 1);

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

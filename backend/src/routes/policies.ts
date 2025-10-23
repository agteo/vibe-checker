import { Router } from 'express';

const router = Router();

// Mock data for now - will be replaced with database integration
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

// Get all policies
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: mockPolicies,
    timestamp: new Date().toISOString()
  });
});

// Get policy by ID
router.get('/:id', (req, res) => {
  const policy = mockPolicies.find(p => p.id === req.params.id);
  if (!policy) {
    return res.status(404).json({
      success: false,
      error: 'Policy not found',
      timestamp: new Date().toISOString()
    });
  }

  res.json({
    success: true,
    data: policy,
    timestamp: new Date().toISOString()
  });
});

// Create new policy
router.post('/', (req, res) => {
  try {
    const { name, mode, maxReqPerMin, spiderDepth, allowedTools } = req.body;

    if (!name || !mode || !allowedTools || !Array.isArray(allowedTools)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, mode, allowedTools',
        timestamp: new Date().toISOString()
      });
    }

    const newPolicy = {
      id: `policy-${Date.now()}`,
      name,
      mode,
      maxReqPerMin: maxReqPerMin || 100,
      spiderDepth: spiderDepth || 3,
      allowedTools
    };

    mockPolicies.push(newPolicy);

    res.status(201).json({
      success: true,
      data: newPolicy,
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

// Update policy
router.put('/:id', (req, res) => {
  try {
    const policyIndex = mockPolicies.findIndex(p => p.id === req.params.id);
    if (policyIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Policy not found',
        timestamp: new Date().toISOString()
      });
    }

    mockPolicies[policyIndex] = {
      ...mockPolicies[policyIndex],
      ...req.body,
      id: req.params.id // Ensure ID doesn't change
    };

    res.json({
      success: true,
      data: mockPolicies[policyIndex],
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

// Delete policy
router.delete('/:id', (req, res) => {
  try {
    const policyIndex = mockPolicies.findIndex(p => p.id === req.params.id);
    if (policyIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Policy not found',
        timestamp: new Date().toISOString()
      });
    }

    mockPolicies.splice(policyIndex, 1);

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

export { router as policiesRouter };

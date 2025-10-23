import { Router } from 'express';

const router = Router();

// Mock data for now - will be replaced with database integration
const mockFindings: any[] = [];

// Helper function to add findings from scan results
export const addFindingsFromScan = (findings: any[]) => {
  console.log(`addFindingsFromScan called with ${findings.length} findings`);
  findings.forEach(finding => {
    console.log(`Processing finding: ${finding.id} - ${finding.title}`);
    // Check if finding already exists (by ID)
    const existingIndex = mockFindings.findIndex(f => f.id === finding.id);
    if (existingIndex === -1) {
      mockFindings.push(finding);
      console.log(`Added new finding: ${finding.id}`);
    } else {
      // Update existing finding
      mockFindings[existingIndex] = finding;
      console.log(`Updated existing finding: ${finding.id}`);
    }
  });
  console.log(`Total findings in database: ${mockFindings.length}`);
};

// Get all findings with optional filters
router.get('/', (req, res) => {
  try {
    const { severity, status, tool, targetId } = req.query;
    let filteredFindings = [...mockFindings];

    // Apply filters
    if (severity) {
      filteredFindings = filteredFindings.filter(f => f.severity === severity);
    }
    if (status) {
      filteredFindings = filteredFindings.filter(f => f.status === status);
    }
    if (tool) {
      filteredFindings = filteredFindings.filter(f => f.tool === tool);
    }
    if (targetId) {
      filteredFindings = filteredFindings.filter(f => f.targetId === targetId);
    }

    res.json({
      success: true,
      data: filteredFindings,
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

// Get finding by ID
router.get('/:id', (req, res) => {
  const finding = mockFindings.find(f => f.id === req.params.id);
  if (!finding) {
    return res.status(404).json({
      success: false,
      error: 'Finding not found',
      timestamp: new Date().toISOString()
    });
  }

  res.json({
    success: true,
    data: finding,
    timestamp: new Date().toISOString()
  });
});

// Update finding status
router.patch('/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status, justification } = req.body;

    const findingIndex = mockFindings.findIndex(f => f.id === id);
    if (findingIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Finding not found',
        timestamp: new Date().toISOString()
      });
    }

    // Update the finding
    mockFindings[findingIndex] = {
      ...mockFindings[findingIndex],
      status,
      lastUpdatedAt: new Date().toISOString(),
      justification
    };

    res.json({
      success: true,
      data: mockFindings[findingIndex],
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

// Get findings by target
router.get('/target/:targetId', (req, res) => {
  try {
    const { targetId } = req.params;
    const targetFindings = mockFindings.filter(f => f.targetId === targetId);

    res.json({
      success: true,
      data: targetFindings,
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

export { router as findingsRouter };

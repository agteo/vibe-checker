import { create } from 'zustand';

interface ScanJob {
  jobId: string;
  status: 'running' | 'completed' | 'failed' | 'queued';
  targetId: string;
  policyId: string;
  tools?: string[];
  startedAt: string;
  finishedAt?: string;
  estimatedDuration?: number;
  message?: string;
  findings?: any[];
  summary?: any;
}

interface ScanStore {
  activeScans: ScanJob[];
  scanHistory: ScanJob[]; // Add scan history
  addScan: (scan: ScanJob) => void;
  updateScan: (jobId: string, updates: Partial<ScanJob>) => void;
  removeScan: (jobId: string) => void;
  clearScans: () => void;
  addToHistory: (scan: ScanJob) => void; // Add method to move completed scans to history
}

export const useScanStore = create<ScanStore>((set) => ({
  activeScans: [],
  scanHistory: [],
  
  addScan: (scan) => {
    console.log('ScanStore: Adding scan:', scan);
    set((state) => ({
      activeScans: [...state.activeScans, scan]
    }));
  },
  
  updateScan: (jobId, updates) => set((state) => ({
    activeScans: state.activeScans.map(scan => 
      scan.jobId === jobId ? { ...scan, ...updates } : scan
    )
  })),
  
  removeScan: (jobId) => set((state) => {
    const scanToRemove = state.activeScans.find(scan => scan.jobId === jobId);
    const newState = {
      activeScans: state.activeScans.filter(scan => scan.jobId !== jobId)
    };
    
    // If removing a completed scan, add it to history
    if (scanToRemove && (scanToRemove.status === 'completed' || scanToRemove.status === 'failed')) {
      newState.scanHistory = [...state.scanHistory, scanToRemove];
    }
    
    return newState;
  }),
  
  clearScans: () => set({ activeScans: [] }),
  
  addToHistory: (scan) => set((state) => ({
    scanHistory: [...state.scanHistory, scan]
  }))
}));

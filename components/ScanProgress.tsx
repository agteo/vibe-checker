import React, { useState, useEffect } from 'react';
import { useScanStore } from '../src/stores/scanStore';
import { useScans } from '../src/hooks/useApi';
import { ScanTipsPanel } from './ScanTipsPanel';

interface ScanProgressProps {
  className?: string;
  showDetails?: boolean;
  onScanComplete?: () => void;
  showTips?: boolean; // New prop to control tips panel
}

export const ScanProgress: React.FC<ScanProgressProps> = ({ 
  className = '', 
  showDetails = false,
  onScanComplete,
  showTips = false
}) => {
  const { activeScans, removeScan } = useScanStore();
  const { refreshScanStatus, getScanProgress } = useScans();
  const [expandedScans, setExpandedScans] = useState<Set<string>>(new Set());
  const [detailedProgress, setDetailedProgress] = useState<Record<string, any>>({});
  const [tipsVisible, setTipsVisible] = useState(false);
  const [timeoutAlerts, setTimeoutAlerts] = useState<Set<string>>(new Set());

  // Debug logging
  useEffect(() => {
    console.log('ScanProgress: activeScans updated:', activeScans);
  }, [activeScans]);

  // Auto-refresh scan status and detailed progress every 3 seconds for active scans
  useEffect(() => {
    if (activeScans.length === 0) return;

    const interval = setInterval(() => {
      activeScans.forEach(scan => {
        if (scan.status === 'running' || scan.status === 'queued') {
          console.log('Polling scan status for:', scan.jobId, 'current status:', scan.status);
          
          // Check for timeout
          if (scan.status === 'running' && scan.startedAt && scan.estimatedDuration) {
            const elapsed = (Date.now() - new Date(scan.startedAt).getTime()) / 1000;
            const timeoutThreshold = scan.estimatedDuration * 1.5; // 50% over estimated time
            
            if (elapsed > timeoutThreshold && !timeoutAlerts.has(scan.jobId)) {
              console.warn(`Scan ${scan.jobId} has exceeded timeout threshold`);
              setTimeoutAlerts(prev => new Set(prev).add(scan.jobId));
              
              // Show timeout alert
              if ((window as any).addNotification) {
                (window as any).addNotification(
                  `⚠️ Scan ${scan.jobId.split('_')[1]} is taking longer than expected. It may have timed out.`,
                  'warning',
                  10000
                );
              } else {
                alert(`⚠️ Scan Timeout Warning\n\nScan ${scan.jobId} has been running for ${Math.floor(elapsed / 60)} minutes, which exceeds the estimated duration of ${Math.floor(scan.estimatedDuration / 60)} minutes.\n\nThe scan may have timed out or encountered an issue. Please check the scan status.`);
              }
            }
          }
          
          // Get detailed progress for running scans
          if (scan.status === 'running') {
            getScanProgress(scan.jobId).then(progressData => {
              if (progressData) {
                setDetailedProgress(prev => ({
                  ...prev,
                  [scan.jobId]: progressData
                }));
              }
            }).catch(error => {
              console.error('Error getting detailed progress:', error);
              // If we can't get progress, it might be a timeout
              if (scan.startedAt) {
                const elapsed = (Date.now() - new Date(scan.startedAt).getTime()) / 1000;
                if (elapsed > 300 && !timeoutAlerts.has(scan.jobId)) { // 5 minutes without progress
                  setTimeoutAlerts(prev => new Set(prev).add(scan.jobId));
                }
              }
            });
          }
          
          refreshScanStatus(scan.jobId).then(result => {
            console.log('Polling result for', scan.jobId, ':', result);
            if (result && (result.status === 'completed' || result.status === 'failed')) {
              console.log('Scan completed, should update UI');
              // Clear timeout alert if scan completed
              setTimeoutAlerts(prev => {
                const newSet = new Set(prev);
                newSet.delete(scan.jobId);
                return newSet;
              });
              // Call onScanComplete to refresh findings
              if (onScanComplete) {
                console.log('Calling onScanComplete to refresh findings');
                onScanComplete();
              }
            }
          }).catch(error => {
            console.error('Polling error for', scan.jobId, ':', error);
            // Network errors might indicate timeout
            if (scan.startedAt) {
              const elapsed = (Date.now() - new Date(scan.startedAt).getTime()) / 1000;
              if (elapsed > 600 && !timeoutAlerts.has(scan.jobId)) { // 10 minutes with errors
                setTimeoutAlerts(prev => new Set(prev).add(scan.jobId));
              }
            }
          });
        }
      });
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [activeScans, refreshScanStatus, getScanProgress, timeoutAlerts]);

  // Removed auto-cleanup - scans will persist until manually removed
  // Users can manually remove scans if needed

  const toggleExpanded = (jobId: string) => {
    setExpandedScans(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'text-blue-400 bg-blue-400/20';
      case 'completed':
        return 'text-green-400 bg-green-400/20';
      case 'failed':
        return 'text-red-400 bg-red-400/20';
      case 'queued':
        return 'text-yellow-400 bg-yellow-400/20';
      default:
        return 'text-gray-400 bg-gray-400/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return (
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-400 border-t-transparent mr-2"></div>
            <span>Running</span>
          </div>
        );
      case 'completed':
        return (
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-400 rounded-full mr-2"></div>
            <span>Completed</span>
          </div>
        );
      case 'failed':
        return (
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-400 rounded-full mr-2"></div>
            <span>Failed</span>
          </div>
        );
      case 'queued':
        return (
          <div className="flex items-center">
            <div className="w-4 h-4 bg-yellow-400 rounded-full mr-2"></div>
            <span>Queued</span>
          </div>
        );
      default:
        return status;
    }
  };

  const formatDuration = (startedAt: string, estimatedDuration?: number) => {
    const start = new Date(startedAt);
    const now = new Date();
    const elapsed = Math.floor((now.getTime() - start.getTime()) / 1000);
    
    if (estimatedDuration) {
      const remaining = Math.max(0, estimatedDuration - elapsed);
      return `${elapsed}s elapsed, ~${remaining}s remaining`;
    }
    
    return `${elapsed}s elapsed`;
  };

  const getScanPhase = (scan: any): 'spider' | 'active' | 'completed' => {
    if (scan.status === 'completed') return 'completed';
    
    const progress = detailedProgress[scan.jobId];
    if (progress?.phase === 'spider') return 'spider';
    if (progress?.phase === 'active') return 'active';
    
    // Default to active if we don't have detailed progress
    return 'active';
  };

  const getProgressDetails = (scan: any) => {
    const progress = detailedProgress[scan.jobId];
    if (!progress) {
      return {
        percentage: Math.min(100, (Date.now() - new Date(scan.startedAt).getTime()) / (scan.estimatedDuration * 1000) * 100),
        phase: 'active',
        urlsDiscovered: 0,
        rulesCompleted: 0,
        message: 'Scan in progress...'
      };
    }
    
    return {
      percentage: progress.progress || 0,
      phase: progress.phase || 'active',
      urlsDiscovered: progress.urlsDiscovered || 0,
      rulesCompleted: progress.rulesCompleted || 0,
      message: progress.message || 'Scan in progress...'
    };
  };

  if (activeScans.length === 0) {
    return null;
  }

  const runningScans = activeScans.filter(scan => scan.status === 'running');
  const currentScan = runningScans[0]; // Show education for the first running scan

  // Show tips panel only when there are active scans and prop is enabled
  const shouldShowTips = showTips && currentScan && tipsVisible;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Tips Panel */}
      {shouldShowTips && (
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Security Tips</h3>
          <button
            onClick={() => setTipsVisible(false)}
            className="text-sm text-gray-400 hover:text-white"
          >
            Hide Tips
          </button>
        </div>
      )}
      
      {shouldShowTips && (
        <ScanTipsPanel 
          scanPhase={getScanPhase(currentScan)}
          className="mb-6"
        />
      )}

      {/* Scan Progress */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse mr-2"></div>
            Active Scans ({activeScans.length})
          </h3>
          <div className="flex space-x-2">
            {showTips && currentScan && (
              <button
                onClick={() => setTipsVisible(!tipsVisible)}
                className="text-sm text-gray-400 hover:text-white"
              >
                {tipsVisible ? 'Hide' : 'Show'} Tips
              </button>
            )}
            {showDetails && (
              <button
                onClick={() => setExpandedScans(new Set())}
                className="text-sm text-gray-400 hover:text-white"
              >
                Collapse All
              </button>
            )}
          </div>
        </div>

      <div className="space-y-3">
        {activeScans.map((scan) => (
          <div
            key={scan.jobId}
            className="bg-gray-700/50 rounded-lg p-4 border border-gray-600/30"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <span className="text-sm font-mono text-gray-300">
                    {scan.jobId.split('_')[1]}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(scan.status)}`}>
                    {getStatusIcon(scan.status)}
                  </span>
                </div>
                
                <div className="text-sm text-gray-400">
                  <p>Target: {scan.targetId}</p>
                  <p>Policy: {scan.policyId}</p>
                  {scan.tools && (
                    <p>Tools: {scan.tools.join(', ')}</p>
                  )}
                </div>

                {scan.status === 'running' && scan.startedAt && (
                  <div className="mt-3">
                    {/* Timeout Warning */}
                    {timeoutAlerts.has(scan.jobId) && (
                      <div className="mb-3 p-2 bg-yellow-900/30 border border-yellow-600/50 rounded text-xs text-yellow-200">
                        ⚠️ <strong>Timeout Warning:</strong> This scan is taking longer than expected. It may have timed out or encountered an issue.
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-xs text-gray-500">
                        {formatDuration(scan.startedAt, scan.estimatedDuration)}
                      </div>
                      <div className="text-xs text-blue-400 font-medium">
                        {getProgressDetails(scan).percentage.toFixed(1)}%
                      </div>
                    </div>
                    
                    {/* Enhanced Progress Bar with Loading Animation */}
                    <div className="w-full bg-gray-600 rounded-full h-2 mb-2 relative overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-blue-400 to-blue-500 h-2 rounded-full transition-all duration-1000"
                        style={{
                          width: `${Math.min(100, getProgressDetails(scan).percentage)}%`
                        }}
                      ></div>
                      {getProgressDetails(scan).percentage < 100 && (
                        <div 
                          className="absolute inset-0"
                          style={{
                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                            animation: 'shimmer 2s infinite',
                            transform: 'translateX(-100%)'
                          }}
                        ></div>
                      )}
                    </div>
                    <style>{`
                      @keyframes shimmer {
                        0% { transform: translateX(-100%); }
                        100% { transform: translateX(100%); }
                      }
                    `}</style>
                    
                    {/* Detailed Progress Information */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="text-gray-400">
                        <span className="text-blue-400">Phase:</span> {getProgressDetails(scan).phase}
                      </div>
                      <div className="text-gray-400">
                        <span className="text-blue-400">URLs:</span> {getProgressDetails(scan).urlsDiscovered}
                      </div>
                      {getProgressDetails(scan).rulesCompleted > 0 && (
                        <div className="text-gray-400 col-span-2">
                          <span className="text-blue-400">Rules Completed:</span> {getProgressDetails(scan).rulesCompleted}
                        </div>
                      )}
                    </div>
                    
                    {/* Status Message */}
                    <div className="text-xs text-gray-400 mt-1 italic">
                      {getProgressDetails(scan).message}
                    </div>
                  </div>
                )}
              </div>

              {showDetails && (
                <button
                  onClick={() => toggleExpanded(scan.jobId)}
                  className="ml-4 text-gray-400 hover:text-white"
                >
                  {expandedScans.has(scan.jobId) ? '▼' : '▶'}
                </button>
              )}
            </div>

            {showDetails && expandedScans.has(scan.jobId) && (
              <div className="mt-4 pt-4 border-t border-gray-600/30">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Job ID:</p>
                    <p className="font-mono text-gray-300">{scan.jobId}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Started:</p>
                    <p className="text-gray-300">
                      {scan.startedAt ? new Date(scan.startedAt).toLocaleTimeString() : 'N/A'}
                    </p>
                  </div>
                  {scan.finishedAt && (
                    <div>
                      <p className="text-gray-400">Finished:</p>
                      <p className="text-gray-300">
                        {new Date(scan.finishedAt).toLocaleTimeString()}
                      </p>
                    </div>
                  )}
                  {scan.estimatedDuration && (
                    <div>
                      <p className="text-gray-400">Est. Duration:</p>
                      <p className="text-gray-300">{scan.estimatedDuration}s</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      </div>
    </div>
  );
};

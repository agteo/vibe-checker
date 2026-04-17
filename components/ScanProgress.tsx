import React, { useEffect, useState } from 'react';
import { useScanStore } from '../src/stores/scanStore';
import { useScans } from '../src/hooks/useApi';
import { ScanTipsPanel } from './ScanTipsPanel';

interface ScanProgressProps {
  className?: string;
  showDetails?: boolean;
  onScanComplete?: () => void;
  showTips?: boolean;
}

export const ScanProgress: React.FC<ScanProgressProps> = ({
  className = '',
  showDetails = false,
  onScanComplete,
  showTips = false,
}) => {
  const { activeScans } = useScanStore();
  const { refreshScanStatus } = useScans();
  const [expandedScans, setExpandedScans] = useState<Set<string>>(new Set());
  const [tipsVisible, setTipsVisible] = useState(false);
  const [timeoutAlerts, setTimeoutAlerts] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (activeScans.length === 0) {
      return;
    }

    const interval = setInterval(() => {
      activeScans.forEach((scan) => {
        if (scan.status !== 'running' && scan.status !== 'queued') {
          return;
        }

        if (scan.status === 'running' && scan.startedAt && scan.estimatedDuration) {
          const elapsed = (Date.now() - new Date(scan.startedAt).getTime()) / 1000;
          const timeoutThreshold = scan.estimatedDuration * 1.5;

          if (elapsed > timeoutThreshold && !timeoutAlerts.has(scan.jobId)) {
            setTimeoutAlerts((prev) => new Set(prev).add(scan.jobId));
            window.addNotification?.(
              `Scan ${scan.jobId.split('_')[1]} is taking longer than expected.`,
              'warning',
              10000
            );
          }
        }

        refreshScanStatus(scan.jobId)
          .then((result) => {
            if (!result || (result.status !== 'completed' && result.status !== 'failed')) {
              return;
            }

            setTimeoutAlerts((prev) => {
              const next = new Set(prev);
              next.delete(scan.jobId);
              return next;
            });

            onScanComplete?.();
          })
          .catch(() => {});
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [activeScans, onScanComplete, refreshScanStatus, timeoutAlerts]);

  const toggleExpanded = (jobId: string) => {
    setExpandedScans((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'running':
        return 'Running';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'queued':
        return 'Queued';
      default:
        return status;
    }
  };

  const formatDuration = (startedAt: string, estimatedDuration?: number) => {
    const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);

    if (!estimatedDuration) {
      return `${elapsed}s elapsed`;
    }

    const remaining = Math.max(0, estimatedDuration - elapsed);
    return `${elapsed}s elapsed, ~${remaining}s remaining`;
  };

  const getProgressDetails = (scan: any) => {
    const estimatedDuration = scan.estimatedDuration || 1800;
    const rawPercentage =
      ((Date.now() - new Date(scan.startedAt).getTime()) / (estimatedDuration * 1000)) * 100;

    return {
      percentage: scan.status === 'completed' ? 100 : Math.min(95, Math.max(5, rawPercentage)),
      phase: scan.status === 'queued' ? 'queued' : 'active',
      message: scan.message || 'Scan in progress...',
    };
  };

  if (activeScans.length === 0) {
    return null;
  }

  const currentScan = activeScans.find((scan) => scan.status === 'running');
  const shouldShowTips = showTips && currentScan && tipsVisible;

  return (
    <div className={`space-y-6 ${className}`}>
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

      {shouldShowTips && currentScan && (
        <ScanTipsPanel scanPhase="active" className="mb-6" />
      )}

      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse mr-2"></div>
            Active Scans ({activeScans.length})
          </h3>
          <div className="flex space-x-2">
            {showTips && currentScan && (
              <button
                onClick={() => setTipsVisible((prev) => !prev)}
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
          {activeScans.map((scan) => {
            const progress = getProgressDetails(scan);

            return (
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
                        {getStatusLabel(scan.status)}
                      </span>
                    </div>

                    <div className="text-sm text-gray-400">
                      <p>Target: {scan.targetId}</p>
                      <p>Policy: {scan.policyId}</p>
                      {scan.tools && <p>Tools: {scan.tools.join(', ')}</p>}
                    </div>

                    {(scan.status === 'running' || scan.status === 'queued') && scan.startedAt && (
                      <div className="mt-3">
                        {timeoutAlerts.has(scan.jobId) && (
                          <div className="mb-3 p-2 bg-yellow-900/30 border border-yellow-600/50 rounded text-xs text-yellow-200">
                            <strong>Timeout warning:</strong> This scan is taking longer than expected.
                          </div>
                        )}

                        <div className="flex justify-between items-center mb-2">
                          <div className="text-xs text-gray-500">
                            {formatDuration(scan.startedAt, scan.estimatedDuration)}
                          </div>
                          <div className="text-xs text-blue-400 font-medium">
                            {progress.percentage.toFixed(1)}%
                          </div>
                        </div>

                        <div className="w-full bg-gray-600 rounded-full h-2 mb-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-blue-400 to-blue-500 h-2 rounded-full transition-all duration-1000"
                            style={{ width: `${progress.percentage}%` }}
                          ></div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="text-gray-400">
                            <span className="text-blue-400">Phase:</span> {progress.phase}
                          </div>
                          {scan.tools && (
                            <div className="text-gray-400">
                              <span className="text-blue-400">Tool Count:</span> {scan.tools.length}
                            </div>
                          )}
                        </div>

                        <div className="text-xs text-gray-400 mt-1 italic">
                          {progress.message}
                        </div>
                      </div>
                    )}
                  </div>

                  {showDetails && (
                    <button
                      onClick={() => toggleExpanded(scan.jobId)}
                      className="ml-4 text-gray-400 hover:text-white"
                    >
                      {expandedScans.has(scan.jobId) ? 'v' : '>'}
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
            );
          })}
        </div>
      </div>
    </div>
  );
};

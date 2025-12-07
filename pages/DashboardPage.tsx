
import React from 'react';
import { Finding, ScanJob, TargetApp, RiskTier, JobStatus, FindingSeverity } from '../types';
import { ScanProgress } from '../components/ScanProgress';
import { useScanStore } from '../src/stores/scanStore';
import { useScans } from '../src/hooks/useApi';

interface DashboardPageProps {
    findings: Finding[];
    scanJobs: ScanJob[];
    targets: TargetApp[];
    onScanComplete?: () => void;
    onNavigateToFindings?: (filter?: { severity?: FindingSeverity; status?: string }) => void;
}

const JOB_STATUS_COLORS: { [key in JobStatus]: string } = {
  [JobStatus.Queued]: 'bg-gray-500',
  [JobStatus.Running]: 'bg-blue-500 animate-pulse',
  [JobStatus.Completed]: 'bg-green-500',
  [JobStatus.Failed]: 'bg-red-500',
  [JobStatus.Cancelled]: 'bg-yellow-600',
};

interface StatCardProps {
    title: string;
    value: string | number;
    color: string;
    onClick?: () => void;
    clickable?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, color, onClick, clickable = false }) => (
    <div 
        className={`bg-gray-800 p-6 rounded-xl shadow-lg ${clickable ? 'cursor-pointer hover:bg-gray-700 transition-colors' : ''}`}
        onClick={onClick}
        title={clickable ? `Click to view ${title.toLowerCase()}` : undefined}
    >
        <p className="text-sm font-medium text-gray-400">{title}</p>
        <p className={`text-3xl font-bold mt-2 ${color}`}>{value}</p>
        {clickable && (
            <p className="text-xs text-gray-500 mt-2">Click to view details →</p>
        )}
    </div>
);

export const DashboardPage: React.FC<DashboardPageProps> = ({ findings, scanJobs, targets, onScanComplete, onNavigateToFindings }) => {
    const criticalFindings = findings.filter(f => f.severity === FindingSeverity.Critical).length;
    const highRiskTargets = targets.filter(t => t.riskTier === RiskTier.High).length;
    const runningScans = scanJobs.filter(j => j.status === JobStatus.Running).length;
    const openFindings = findings.filter(f => f.status === 'open').length;
    
    const { activeScans, removeScan, clearScans, updateScan } = useScanStore();
    const { refreshScanStatus } = useScans();

    // Remove any test scans on component mount
    React.useEffect(() => {
        activeScans.forEach(scan => {
            if (scan.targetId === 'test-target' || scan.jobId.startsWith('test-')) {
                removeScan(scan.jobId);
            }
        });
    }, []);

    // Manual refresh function for debugging
    const refreshAllScans = () => {
        activeScans.forEach(scan => {
            refreshScanStatus(scan.jobId);
        });
    };

    // Force complete stuck scans
    const forceCompleteStuckScans = () => {
        activeScans.forEach(scan => {
            if (scan.status === 'running' && scan.estimatedDuration) {
                const elapsed = (Date.now() - new Date(scan.startedAt).getTime()) / 1000;
                if (elapsed > scan.estimatedDuration + 60) { // 1 minute past estimated time
                    console.log('Force completing stuck scan:', scan.jobId);
                    updateScan(scan.jobId, { status: 'completed' });
                }
            }
        });
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-white">Dashboard</h1>
                <div className="flex space-x-2">
                    <button
                        onClick={refreshAllScans}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
                    >
                        Refresh Scans
                    </button>
                    <button
                        onClick={forceCompleteStuckScans}
                        className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm"
                    >
                        Fix Stuck Scans
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard 
                    title="Open Findings" 
                    value={openFindings} 
                    color="text-white" 
                    clickable={!!onNavigateToFindings && openFindings > 0}
                    onClick={() => onNavigateToFindings?.({ status: 'open' })}
                />
                <StatCard 
                    title="Critical Findings" 
                    value={criticalFindings} 
                    color="text-critical"
                    clickable={!!onNavigateToFindings && criticalFindings > 0}
                    onClick={() => onNavigateToFindings?.({ severity: FindingSeverity.Critical })}
                />
                <StatCard 
                    title="High Risk Targets" 
                    value={highRiskTargets} 
                    color="text-high" 
                />
                <StatCard 
                    title="Running Scans" 
                    value={activeScans.length} 
                    color="text-blue-400" 
                />
            </div>

            {/* Active Scans Progress */}
            <div className="mb-8">
                <ScanProgress showDetails={true} onScanComplete={onScanComplete} showTips={true} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
                    <h2 className="text-xl font-bold text-white mb-4">Recent Scan Jobs</h2>
                    <ul className="space-y-3">
                        {scanJobs.slice(0, 5).map(job => (
                            <li key={job.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                                <div>
                                    <p className="font-medium text-white">Target: {targets.find(t => t.id === job.targetId)?.name}</p>
                                    <p className="text-sm text-gray-400">Policy: {job.policyId}</p>
                                </div>
                                <div className="flex items-center">
                                    <span className={`w-3 h-3 rounded-full mr-2 ${JOB_STATUS_COLORS[job.status]}`}></span>
                                    <span className="text-sm font-medium capitalize">{job.status}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
                    <h2 className="text-xl font-bold text-white mb-4">Recent Critical Findings</h2>
                     <ul className="space-y-3">
                        {findings.filter(f => f.severity === FindingSeverity.Critical).slice(0, 5).map(finding => (
                            <li key={finding.id} className="p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700/70 transition-colors">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <p className="font-medium text-white">{finding.title}</p>
                                        <p className="text-sm text-gray-400 font-mono">{finding.location}</p>
                                        {finding.description && (
                                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                                {finding.description}
                                            </p>
                                        )}
                                    </div>
                                    <div className="ml-3 text-xs text-gray-500">
                                        {finding.tool}
                                    </div>
                                </div>
                                {finding.recommendation && (
                                    <div className="mt-2 p-2 bg-green-900/20 border border-green-600/30 rounded text-xs">
                                        <span className="text-green-300 font-medium">💡 </span>
                                        <span className="text-green-200">{finding.recommendation}</span>
                                    </div>
                                )}
                            </li>
                        ))}
                        {findings.filter(f => f.severity === FindingSeverity.Critical).length === 0 && (
                            <li className="p-3 text-gray-500 text-center">
                                No critical findings
                            </li>
                        )}
                    </ul>
                </div>
            </div>

        </div>
    );
};

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

const describeScanOutcome = (job: ScanJob) => {
  if (job.status === JobStatus.Running || job.status === JobStatus.Queued) {
    const minutes = job.estimatedDuration ? Math.max(1, Math.ceil(job.estimatedDuration / 60)) : null;
    return minutes
      ? `In progress. Estimated runtime: about ${minutes} minute${minutes === 1 ? '' : 's'}.`
      : 'In progress.';
  }

  if (job.status === JobStatus.Cancelled) {
    return 'Cancelled before completion.';
  }

  if (job.errors && job.errors.length > 0) {
    if ((job.summary?.total || 0) === 0) {
      return `Completed with scanner issues and no findings. ${job.errors[0]}`;
    }
    return `Completed with ${job.summary?.total || 0} findings and scanner issues.`;
  }

  if (job.status === JobStatus.Completed) {
    const total = job.summary?.total || 0;
    return total === 0
      ? 'Completed with 0 findings.'
      : `Completed with ${total} finding${total === 1 ? '' : 's'}.`;
  }

  if (job.status === JobStatus.Failed) {
    return job.errors?.[0] || 'Scan failed before results were collected.';
  }

  return 'No additional scan details available.';
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
    className={`metric-card p-6 ${clickable ? 'cursor-pointer' : ''}`}
    onClick={onClick}
    title={clickable ? `Click to view ${title.toLowerCase()}` : undefined}
  >
    <p className="eyebrow">{title}</p>
    <p className={`relative mt-4 text-4xl font-bold tracking-tight ${color}`}>{value}</p>
    <p className="relative mt-3 text-sm text-slate-400">
      {clickable ? 'Open the filtered findings view' : 'Live snapshot from current workspace data'}
    </p>
  </div>
);

export const DashboardPage: React.FC<DashboardPageProps> = ({
  findings,
  scanJobs,
  targets,
  onScanComplete,
  onNavigateToFindings,
}) => {
  const criticalFindings = findings.filter((finding) => finding.severity === FindingSeverity.Critical).length;
  const highRiskTargets = targets.filter((target) => target.riskTier === RiskTier.High).length;
  const openFindings = findings.filter((finding) => finding.status === 'open').length;

  const { activeScans, removeScan } = useScanStore();
  const { refreshScanStatus } = useScans();

  React.useEffect(() => {
    activeScans.forEach((scan) => {
      if (scan.targetId === 'test-target' || scan.jobId.startsWith('test-')) {
        removeScan(scan.jobId);
      }
    });
  }, [activeScans, removeScan]);

  const refreshAllScans = () => {
    activeScans.forEach((scan) => {
      refreshScanStatus(scan.jobId);
    });
  };

  return (
    <div className="space-y-8">
      <div className="panel hero-panel p-8">
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="eyebrow">Threat Posture</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Run scans, review findings, and move quickly from signal to response.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-300">
              Watch active scans, pressure-test risky targets, and move straight from signal to action.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100">
              {targets.length} targets in scope
            </div>
            <div className="rounded-full border border-orange-400/20 bg-orange-400/10 px-4 py-2 text-sm text-orange-100">
              {activeScans.length} active scans
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center gap-4">
        <div>
          <p className="eyebrow">Control Room</p>
          <h2 className="mt-2 text-2xl font-bold text-white">Dashboard</h2>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={refreshAllScans}
            className="action-button action-button-secondary text-sm"
          >
            Refresh Scans
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
        <StatCard title="High Risk Targets" value={highRiskTargets} color="text-high" />
        <StatCard title="Running Scans" value={activeScans.length} color="text-blue-400" />
      </div>

      <div className="panel p-4 md:p-6">
        <ScanProgress showDetails={true} onScanComplete={onScanComplete} showTips={true} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="panel p-6">
          <div className="mb-4">
            <p className="eyebrow">Queue</p>
            <h2 className="section-title mt-2 text-white">Recent Scan Jobs</h2>
          </div>
          <ul className="space-y-3">
            {scanJobs.slice(0, 5).map((job) => (
              <li key={job.id} className="flex items-center justify-between rounded-2xl border border-slate-700/60 bg-slate-800/60 p-4">
                <div>
                  <p className="font-medium text-white">Target: {targets.find((target) => target.id === job.targetId)?.name}</p>
                  <p className="text-sm text-gray-400">Policy: {job.policyId}</p>
                  <p className="mt-2 max-w-xl text-xs text-slate-400">{describeScanOutcome(job)}</p>
                </div>
                <div className="flex items-center">
                  <span className={`w-3 h-3 rounded-full mr-2 ${JOB_STATUS_COLORS[job.status]}`}></span>
                  <span className="text-sm font-medium capitalize">{job.status}</span>
                </div>
              </li>
            ))}
            {scanJobs.length === 0 && <li className="empty-state">No recent jobs yet. Start a scan from the targets page.</li>}
          </ul>
        </div>
        <div className="panel p-6">
          <div className="mb-4">
            <p className="eyebrow">Priority Queue</p>
            <h2 className="section-title mt-2 text-white">Recent Critical Findings</h2>
          </div>
          <ul className="space-y-3">
            {findings
              .filter((finding) => finding.severity === FindingSeverity.Critical)
              .slice(0, 5)
              .map((finding) => (
                <li key={finding.id} className="rounded-2xl border border-rose-400/10 bg-rose-400/[0.03] p-4 transition-colors hover:bg-rose-400/[0.07]">
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
                    <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs">
                      <span className="text-green-300 font-medium">Tip: </span>
                      <span className="text-green-200">{finding.recommendation}</span>
                    </div>
                  )}
                </li>
              ))}
            {findings.filter((finding) => finding.severity === FindingSeverity.Critical).length === 0 && (
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

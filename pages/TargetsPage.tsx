import React, { useState } from 'react';
import { TargetApp, TargetType, RiskTier, ScanPolicy } from '../types';
import { RunScanWizard } from '../components/RunScanWizard';
import { AddTargetModal } from '../components/AddTargetModal';
import { apiClient } from '../src/api/client';

interface TargetsPageProps {
  targets: TargetApp[];
  policies: ScanPolicy[];
  onScanComplete?: () => void;
}

const RiskBadge: React.FC<{ risk: RiskTier }> = ({ risk }) => {
  const color = {
    [RiskTier.High]: 'bg-high text-white',
    [RiskTier.Medium]: 'bg-medium text-black',
    [RiskTier.Low]: 'bg-low text-white',
  }[risk];

  return <span className={`px-2.5 py-1 text-xs font-bold rounded-full capitalize ${color}`}>{risk}</span>;
};

const TypeBadge: React.FC<{ type: TargetType }> = ({ type }) => {
  const color = {
    [TargetType.Web]: 'bg-blue-600 text-white',
    [TargetType.API]: 'bg-purple-600 text-white',
    [TargetType.Repo]: 'bg-green-600 text-white',
  }[type];

  return <span className={`px-2.5 py-1 text-xs font-semibold rounded-full capitalize ${color}`}>{type}</span>;
};

export const TargetsPage: React.FC<TargetsPageProps> = ({ targets: initialTargets, policies, onScanComplete }) => {
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isAddTargetOpen, setIsAddTargetOpen] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<TargetApp | null>(null);
  const [targets, setTargets] = useState(initialTargets);

  React.useEffect(() => {
    setTargets(initialTargets);
  }, [initialTargets]);

  const handleRunScanClick = (target: TargetApp) => {
    setSelectedTarget(target);
    setIsWizardOpen(true);
  };

  const handleCreateTarget = async (targetData: Omit<TargetApp, 'id' | 'lastScanAt'>) => {
    const response = await apiClient.createTarget(targetData);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to create target');
    }

    setTargets((prev) => [...prev, response.data]);
  };

  const handleDeleteTarget = async (targetId: string) => {
    if (!window.confirm('Are you sure you want to delete this target? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await apiClient.deleteTarget(targetId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete target');
      }

      setTargets((prev) => prev.filter((target) => target.id !== targetId));
    } catch (error) {
      window.addNotification?.(
        `Failed to delete target: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Inventory</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Targets</h1>
          <p className="mt-2 text-slate-400">Keep the scope clean, then launch scans directly against production-facing assets.</p>
        </div>
        <button
          onClick={() => setIsAddTargetOpen(true)}
          className="action-button action-button-primary"
        >
          Add Target
        </button>
      </div>

      <div className="panel data-table">
        <table className="min-w-full">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Risk Tier</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Last Scan</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/70">
            {targets.map((target) => (
              <tr key={target.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-white">{target.name}</div>
                  <div className="text-xs text-gray-400 font-mono">{target.identifiers}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap"><TypeBadge type={target.type} /></td>
                <td className="px-6 py-4 whitespace-nowrap"><RiskBadge risk={target.riskTier} /></td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{new Date(target.lastScanAt).toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleRunScanClick(target)}
                      className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-100"
                    >
                      Run Scan
                    </button>
                    <button
                      onClick={() => handleDeleteTarget(target.id)}
                      className="rounded-full border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs font-bold text-rose-100"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {targets.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10">
                  <div className="empty-state">No targets registered yet. Add one to start scanning.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedTarget && (
        <RunScanWizard
          isOpen={isWizardOpen}
          onClose={() => {
            setIsWizardOpen(false);
            setSelectedTarget(null);
          }}
          target={selectedTarget}
          policies={policies}
          onScanComplete={onScanComplete}
        />
      )}

      <AddTargetModal
        isOpen={isAddTargetOpen}
        onClose={() => setIsAddTargetOpen(false)}
        onCreateTarget={handleCreateTarget}
      />
    </div>
  );
};


import React, { useState } from 'react';
import { TargetApp, TargetType, RiskTier, ScanPolicy } from '../types';
import { RunScanWizard } from '../components/RunScanWizard';
import { AddTargetModal } from '../components/AddTargetModal';
import { useTargets, usePolicies } from '../src/hooks/useApi';

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
    return <span className={`px-2.5 py-1 text-xs font-bold rounded-full capitalize ${color}`}>{risk}</span>
};

const TypeBadge: React.FC<{ type: TargetType }> = ({ type }) => {
     const color = {
        [TargetType.Web]: 'bg-blue-600 text-white',
        [TargetType.API]: 'bg-purple-600 text-white',
        [TargetType.Repo]: 'bg-green-600 text-white',
    }[type];
    return <span className={`px-2.5 py-1 text-xs font-semibold rounded-full capitalize ${color}`}>{type}</span>
};

export const TargetsPage: React.FC<TargetsPageProps> = ({ targets: propTargets, policies: propPolicies, onScanComplete }) => {
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [isAddTargetOpen, setIsAddTargetOpen] = useState(false);
    const [selectedTarget, setSelectedTarget] = useState<TargetApp | null>(null);
    
    // Use API hooks for real data, fallback to props for now
    const { targets: apiTargets, loading: targetsLoading, error: targetsError, createTarget, deleteTarget } = useTargets();
    const { policies: apiPolicies, loading: policiesLoading } = usePolicies();
    
    // Use API data if available, otherwise fallback to props
    const targets = apiTargets.length > 0 ? apiTargets : propTargets;
    const policies = apiPolicies.length > 0 ? apiPolicies : propPolicies;

    const handleRunScanClick = (target: TargetApp) => {
        setSelectedTarget(target);
        setIsWizardOpen(true);
    };

    const handleWizardClose = () => {
        setIsWizardOpen(false);
        setSelectedTarget(null);
    };

    const handleAddTargetClick = () => {
        setIsAddTargetOpen(true);
    };

    const handleAddTargetClose = () => {
        setIsAddTargetOpen(false);
    };

    const handleCreateTarget = async (targetData: Omit<TargetApp, 'id' | 'lastScanAt'>) => {
        await createTarget(targetData);
    };

    const handleDeleteTarget = async (targetId: string) => {
        if (window.confirm('Are you sure you want to delete this target? This action cannot be undone.')) {
            try {
                await deleteTarget(targetId);
            } catch (error) {
                console.error('Failed to delete target:', error);
                alert(`Failed to delete target: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
    };
    
    if (targetsLoading || policiesLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-white">Loading targets and policies...</div>
            </div>
        );
    }

    if (targetsError) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-red-400">Error loading targets: {targetsError}</div>
            </div>
        );
    }
    
    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-white">Targets</h1>
                <button 
                    onClick={handleAddTargetClick}
                    className="bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-lg"
                >
                    Add Target
                </button>
            </div>

            <div className="bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                 <table className="min-w-full">
                    <thead className="bg-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Risk Tier</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Last Scan</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {targets.map(target => (
                            <tr key={target.id} className="hover:bg-gray-700/50">
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
                                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-3 rounded-md"
                                        >
                                            Run Scan
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteTarget(target.id)}
                                            className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2 px-3 rounded-md"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {selectedTarget && (
                <RunScanWizard 
                    isOpen={isWizardOpen}
                    onClose={handleWizardClose}
                    target={selectedTarget}
                    policies={policies}
                    onScanComplete={onScanComplete}
                />
            )}
            
            <AddTargetModal
                isOpen={isAddTargetOpen}
                onClose={handleAddTargetClose}
                onCreateTarget={handleCreateTarget}
            />
        </div>
    );
};

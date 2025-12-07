
import React, { useState } from 'react';
import { ScanPolicy, ScanMode } from '../types';
import { AddPolicyModal } from '../components/AddPolicyModal';
import { EditPolicyModal } from '../components/EditPolicyModal';
import { usePolicies } from '../src/hooks/useApi';

interface PoliciesPageProps {
    policies: ScanPolicy[];
}

const ModeBadge: React.FC<{ mode: ScanMode }> = ({ mode }) => {
    return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-600 text-white">Passive (Non-Intrusive)</span>
};

const PolicyHelpSection: React.FC = () => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="mb-6 bg-gray-800 rounded-lg border border-gray-700">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-700/50 transition-colors"
            >
                <div className="flex items-center space-x-2">
                    <span className="text-blue-400">ℹ️</span>
                    <span className="text-white font-medium">What are Scan Policies?</span>
                </div>
                <span className={`text-gray-400 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                    ▼
                </span>
            </button>
            
            {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-700">
                    <div className="pt-4 space-y-4 text-gray-300">
                        <div>
                            <h3 className="text-white font-semibold mb-2">📋 What are Scan Policies?</h3>
                            <p className="text-sm">
                                Scan policies are "recipes" that define how security scans are performed. They determine which tools to use, 
                                how thorough the scan should be, and how fast it runs.
                            </p>
                        </div>

                        <div>
                            <h3 className="text-white font-semibold mb-2">🎯 Choosing the Right Policy</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-start space-x-2">
                                    <span className="text-green-400">🛡️</span>
                                    <div>
                                        <strong className="text-white">Safe Default:</strong> Best for production apps (20-30 min, comprehensive)
                                    </div>
                                </div>
                                <div className="flex items-start space-x-2">
                                    <span className="text-blue-400">⚡</span>
                                    <div>
                                        <strong className="text-white">Quick Scan:</strong> Good for development (10-15 min, basic coverage)
                                    </div>
                                </div>
                                <div className="flex items-start space-x-2">
                                    <span className="text-purple-400">🔍</span>
                                    <div>
                                        <strong className="text-white">Comprehensive:</strong> For critical apps (30-45 min, deep analysis)
                                    </div>
                                </div>
                                <div className="flex items-start space-x-2">
                                    <span className="text-orange-400">📦</span>
                                    <div>
                                        <strong className="text-white">Dependency Check:</strong> Fast package scanning only (2-5 min)
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-white font-semibold mb-2">⚙️ Policy Settings Explained</h3>
                            <div className="space-y-2 text-sm">
                                <div>
                                    <strong className="text-white">Max Requests/Min:</strong> How many requests sent to your app per minute
                                    <div className="text-gray-400 ml-4">• Lower = Slower scan, less impact on your app</div>
                                    <div className="text-gray-400 ml-4">• Higher = Faster scan, more impact on your app</div>
                                </div>
                                <div>
                                    <strong className="text-white">Spider Depth:</strong> How deep the scanner crawls
                                    <div className="text-gray-400 ml-4">• Depth 1 = Main pages only</div>
                                    <div className="text-gray-400 ml-4">• Depth 5 = Main pages + 4 levels of links</div>
                                    <div className="text-gray-400 ml-4">• Depth 10 = Very thorough crawling</div>
                                </div>
                                <div>
                                    <strong className="text-white">Allowed Tools:</strong> Which security scanners to use
                                    <div className="text-gray-400 ml-4">• ZAP = Web application security testing</div>
                                    <div className="text-gray-400 ml-4">• OSV = Dependency vulnerability scanning</div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-900/30 border border-blue-700 rounded-md p-3">
                            <div className="flex items-start space-x-2">
                                <span className="text-blue-400">💡</span>
                                <div className="text-sm">
                                    <strong className="text-blue-300">Pro Tip:</strong> Start with "Safe Default" for most applications. 
                                    It provides comprehensive security testing without overwhelming your application.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const PoliciesPage: React.FC<PoliciesPageProps> = ({ policies: propPolicies }) => {
    const [isAddPolicyOpen, setIsAddPolicyOpen] = useState(false);
    const [isEditPolicyOpen, setIsEditPolicyOpen] = useState(false);
    const [editingPolicy, setEditingPolicy] = useState<ScanPolicy | null>(null);
    
    // Use API hooks for real data, fallback to props for now
    const { policies: apiPolicies, loading: policiesLoading, error: policiesError, createPolicy, updatePolicy, deletePolicy } = usePolicies();
    
    // Use API data if available, otherwise fallback to props
    const policies = apiPolicies.length > 0 ? apiPolicies : propPolicies;

    const handleAddPolicyClick = () => {
        setIsAddPolicyOpen(true);
    };

    const handleAddPolicyClose = () => {
        setIsAddPolicyOpen(false);
    };

    const handleCreatePolicy = async (policyData: Omit<ScanPolicy, 'id'>) => {
        await createPolicy(policyData);
    };

    const handleEditPolicy = (policy: ScanPolicy) => {
        setEditingPolicy(policy);
        setIsEditPolicyOpen(true);
    };

    const handleEditPolicyClose = () => {
        setIsEditPolicyOpen(false);
        setEditingPolicy(null);
    };

    const handleUpdatePolicy = async (policyId: string, policyData: Omit<ScanPolicy, 'id'>) => {
        await updatePolicy(policyId, policyData);
    };

    const handleDeletePolicy = async (policyId: string) => {
        if (window.confirm('Are you sure you want to delete this policy? This action cannot be undone.')) {
            try {
                await deletePolicy(policyId);
            } catch (error) {
                alert('Failed to delete policy: ' + (error instanceof Error ? error.message : 'Unknown error'));
            }
        }
    };

    if (policiesLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-white">Loading policies...</div>
            </div>
        );
    }

    if (policiesError) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-red-400">Error loading policies: {policiesError}</div>
            </div>
        );
    }
    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-white">Scan Policies</h1>
                 <button 
                    onClick={handleAddPolicyClick}
                    className="bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-lg"
                >
                    New Policy
                </button>
            </div>

            <PolicyHelpSection />

            <div className="bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                 <table className="min-w-full">
                    <thead className="bg-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Mode</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Rate Limit (req/min)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Allowed Tools</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {policies.map(policy => (
                            <tr key={policy.id} className="hover:bg-gray-700/50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{policy.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap"><ModeBadge mode={policy.mode} /></td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{policy.maxReqPerMin}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 font-mono">{policy.allowedTools.join(', ')}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => handleEditPolicy(policy)}
                                            className="text-blue-400 hover:text-blue-300 transition-colors"
                                            title="Edit Policy"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={() => handleDeletePolicy(policy.id)}
                                            className="text-red-400 hover:text-red-300 transition-colors"
                                            title="Delete Policy"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <AddPolicyModal
                isOpen={isAddPolicyOpen}
                onClose={handleAddPolicyClose}
                onCreatePolicy={handleCreatePolicy}
            />
            
            <EditPolicyModal
                isOpen={isEditPolicyOpen}
                onClose={handleEditPolicyClose}
                policy={editingPolicy}
                onUpdatePolicy={handleUpdatePolicy}
            />
        </div>
    );
};

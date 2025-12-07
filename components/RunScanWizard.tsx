
import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { TargetApp, ScanPolicy } from '../types';
import { useScans } from '../src/hooks/useApi';
import { ScanProgress } from './ScanProgress';
import { useScanStore } from '../src/stores/scanStore';

interface RunScanWizardProps {
    isOpen: boolean;
    onClose: () => void;
    target: TargetApp;
    policies: ScanPolicy[];
    onScanComplete?: () => void; // Callback when scan completes
}

export const RunScanWizard: React.FC<RunScanWizardProps> = ({ isOpen, onClose, target, policies, onScanComplete }) => {
    const [selectedPolicyId, setSelectedPolicyId] = useState<string>(policies[0]?.id || '');
    const [consentAccepted, setConsentAccepted] = useState(false);
    const [ownershipAttested, setOwnershipAttested] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [currentScanJobId, setCurrentScanJobId] = useState<string | null>(null);
    const [showProgress, setShowProgress] = useState(false);
    const { startScan, refreshScanStatus } = useScans();
    const { removeScan } = useScanStore();

    const selectedPolicy = policies.find(p => p.id === selectedPolicyId);

    // Poll scan status when a scan is running
    useEffect(() => {
        if (!currentScanJobId) return;

        const pollInterval = setInterval(async () => {
            try {
                const status = await refreshScanStatus(currentScanJobId);
                console.log('Scan status update:', status);
                
                if (status && (status.status === 'completed' || status.status === 'failed')) {
                    console.log('Scan finished with status:', status.status);
                    setCurrentScanJobId(null);
                    setShowProgress(false);
                    clearInterval(pollInterval);
                    
                    // Remove scan from active scans after a delay to show completion status
                    setTimeout(() => {
                        removeScan(currentScanJobId);
                    }, 5000);
                    
                    // Notify parent component that scan is complete
                    if (onScanComplete) {
                        onScanComplete();
                    }
                }
            } catch (error) {
                console.error('Error polling scan status:', error);
            }
        }, 5000); // Poll every 5 seconds

        return () => clearInterval(pollInterval);
    }, [currentScanJobId, refreshScanStatus, onScanComplete]);

    const handleStartScan = async () => {
        if (!consentAccepted || !ownershipAttested) {
            alert('Please accept consent and attest to ownership before starting scan');
            return;
        }

        setIsStarting(true);
        try {
            console.log('Starting scan with data:', {
                targetId: target.id,
                policyId: selectedPolicyId,
                consentAccepted,
                ownershipAttested,
                scopeSnapshot: {
                    identifiers: target.identifiers,
                    riskTier: target.riskTier,
                    tags: target.tags
                }
            });

            const result = await startScan({
                targetId: target.id,
                policyId: selectedPolicyId,
                consentAccepted,
                ownershipAttested,
                scopeSnapshot: {
                    identifiers: target.identifiers,
                    riskTier: target.riskTier,
                    tags: target.tags
                }
            });
            
            console.log('Scan result:', result);
            
            // Set the current scan job ID to start polling
            setCurrentScanJobId(result.jobId);
            setShowProgress(true);
            
            // Show success notification
            if ((window as any).addNotification) {
              (window as any).addNotification(
                `Scan started successfully! Job ID: ${result.jobId.split('_')[1]}`,
                'success',
                3000
              );
            }
            
            // Show success message with estimated duration
            const estimatedMinutes = result.estimatedDuration ? Math.ceil(result.estimatedDuration / 60) : 'unknown';
            const modeInfo = '\n\n🛡️ Passive Mode: Non-intrusive scan - safe for production';
            
            alert(`✅ Scan started successfully!\n\nJob ID: ${result.jobId}\nStatus: ${result.status}\nTools: ${result.tools?.join(', ') || 'N/A'}\nEstimated Duration: ~${estimatedMinutes} minutes${modeInfo}\n\nScan is running and will be monitored automatically.`);
        } catch (error) {
            console.error('Failed to start scan:', error);
            alert(`❌ Failed to start scan:\n\n${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease check the browser console for more details.`);
        } finally {
            setIsStarting(false);
        }
    };

    const canStartScan = consentAccepted && ownershipAttested && selectedPolicyId && !isStarting;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Run Scan on ${target.name}`}
        >
            <div className="space-y-6 text-gray-300">
                <div>
                    <p><span className="font-bold text-gray-400">Target ID:</span> {target.id}</p>
                    <p><span className="font-bold text-gray-400">Identifiers:</span> {target.identifiers}</p>
                </div>

                <div>
                    <label htmlFor="policy-select" className="block text-sm font-bold text-gray-400 mb-2">
                        Select Scan Policy
                    </label>
                    <select
                        id="policy-select"
                        value={selectedPolicyId}
                        onChange={(e) => setSelectedPolicyId(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white focus:ring-primary focus:border-primary"
                    >
                        {policies.map(policy => (
                            <option key={policy.id} value={policy.id}>
                                {policy.name}
                            </option>
                        ))}
                    </select>
                </div>

                {selectedPolicy && (
                    <div className="bg-gray-700/50 p-4 rounded-lg">
                        <h4 className="font-bold text-gray-200 mb-2">Policy Details</h4>
                        <ul className="text-sm space-y-1">
                            <li>
                                <span className="font-semibold text-gray-400">Mode:</span>{' '}
                                <span className="px-2 py-0.5 rounded text-xs bg-green-600/30 text-green-300">
                                    🛡️ Passive (Non-Intrusive)
                                </span>
                            </li>
                            <li><span className="font-semibold text-gray-400">Rate Limit:</span> {selectedPolicy.maxReqPerMin} req/min</li>
                            <li><span className="font-semibold text-gray-400">Spider Depth:</span> {selectedPolicy.spiderDepth}</li>
                            <li><span className="font-semibold text-gray-400">Tools:</span> {selectedPolicy.allowedTools.join(', ')}</li>
                            {selectedPolicy.exclusions && selectedPolicy.exclusions.length > 0 && (
                                <li>
                                    <span className="font-semibold text-gray-400">Exclusions:</span>{' '}
                                    <span className="text-yellow-300 text-xs">
                                        {selectedPolicy.exclusions.length} pattern(s) configured
                                    </span>
                                </li>
                            )}
                        </ul>
                        <div className="mt-3 p-2 bg-green-900/20 border border-green-600/30 rounded text-xs text-green-200">
                            ✅ Passive mode: Only spider and passive scanning. No intrusive tests will be performed. Safe for production.
                        </div>
                        {selectedPolicy.exclusions && selectedPolicy.exclusions.length > 0 && (
                            <div className="mt-3 p-2 bg-yellow-900/20 border border-yellow-600/30 rounded text-xs text-yellow-200">
                                🚫 {selectedPolicy.exclusions.length} URL exclusion pattern(s) will be applied to filter results.
                            </div>
                        )}
                    </div>
                )}

                {/* Consent and Safety Gates */}
                <div className="bg-yellow-900/20 border border-yellow-600/30 p-4 rounded-lg">
                    <h4 className="font-bold text-yellow-200 mb-3">Required Consent & Safety Gates</h4>
                    
                    <div className="space-y-3">
                        <label className="flex items-start space-x-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={ownershipAttested}
                                onChange={(e) => setOwnershipAttested(e.target.checked)}
                                className="mt-1 w-4 h-4 text-primary bg-gray-700 border-gray-600 rounded focus:ring-primary"
                            />
                            <span className="text-sm">
                                <strong>I am authorized to test the specified targets.</strong> I confirm that I have proper authorization to perform security testing on the target systems.
                            </span>
                        </label>

                        <label className="flex items-start space-x-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={consentAccepted}
                                onChange={(e) => setConsentAccepted(e.target.checked)}
                                className="mt-1 w-4 h-4 text-primary bg-gray-700 border-gray-600 rounded focus:ring-primary"
                            />
                            <span className="text-sm">
                                <strong>Testing is limited to declared scope; I accept responsibility.</strong> I understand that testing will be limited to the declared scope and I accept full responsibility for the scan.
                            </span>
                        </label>
                    </div>

                </div>

                {/* Show progress if scan is running */}
                {showProgress && currentScanJobId && (
                    <div className="bg-blue-900/20 border border-blue-600/30 p-4 rounded-lg">
                        <h4 className="font-bold text-blue-200 mb-3 flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-400 border-t-transparent mr-2"></div>
                            Scan in Progress
                        </h4>
                        <ScanProgress showDetails={true} />
                        <p className="text-sm text-blue-300 mt-2">
                            The scan is running in the background. You can close this dialog and monitor progress from the dashboard.
                        </p>
                        <p className="text-xs text-green-300 mt-2">
                            🛡️ Passive mode active - non-intrusive scanning only
                        </p>
                    </div>
                )}

                {/* Loading state when starting scan */}
                {isStarting && (
                    <div className="bg-blue-900/20 border border-blue-600/30 p-4 rounded-lg">
                        <div className="flex items-center justify-center space-x-3">
                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-400 border-t-transparent"></div>
                            <span className="text-blue-200 font-medium">Starting scan...</span>
                        </div>
                        <p className="text-xs text-blue-300 mt-2 text-center">
                            Please wait while we initialize the security scan
                        </p>
                    </div>
                )}

                <div className="flex justify-end pt-4 space-x-4">
                    <button
                        onClick={onClose}
                        disabled={isStarting}
                        className="bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleStartScan}
                        disabled={!canStartScan || showProgress}
                        className="bg-primary hover:bg-primary-hover disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg"
                    >
                        {isStarting ? 'Starting...' : showProgress ? 'Scan Running...' : 'Start Scan'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { TargetApp, ScanPolicy } from '../types';
import { useScans } from '../src/hooks/useApi';

interface RunScanWizardProps {
  isOpen: boolean;
  onClose: () => void;
  target: TargetApp;
  policies: ScanPolicy[];
  onScanComplete?: () => void;
}

export const RunScanWizard: React.FC<RunScanWizardProps> = ({
  isOpen,
  onClose,
  target,
  policies,
}) => {
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>(policies[0]?.id || '');
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [ownershipAttested, setOwnershipAttested] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const { startScan } = useScans();

  const selectedPolicy = policies.find((policy) => policy.id === selectedPolicyId);

  useEffect(() => {
    if (!isOpen) {
      setConsentAccepted(false);
      setOwnershipAttested(false);
      setIsStarting(false);
    }
  }, [isOpen]);

  const notify = (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    window.addNotification?.(message, type, 5000);
  };

  const formatIdentifiers = (identifiers: string) => {
    try {
      const parsed = JSON.parse(identifiers);
      if (Array.isArray(parsed)) {
        return parsed
          .map((identifier) => identifier.value || identifier.type || String(identifier))
          .join(', ');
      }
    } catch {
      // Plain string target identifier.
    }

    return identifiers;
  };

  const handleStartScan = async () => {
    if (!consentAccepted || !ownershipAttested) {
      notify('Accept both authorization confirmations before starting a scan.', 'warning');
      return;
    }

    setIsStarting(true);
    try {
      const result = await startScan({
        targetId: target.id,
        policyId: selectedPolicyId,
        consentAccepted,
        ownershipAttested,
        scopeSnapshot: {
          identifiers: target.identifiers,
          riskTier: target.riskTier,
          tags: target.tags,
        },
      });

      const estimatedMinutes = result.estimatedDuration
        ? Math.ceil(result.estimatedDuration / 60)
        : null;

      notify(
        estimatedMinutes
          ? `Scan ${result.jobId.split('_')[1]} started. Estimated time: about ${estimatedMinutes} minutes.`
          : `Scan ${result.jobId.split('_')[1]} started.`,
        'success'
      );

      onClose();
    } catch (error) {
      notify(
        `Failed to start scan: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      );
    } finally {
      setIsStarting(false);
    }
  };

  const canStartScan = consentAccepted && ownershipAttested && selectedPolicyId && !isStarting;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Run Scan on ${target.name}`}>
      <div className="space-y-6 text-gray-300">
        <div>
          <p><span className="font-bold text-gray-400">Target ID:</span> {target.id}</p>
          <p><span className="font-bold text-gray-400">Identifiers:</span> {formatIdentifiers(target.identifiers)}</p>
        </div>

        <div>
          <label htmlFor="policy-select" className="block text-sm font-bold text-gray-400 mb-2">
            Select Scan Policy
          </label>
          <select
            id="policy-select"
            value={selectedPolicyId}
            onChange={(event) => setSelectedPolicyId(event.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white focus:ring-primary focus:border-primary"
          >
            {policies.map((policy) => (
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
                  Passive (Non-Intrusive)
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
              Passive mode only uses crawling and passive analysis. No intrusive tests are performed.
            </div>
          </div>
        )}

        <div className="bg-yellow-900/20 border border-yellow-600/30 p-4 rounded-lg">
          <h4 className="font-bold text-yellow-200 mb-3">Required Consent & Safety Gates</h4>

          <div className="space-y-3">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={ownershipAttested}
                onChange={(event) => setOwnershipAttested(event.target.checked)}
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
                onChange={(event) => setConsentAccepted(event.target.checked)}
                className="mt-1 w-4 h-4 text-primary bg-gray-700 border-gray-600 rounded focus:ring-primary"
              />
              <span className="text-sm">
                <strong>Testing is limited to declared scope; I accept responsibility.</strong> I understand that testing will be limited to the declared scope and I accept full responsibility for the scan.
              </span>
            </label>
          </div>
        </div>

        {isStarting && (
          <div className="bg-blue-900/20 border border-blue-600/30 p-4 rounded-lg">
            <div className="flex items-center justify-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-400 border-t-transparent"></div>
              <span className="text-blue-200 font-medium">Starting scan...</span>
            </div>
            <p className="text-xs text-blue-300 mt-2 text-center">
              Please wait while the scan job is created.
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
            disabled={!canStartScan}
            className="bg-primary hover:bg-primary-hover disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg"
          >
            {isStarting ? 'Starting...' : 'Start Scan'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { ScanPolicy, ScanMode } from '../types';

interface EditPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  policy: ScanPolicy | null;
  onUpdatePolicy: (policyId: string, policy: Omit<ScanPolicy, 'id'>) => Promise<void>;
}

const AVAILABLE_TOOLS = ['ZAP', 'OSV', 'Semgrep', 'Trivy', 'Gitleaks'];

export const EditPolicyModal: React.FC<EditPolicyModalProps> = ({ 
  isOpen, 
  onClose, 
  policy, 
  onUpdatePolicy 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    mode: ScanMode.Passive,
    maxReqPerMin: 120,
    spiderDepth: 5,
    allowedTools: [] as string[]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update form data when policy changes
  useEffect(() => {
    if (policy) {
      setFormData({
        name: policy.name,
        mode: policy.mode,
        maxReqPerMin: policy.maxReqPerMin,
        spiderDepth: policy.spiderDepth,
        allowedTools: policy.allowedTools
      });
    }
  }, [policy]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!policy) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await onUpdatePolicy(policy.id, {
        name: formData.name,
        mode: formData.mode,
        maxReqPerMin: formData.maxReqPerMin,
        spiderDepth: formData.spiderDepth,
        allowedTools: formData.allowedTools
      });

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update policy');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleToolToggle = (tool: string) => {
    setFormData(prev => ({
      ...prev,
      allowedTools: prev.allowedTools.includes(tool)
        ? prev.allowedTools.filter(t => t !== tool)
        : [...prev.allowedTools, tool]
    }));
  };

  if (!policy) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-gray-800 p-6 rounded-lg max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-white mb-6">Edit Policy</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Policy Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Policy Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          {/* Scan Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Scan Mode
            </label>
            <select
              value={formData.mode}
              onChange={(e) => handleInputChange('mode', e.target.value as ScanMode)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary"
              disabled
            >
              <option value={ScanMode.Passive}>Passive (Non-Intrusive)</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">
              🛡️ Passive mode: Only spider and passive scanning. Safe for production. No intrusive testing is performed.
            </p>
          </div>

          {/* Rate Limit */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Rate Limit (requests per minute)
            </label>
            <input
              type="number"
              min="1"
              max="1000"
              value={formData.maxReqPerMin}
              onChange={(e) => handleInputChange('maxReqPerMin', parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Spider Depth */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Spider Depth
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={formData.spiderDepth}
              onChange={(e) => handleInputChange('spiderDepth', parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Allowed Tools */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Allowed Tools
            </label>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_TOOLS.map(tool => (
                <label key={tool} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.allowedTools.includes(tool)}
                    onChange={() => handleToolToggle(tool)}
                    className="rounded border-gray-600 bg-gray-700 text-primary focus:ring-primary"
                  />
                  <span className="text-gray-300">{tool}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || formData.allowedTools.length === 0}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Updating...' : 'Update Policy'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

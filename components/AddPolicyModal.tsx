import React, { useState } from 'react';
import { ScanPolicy, ScanMode } from '../types';
import { Modal } from './Modal';

interface AddPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePolicy: (policy: Omit<ScanPolicy, 'id'>) => Promise<void>;
}

const AVAILABLE_TOOLS = ['ZAP', 'OSV', 'Semgrep', 'Trivy', 'Gitleaks'];

export const AddPolicyModal: React.FC<AddPolicyModalProps> = ({ isOpen, onClose, onCreatePolicy }) => {
  const [formData, setFormData] = useState({
    name: '',
    mode: ScanMode.Safe,
    maxReqPerMin: 120,
    spiderDepth: 5,
    allowedTools: ['ZAP', 'OSV']
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await onCreatePolicy({
        name: formData.name,
        mode: formData.mode,
        maxReqPerMin: formData.maxReqPerMin,
        spiderDepth: formData.spiderDepth,
        allowedTools: formData.allowedTools
      });

      // Reset form
      setFormData({
        name: '',
        mode: ScanMode.Safe,
        maxReqPerMin: 120,
        spiderDepth: 5,
        allowedTools: ['ZAP', 'OSV']
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create policy');
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

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-white mb-4">Create New Policy</h2>
        
        {error && (
          <div className="bg-red-600 text-white p-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Policy Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Scan Mode
              </label>
              <select
                value={formData.mode}
                onChange={(e) => handleInputChange('mode', e.target.value as ScanMode)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={ScanMode.Safe}>Safe</option>
                <option value={ScanMode.Aggressive}>Aggressive</option>
              </select>
              <p className="text-xs text-gray-400 mt-1">Safe mode ensures scans don't damage your application</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Max Requests Per Minute
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                value={formData.maxReqPerMin}
                onChange={(e) => handleInputChange('maxReqPerMin', parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-xs text-gray-400 mt-1">Lower = slower scan, less impact on your app</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Spider Depth
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={formData.spiderDepth}
                onChange={(e) => handleInputChange('spiderDepth', parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-xs text-gray-400 mt-1">How deep to crawl your application (1 = main pages only)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Allowed Tools
                <span className="text-xs text-gray-400 ml-2">(Choose which security scanners to use)</span>
              </label>
              <div className="space-y-2">
                {AVAILABLE_TOOLS.map(tool => (
                  <label key={tool} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.allowedTools.includes(tool)}
                      onChange={() => handleToolToggle(tool)}
                      className="mr-2 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-300">{tool}</span>
                    <span className="text-xs text-gray-400 ml-2">
                      {tool === 'ZAP' && '(Web security testing)'}
                      {tool === 'OSV' && '(Dependency vulnerabilities)'}
                      {tool === 'Semgrep' && '(Static code analysis)'}
                      {tool === 'Trivy' && '(Container scanning)'}
                      {tool === 'Gitleaks' && '(Secret detection)'}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || formData.allowedTools.length === 0}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Policy'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

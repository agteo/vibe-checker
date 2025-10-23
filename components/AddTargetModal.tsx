import React, { useState } from 'react';
import { TargetApp, TargetType, RiskTier } from '../types';
import { Modal } from './Modal';

interface AddTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTarget: (target: Omit<TargetApp, 'id' | 'lastScanAt'>) => Promise<void>;
}

export const AddTargetModal: React.FC<AddTargetModalProps> = ({ isOpen, onClose, onCreateTarget }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: TargetType.Web,
    identifiers: '',
    riskTier: RiskTier.Medium,
    tags: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const tagsArray = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      
      await onCreateTarget({
        name: formData.name,
        type: formData.type,
        identifiers: formData.identifiers,
        riskTier: formData.riskTier,
        tags: tagsArray
      });

      // Reset form
      setFormData({
        name: '',
        type: TargetType.Web,
        identifiers: '',
        riskTier: RiskTier.Medium,
        tags: ''
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create target');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-white mb-4">Add New Target</h2>
        
        {error && (
          <div className="bg-red-600 text-white p-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Target Name
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
                Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value as TargetType)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={TargetType.Web}>Web</option>
                <option value={TargetType.API}>API</option>
                <option value={TargetType.Repo}>Repository</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Identifiers (URL, Repository, etc.)
              </label>
              <input
                type="text"
                value={formData.identifiers}
                onChange={(e) => handleInputChange('identifiers', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com or github.com/user/repo"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Risk Tier
              </label>
              <select
                value={formData.riskTier}
                onChange={(e) => handleInputChange('riskTier', e.target.value as RiskTier)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={RiskTier.Low}>Low</option>
                <option value={RiskTier.Medium}>Medium</option>
                <option value={RiskTier.High}>High</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => handleInputChange('tags', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="frontend, critical, production"
              />
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
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Target'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

import React, { useState } from 'react';
import type { CreateProposalForm } from '../types';

interface CreateProposalProps {
  onSubmit: (formData: CreateProposalForm) => Promise<string>;
  onCancel: () => void;
}

const CreateProposal: React.FC<CreateProposalProps> = ({
  onSubmit,
  onCancel,
}) => {
  const [formData, setFormData] = useState<CreateProposalForm>({
    title: '',
    description: '',
    category: 'general',
    tags: [],
    summary: '',
    motivation: '',
    specification: '',
    rationale: '',
    implementation: '',
    timeline: '',
    budget: undefined,
    links: [],
    attachments: [],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await onSubmit(formData);
      // Success handled by parent component
    } catch (error) {
      console.error('Failed to create proposal:', error);
      // TODO: Show error notification
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create Proposal</h1>
        <button
          onClick={onCancel}
          className="btn-secondary"
        >
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Basic Information</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="input"
                placeholder="Enter proposal title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                required
                rows={6}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input"
                placeholder="Describe your proposal in detail"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="input"
                >
                  <option value="general">General</option>
                  <option value="development">Development</option>
                  <option value="treasury">Treasury</option>
                  <option value="governance">Governance</option>
                  <option value="community">Community</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Summary *
                </label>
                <input
                  type="text"
                  required
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  className="input"
                  placeholder="Brief summary"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Additional Details</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivation
              </label>
              <textarea
                rows={4}
                value={formData.motivation}
                onChange={(e) => setFormData({ ...formData, motivation: e.target.value })}
                className="input"
                placeholder="Why is this proposal needed?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Implementation
              </label>
              <textarea
                rows={4}
                value={formData.implementation}
                onChange={(e) => setFormData({ ...formData, implementation: e.target.value })}
                className="input"
                placeholder="How will this be implemented?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Timeline
              </label>
              <input
                type="text"
                value={formData.timeline}
                onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                className="input"
                placeholder="Expected timeline (e.g., 3 months)"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary"
          >
            {isSubmitting ? 'Creating...' : 'Create Proposal'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateProposal;

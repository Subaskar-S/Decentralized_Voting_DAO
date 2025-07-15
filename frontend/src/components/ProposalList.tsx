import React from 'react';
import type { Proposal } from '../types';

interface ProposalListProps {
  proposals: Proposal[];
  loading: boolean;
  onProposalClick: (proposalId: string) => void;
  onVoteClick: (proposalId: string) => void;
}

const ProposalList: React.FC<ProposalListProps> = ({
  proposals,
  loading,
  onProposalClick,
  onVoteClick,
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-gray-600">Loading proposals...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">All Proposals</h1>
      
      {proposals.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No proposals found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {proposals.map((proposal) => (
            <div key={proposal.id} className="card-hover">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {proposal.title}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {proposal.description || 'No description available'}
                  </p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>Votes: {proposal.totalVotes}</span>
                    <span>Voters: {proposal.totalVoters}</span>
                    <span className={`status-${proposal.status}`}>
                      {proposal.status}
                    </span>
                  </div>
                </div>
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => onProposalClick(proposal.id)}
                    className="btn-outline"
                  >
                    View
                  </button>
                  {proposal.status === 'active' && (
                    <button
                      onClick={() => onVoteClick(proposal.id)}
                      className="btn-primary"
                    >
                      Vote
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProposalList;

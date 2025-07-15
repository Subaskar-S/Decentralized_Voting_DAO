import React from 'react';
import type { Proposal, ProposalMetadata } from '../types';

interface ProposalDetailProps {
  proposalId: string;
  proposal?: Proposal;
  onVoteClick: () => void;
  onBack: () => void;
  fetchMetadata: (ipfsHash: string) => Promise<ProposalMetadata | null>;
}

const ProposalDetail: React.FC<ProposalDetailProps> = ({
  proposalId: _proposalId,
  proposal,
  onVoteClick,
  onBack,
  fetchMetadata: _fetchMetadata,
}) => {
  if (!proposal) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Proposal not found</p>
        <button onClick={onBack} className="btn-primary mt-4">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to Proposals</span>
        </button>
        
        {proposal.status === 'active' && (
          <button onClick={onVoteClick} className="btn-primary">
            Vote on Proposal
          </button>
        )}
      </div>

      <div className="space-y-8">
        <div className="card">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {proposal.title}
              </h1>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>Proposal #{proposal.id}</span>
                <span>By {proposal.proposer.slice(0, 6)}...{proposal.proposer.slice(-4)}</span>
                <span className={`status-${proposal.status}`}>
                  {proposal.status}
                </span>
              </div>
            </div>
          </div>

          <div className="prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              {proposal.description || 'No description available'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-2">Total Votes</h3>
            <p className="text-2xl font-bold text-primary-600">{proposal.totalVotes}</p>
          </div>
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-2">Total Voters</h3>
            <p className="text-2xl font-bold text-success-600">{proposal.totalVoters}</p>
          </div>
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-2">Status</h3>
            <span className={`status-${proposal.status} text-lg`}>
              {proposal.status}
            </span>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Voting Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600">Start Time</p>
              <p className="font-medium">
                {new Date(proposal.startTime * 1000).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">End Time</p>
              <p className="font-medium">
                {new Date(proposal.endTime * 1000).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">IPFS Metadata</h2>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-2">IPFS Hash:</p>
            <p className="font-mono text-sm break-all">{proposal.ipfsHash}</p>
            <a
              href={`https://ipfs.io/ipfs/${proposal.ipfsHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-700 text-sm mt-2 inline-block"
            >
              View on IPFS →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProposalDetail;

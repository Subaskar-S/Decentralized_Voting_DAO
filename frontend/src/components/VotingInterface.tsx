import React, { useState, useEffect } from 'react';
import type { Proposal } from '../types';
import { calculateQuadraticCost, calculateMaxVotes, formatTokenAmount } from '../utils';

interface VotingInterfaceProps {
  proposalId: string;
  proposal?: Proposal;
  wallet: {
    formattedTokenBalance: string;
    address: string | null;
  };
  onVote: (proposalId: string, votes: number) => Promise<void>;
  onBack: () => void;
  getUserVote: (proposalId: string) => Promise<number>;
}

const VotingInterface: React.FC<VotingInterfaceProps> = ({
  proposalId,
  proposal,
  wallet,
  onVote,
  onBack,
  getUserVote,
}) => {
  const [votes, setVotes] = useState(1);
  const [isVoting, setIsVoting] = useState(false);
  const [userVote, setUserVote] = useState(0);

  useEffect(() => {
    const fetchUserVote = async () => {
      if (wallet.address) {
        const existingVote = await getUserVote(proposalId);
        setUserVote(existingVote);
      }
    };
    fetchUserVote();
  }, [proposalId, wallet.address, getUserVote]);

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

  const tokenCost = calculateQuadraticCost(votes);
  const maxVotes = calculateMaxVotes(wallet.formattedTokenBalance);
  const hasAlreadyVoted = userVote > 0;

  const handleVote = async () => {
    setIsVoting(true);
    try {
      await onVote(proposalId, votes);
      // Success handled by parent component
    } catch (error) {
      console.error('Failed to vote:', error);
      // TODO: Show error notification
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to Proposal</span>
        </button>
      </div>

      <div className="space-y-8">
        <div className="card">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Vote on Proposal</h1>
          <div className="bg-gray-50 rounded-lg p-4">
            <h2 className="font-semibold text-gray-900 mb-2">{proposal.title}</h2>
            <p className="text-sm text-gray-600">
              Proposal #{proposal.id} • {proposal.status}
            </p>
          </div>
        </div>

        {hasAlreadyVoted ? (
          <div className="card bg-warning-50 border-warning-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-warning-600 rounded-full flex items-center justify-center">
                <span className="text-white">✓</span>
              </div>
              <div>
                <h3 className="font-medium text-warning-900">Already Voted</h3>
                <p className="text-sm text-warning-700">
                  You have already cast {userVote} votes on this proposal
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Cast Your Vote</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Votes
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="1"
                      max={Math.min(maxVotes, 100)}
                      value={votes}
                      onChange={(e) => setVotes(parseInt(e.target.value))}
                      className="flex-1"
                    />
                    <div className="w-20">
                      <input
                        type="number"
                        min="1"
                        max={Math.min(maxVotes, 100)}
                        value={votes}
                        onChange={(e) => setVotes(Math.max(1, parseInt(e.target.value) || 1))}
                        className="input text-center"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-primary-50 rounded-lg p-4">
                  <h3 className="font-medium text-primary-900 mb-3">Quadratic Voting Cost</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-primary-700">Votes:</span>
                      <span className="font-medium text-primary-900">{votes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-primary-700">Token Cost:</span>
                      <span className="font-medium text-primary-900">{tokenCost} DAOGOV</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-primary-700">Your Balance:</span>
                      <span className="font-medium text-primary-900">
                        {formatTokenAmount(wallet.formattedTokenBalance)} DAOGOV
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">How Quadratic Voting Works</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Vote cost = votes²</li>
                    <li>• 1 vote costs 1 token, 2 votes cost 4 tokens, etc.</li>
                    <li>• This prevents wealthy voters from dominating</li>
                    <li>• Encourages broader participation</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                onClick={onBack}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleVote}
                disabled={isVoting || tokenCost > parseFloat(wallet.formattedTokenBalance)}
                className="btn-primary"
              >
                {isVoting ? 'Voting...' : `Vote with ${votes} votes`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VotingInterface;

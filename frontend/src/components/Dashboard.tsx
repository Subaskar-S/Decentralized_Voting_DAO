import React from 'react';
import { formatTokenAmount, formatRelativeTime } from '../utils';
import type { Proposal } from '../types';

interface DashboardProps {
  wallet: {
    address: string | null;
    formattedTokenBalance: string;
    formattedVotingPower: string;
    delegatedTo: string | null;
  };
  proposals: {
    totalProposals: number;
    activeProposals: Proposal[];
    pendingProposals: Proposal[];
    completedProposals: Proposal[];
  };
  onProposalClick: (proposalId: string) => void;
  onCreateClick: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  wallet,
  proposals,
  onProposalClick,
  onCreateClick,
}) => {
  const stats = [
    {
      title: 'Active Proposals',
      value: proposals.activeProposals.length,
      icon: '🗳️',
      color: 'text-success-600',
      bgColor: 'bg-success-100',
    },
    {
      title: 'Your Voting Power',
      value: `${formatTokenAmount(wallet.formattedVotingPower)} DAOGOV`,
      icon: '⚡',
      color: 'text-primary-600',
      bgColor: 'bg-primary-100',
    },
    {
      title: 'Total Proposals',
      value: proposals.totalProposals,
      icon: '📋',
      color: 'text-secondary-600',
      bgColor: 'bg-secondary-100',
    },
    {
      title: 'Pending Proposals',
      value: proposals.pendingProposals.length,
      icon: '⏳',
      color: 'text-warning-600',
      bgColor: 'bg-warning-100',
    },
  ];

  const recentProposals = [
    ...proposals.activeProposals,
    ...proposals.pendingProposals,
  ]
    .sort((a, b) => b.startTime - a.startTime)
    .slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome back! Here's what's happening in the DAO.
          </p>
        </div>
        <button
          onClick={onCreateClick}
          className="btn-primary flex items-center space-x-2"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Create Proposal</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="card-hover">
            <div className="flex items-center">
              <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center mr-4`}>
                <span className="text-xl">{stat.icon}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Delegation Status */}
      {wallet.delegatedTo && (
        <div className="card bg-primary-50 border-primary-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
              <span className="text-white">🔗</span>
            </div>
            <div>
              <h3 className="font-medium text-primary-900">Votes Delegated</h3>
              <p className="text-sm text-primary-700">
                You have delegated your voting power to{' '}
                <span className="font-mono">{wallet.delegatedTo.slice(0, 6)}...{wallet.delegatedTo.slice(-4)}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Proposals */}
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Recent Proposals</h2>
            <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              View All
            </button>
          </div>

          {recentProposals.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl text-gray-400">📋</span>
              </div>
              <p className="text-gray-500">No proposals yet</p>
              <button
                onClick={onCreateClick}
                className="btn-outline mt-4"
              >
                Create First Proposal
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {recentProposals.map((proposal) => (
                <div
                  key={proposal.id}
                  onClick={() => onProposalClick(proposal.id)}
                  className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 cursor-pointer transition-all"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-gray-900 line-clamp-1">
                      {proposal.title}
                    </h3>
                    <span className={`status-${proposal.status} ml-2 flex-shrink-0`}>
                      {proposal.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                    {proposal.description || 'No description available'}
                  </p>
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>By {proposal.proposer.slice(0, 6)}...{proposal.proposer.slice(-4)}</span>
                    <span>{formatRelativeTime(proposal.startTime)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
          
          <div className="space-y-4">
            <button
              onClick={onCreateClick}
              className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-400 hover:bg-primary-50 transition-all group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary-100 group-hover:bg-primary-200 rounded-lg flex items-center justify-center">
                  <svg className="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">Create Proposal</p>
                  <p className="text-sm text-gray-600">Submit a new proposal for voting</p>
                </div>
              </div>
            </button>

            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center">
                  <span className="text-success-600">🔗</span>
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">Delegate Votes</p>
                  <p className="text-sm text-gray-600">Delegate your voting power to another member</p>
                </div>
              </div>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-warning-100 rounded-lg flex items-center justify-center">
                  <span className="text-warning-600">📊</span>
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">View Analytics</p>
                  <p className="text-sm text-gray-600">Explore governance statistics and trends</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

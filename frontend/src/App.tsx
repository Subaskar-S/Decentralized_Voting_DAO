import { useState } from 'react';
import { useWallet } from './hooks/useWallet';
import { useProposals } from './hooks/useProposals';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ProposalList from './components/ProposalList';
import CreateProposal from './components/CreateProposal';
import ProposalDetail from './components/ProposalDetail';
import VotingInterface from './components/VotingInterface';
import WalletConnect from './components/WalletConnect';
import LoadingSpinner from './components/LoadingSpinner';
import NotificationContainer from './components/NotificationContainer';

type ActiveView = 'dashboard' | 'proposals' | 'create' | 'proposal-detail' | 'voting';

function App() {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const wallet = useWallet();
  const proposals = useProposals();

  // Handle proposal selection
  const handleProposalSelect = (proposalId: string) => {
    setSelectedProposalId(proposalId);
    setActiveView('proposal-detail');
  };

  // Handle voting on proposal
  const handleVoteClick = (proposalId: string) => {
    setSelectedProposalId(proposalId);
    setActiveView('voting');
  };

  // Render main content based on active view
  const renderMainContent = () => {
    if (!wallet.isConnected) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <WalletConnect
            onConnect={wallet.connect}
            isConnecting={wallet.isConnecting}
            isWalletAvailable={wallet.isWalletAvailable}
          />
        </div>
      );
    }

    switch (activeView) {
      case 'dashboard':
        return (
          <Dashboard
            wallet={wallet}
            proposals={proposals}
            onProposalClick={handleProposalSelect}
            onCreateClick={() => setActiveView('create')}
          />
        );

      case 'proposals':
        return (
          <ProposalList
            proposals={proposals.proposals}
            loading={proposals.loading}
            onProposalClick={handleProposalSelect}
            onVoteClick={handleVoteClick}
          />
        );

      case 'create':
        return (
          <CreateProposal
            onSubmit={proposals.createProposal}
            onCancel={() => setActiveView('dashboard')}
          />
        );

      case 'proposal-detail':
        if (!selectedProposalId) {
          setActiveView('dashboard');
          return null;
        }
        return (
          <ProposalDetail
            proposalId={selectedProposalId}
            proposal={proposals.getProposal(selectedProposalId)}
            onVoteClick={() => handleVoteClick(selectedProposalId)}
            onBack={() => setActiveView('proposals')}
            fetchMetadata={proposals.fetchProposalMetadata}
          />
        );

      case 'voting':
        if (!selectedProposalId) {
          setActiveView('dashboard');
          return null;
        }
        return (
          <VotingInterface
            proposalId={selectedProposalId}
            proposal={proposals.getProposal(selectedProposalId)}
            wallet={wallet}
            onVote={proposals.voteOnProposal}
            onBack={() => setActiveView('proposal-detail')}
            getUserVote={proposals.getUserVote}
          />
        );

      default:
        return (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">View not found</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {wallet.isConnected && (
        <>
          <Header
            wallet={wallet}
            onMenuClick={() => setSidebarOpen(!sidebarOpen)}
            onDisconnect={wallet.disconnect}
          />

          <div className="flex">
            <Sidebar
              activeView={activeView}
              onViewChange={setActiveView}
              isOpen={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
              proposalCounts={{
                total: proposals.totalProposals,
                active: proposals.activeProposals.length,
                pending: proposals.pendingProposals.length,
              }}
            />

            <main className={`flex-1 transition-all duration-300 ${
              sidebarOpen ? 'lg:ml-64' : ''
            }`}>
              <div className="p-6">
                {renderMainContent()}
              </div>
            </main>
          </div>
        </>
      )}

      {!wallet.isConnected && renderMainContent()}

      <NotificationContainer />

      {(wallet.isConnecting || proposals.loading) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <LoadingSpinner message={
            wallet.isConnecting ? 'Connecting wallet...' : 'Loading proposals...'
          } />
        </div>
      )}
    </div>
  );
}

export default App;

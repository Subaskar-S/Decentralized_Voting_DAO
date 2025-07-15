import React from 'react';

interface WalletConnectProps {
  onConnect: () => Promise<void>;
  isConnecting: boolean;
  isWalletAvailable: boolean;
}

const WalletConnect: React.FC<WalletConnectProps> = ({
  onConnect,
  isConnecting,
  isWalletAvailable,
}) => {
  const handleConnect = async () => {
    try {
      await onConnect();
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);
      // TODO: Show error notification
    }
  };

  return (
    <div className="card max-w-md mx-auto">
      <div className="text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🏛️</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome to DAO Governance
          </h2>
          <p className="text-gray-600">
            Connect your wallet to participate in decentralized governance
          </p>
        </div>

        {!isWalletAvailable ? (
          <div className="space-y-4">
            <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
              <div className="flex items-center">
                <span className="text-warning-600 mr-2">⚠️</span>
                <p className="text-warning-800 text-sm">
                  No Ethereum wallet detected
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                You need a Web3 wallet to continue:
              </p>
              
              <div className="grid grid-cols-1 gap-2">
                <a
                  href="https://metamask.io/download/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary flex items-center justify-center space-x-2"
                >
                  <span>🦊</span>
                  <span>Install MetaMask</span>
                </a>
                
                <a
                  href="https://wallet.coinbase.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline flex items-center justify-center space-x-2"
                >
                  <span>🔵</span>
                  <span>Get Coinbase Wallet</span>
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
              <div className="flex items-center">
                <span className="text-primary-600 mr-2">ℹ️</span>
                <p className="text-primary-800 text-sm">
                  Click below to connect your wallet securely
                </p>
              </div>
            </div>
            
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="btn-primary w-full flex items-center justify-center space-x-2"
            >
              {isConnecting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <span>🔗</span>
                  <span>Connect Wallet</span>
                </>
              )}
            </button>
            
            <div className="text-xs text-gray-500 space-y-1">
              <p>By connecting, you agree to our Terms of Service</p>
              <p>We never store your private keys or seed phrase</p>
            </div>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            What you can do:
          </h3>
          <div className="grid grid-cols-1 gap-2 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <span className="text-success-500">✓</span>
              <span>Create and vote on proposals</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-success-500">✓</span>
              <span>Delegate your voting power</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-success-500">✓</span>
              <span>View governance analytics</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-success-500">✓</span>
              <span>Participate in treasury decisions</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletConnect;

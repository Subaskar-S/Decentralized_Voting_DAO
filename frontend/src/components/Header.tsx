import React, { useState } from 'react';
import { formatAddress, formatTokenAmount } from '../utils';

interface HeaderProps {
  wallet: {
    address: string | null;
    formattedBalance: string;
    formattedTokenBalance: string;
    formattedVotingPower: string;
  };
  onMenuClick: () => void;
  onDisconnect: () => void;
}

const Header: React.FC<HeaderProps> = ({
  wallet,
  onMenuClick,
  onDisconnect,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Logo and menu */}
          <div className="flex items-center space-x-4">
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">🏛️</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">DAO Governance</h1>
                <p className="text-xs text-gray-500 hidden sm:block">Decentralized Decision Making</p>
              </div>
            </div>
          </div>

          {/* Right side - User info and actions */}
          <div className="flex items-center space-x-4">
            {/* Network indicator */}
            <div className="hidden md:flex items-center space-x-2 px-3 py-1 bg-success-100 text-success-800 rounded-full text-sm">
              <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
              <span>Mainnet</span>
            </div>

            {/* Token balance */}
            <div className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-gray-100 rounded-lg">
              <span className="text-sm font-medium text-gray-700">
                {formatTokenAmount(wallet.formattedTokenBalance)} DAOGOV
              </span>
            </div>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {wallet.address ? wallet.address.slice(2, 4).toUpperCase() : '??'}
                  </span>
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-900">
                    {wallet.address ? formatAddress(wallet.address) : 'Not connected'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {wallet.formattedVotingPower} voting power
                  </p>
                </div>
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-900">Wallet Info</p>
                    <p className="text-xs text-gray-500 font-mono mt-1">
                      {wallet.address}
                    </p>
                  </div>
                  
                  <div className="px-4 py-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">ETH Balance:</span>
                      <span className="font-medium">{wallet.formattedBalance}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">DAOGOV Balance:</span>
                      <span className="font-medium">{wallet.formattedTokenBalance}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Voting Power:</span>
                      <span className="font-medium">{wallet.formattedVotingPower}</span>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 py-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(wallet.address || '');
                        setShowUserMenu(false);
                        // TODO: Show success notification
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>Copy Address</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onDisconnect();
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-error-600 hover:bg-error-50 flex items-center space-x-2"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Disconnect</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Click outside to close menu */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </header>
  );
};

export default Header;

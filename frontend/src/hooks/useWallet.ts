import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import type { WalletState } from '../types';
import { CONTRACT_ADDRESSES, TOKEN_CONFIG } from '../constants';

// Extend Window interface for ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

// TODO: Replace with actual contract ABIs
const GOVERNANCE_TOKEN_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function getVotes(address account) view returns (uint256)',
  'function delegate(address delegatee)',
  'function delegates(address account) view returns (address)',
  'function approve(address spender, uint256 amount) returns (bool)',
];

const DAO_GOVERNANCE_ABI = [
  'function delegatedVotes(address account) view returns (uint256)',
  'function delegatedTo(address account) view returns (address)',
];

export const useWallet = () => {
  const [walletState, setWalletState] = useState<WalletState>({
    address: null,
    isConnected: false,
    isConnecting: false,
    balance: '0',
    tokenBalance: '0',
    votingPower: '0',
    delegatedTo: null,
    delegatedVotes: '0',
  });

  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);

  // Initialize provider and check for existing connection
  useEffect(() => {
    const initializeProvider = async () => {
      if (typeof window.ethereum !== 'undefined') {
        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        setProvider(browserProvider);

        // Check if already connected
        try {
          const accounts = await browserProvider.listAccounts();
          if (accounts.length > 0) {
            const signer = await browserProvider.getSigner();
            setSigner(signer);
            await updateWalletState(signer, browserProvider);
          }
        } catch (error) {
          console.error('Error checking existing connection:', error);
        }
      }
    };

    initializeProvider();
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      const handleAccountsChanged = async (accounts: string[]) => {
        if (accounts.length === 0) {
          // User disconnected
          setWalletState(prev => ({
            ...prev,
            address: null,
            isConnected: false,
            balance: '0',
            tokenBalance: '0',
            votingPower: '0',
            delegatedTo: null,
            delegatedVotes: '0',
          }));
          setSigner(null);
        } else if (provider) {
          // Account changed
          const newSigner = await provider.getSigner();
          setSigner(newSigner);
          await updateWalletState(newSigner, provider);
        }
      };

      const handleChainChanged = () => {
        // Reload the page when chain changes
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [provider]);

  // Update wallet state with current data
  const updateWalletState = async (
    signer: ethers.JsonRpcSigner,
    provider: ethers.BrowserProvider
  ) => {
    try {
      const address = await signer.getAddress();
      const balance = await provider.getBalance(address);

      // Get token contract instance
      const tokenContract = new ethers.Contract(
        CONTRACT_ADDRESSES.governanceToken,
        GOVERNANCE_TOKEN_ABI,
        signer
      );

      // Get DAO governance contract instance
      const governanceContract = new ethers.Contract(
        CONTRACT_ADDRESSES.daoGovernance,
        DAO_GOVERNANCE_ABI,
        signer
      );

      // Fetch token data
      const [tokenBalance, votingPower, delegatedTo, delegatedVotes] = await Promise.all([
        tokenContract.balanceOf(address),
        tokenContract.getVotes(address),
        tokenContract.delegates(address),
        governanceContract.delegatedVotes(address),
      ]);

      setWalletState({
        address,
        isConnected: true,
        isConnecting: false,
        balance: balance.toString(),
        tokenBalance: tokenBalance.toString(),
        votingPower: votingPower.toString(),
        delegatedTo: delegatedTo === address ? null : delegatedTo,
        delegatedVotes: delegatedVotes.toString(),
      });
    } catch (error) {
      console.error('Error updating wallet state:', error);
      setWalletState(prev => ({
        ...prev,
        isConnecting: false,
      }));
    }
  };

  // Connect wallet
  const connect = useCallback(async () => {
    if (!provider) {
      throw new Error('No wallet provider found. Please install MetaMask.');
    }

    setWalletState(prev => ({ ...prev, isConnecting: true }));

    try {
      // Request account access
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      setSigner(signer);
      await updateWalletState(signer, provider);
    } catch (error: any) {
      setWalletState(prev => ({ ...prev, isConnecting: false }));
      if (error.code === 4001) {
        throw new Error('User rejected the connection request');
      }
      throw new Error('Failed to connect wallet');
    }
  }, [provider]);

  // Disconnect wallet
  const disconnect = useCallback(() => {
    setWalletState({
      address: null,
      isConnected: false,
      isConnecting: false,
      balance: '0',
      tokenBalance: '0',
      votingPower: '0',
      delegatedTo: null,
      delegatedVotes: '0',
    });
    setSigner(null);
  }, []);

  // Refresh wallet data
  const refresh = useCallback(async () => {
    if (signer && provider) {
      await updateWalletState(signer, provider);
    }
  }, [signer, provider]);

  // Switch network
  const switchNetwork = useCallback(async (chainId: number) => {
    if (!provider) throw new Error('No wallet provider found');

    try {
      await provider.send('wallet_switchEthereumChain', [
        { chainId: `0x${chainId.toString(16)}` },
      ]);
    } catch (error: any) {
      // If network doesn't exist, add it
      if (error.code === 4902) {
        // TODO: Add network configuration for different chains
        throw new Error('Network not found in wallet');
      }
      throw error;
    }
  }, [provider]);

  // Get contract instance
  const getContract = useCallback((
    address: string,
    abi: any[]
  ): ethers.Contract | null => {
    if (!signer) return null;
    return new ethers.Contract(address, abi, signer);
  }, [signer]);

  // Sign message
  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (!signer) throw new Error('Wallet not connected');
    return await signer.signMessage(message);
  }, [signer]);

  return {
    // State
    ...walletState,
    provider,
    signer,
    
    // Actions
    connect,
    disconnect,
    refresh,
    switchNetwork,
    getContract,
    signMessage,
    
    // Computed
    isWalletAvailable: typeof window.ethereum !== 'undefined',
    formattedBalance: ethers.formatEther(walletState.balance),
    formattedTokenBalance: ethers.formatUnits(walletState.tokenBalance, TOKEN_CONFIG.DECIMALS),
    formattedVotingPower: ethers.formatUnits(walletState.votingPower, TOKEN_CONFIG.DECIMALS),
  };
};

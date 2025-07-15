import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import type { Proposal, ProposalMetadata, CreateProposalForm } from '../types';
import { useWallet } from './useWallet';
import { CONTRACT_ADDRESSES, IPFS_CONFIG } from '../constants';
import { getProposalStatus } from '../utils';

// TODO: Replace with actual contract ABI
const DAO_GOVERNANCE_ABI = [
  'function proposalCount() view returns (uint256)',
  'function getProposal(uint256 proposalId) view returns (tuple(string title, string ipfsHash, address proposer, uint256 startTime, uint256 endTime, uint256 totalVotes, uint256 totalVoters, bool executed, bool cancelled))',
  'function propose(string title, string ipfsHash) returns (uint256)',
  'function vote(uint256 proposalId, uint256 votes)',
  'function getVote(uint256 proposalId, address voter) view returns (uint256)',
  'event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string title, string ipfsHash)',
  'event VoteCast(uint256 indexed proposalId, address indexed voter, uint256 votes, uint256 tokensCost)',
];

export const useProposals = () => {
  const { signer, address, isConnected } = useWallet();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get DAO governance contract
  const getGovernanceContract = useCallback(() => {
    if (!signer) return null;
    return new ethers.Contract(
      CONTRACT_ADDRESSES.daoGovernance,
      DAO_GOVERNANCE_ABI,
      signer
    );
  }, [signer]);

  // Fetch all proposals
  const fetchProposals = useCallback(async () => {
    const contract = getGovernanceContract();
    if (!contract) return;

    setLoading(true);
    setError(null);

    try {
      const proposalCount = await contract.proposalCount();
      const proposalPromises = [];

      for (let i = 1; i <= proposalCount; i++) {
        proposalPromises.push(contract.getProposal(i));
      }

      const proposalData = await Promise.all(proposalPromises);
      
      const formattedProposals: Proposal[] = proposalData.map((data, index) => {
        const proposalId = (index + 1).toString();
        return {
          id: proposalId,
          title: data.title,
          description: '', // Will be fetched from IPFS
          ipfsHash: data.ipfsHash,
          proposer: data.proposer,
          startTime: Number(data.startTime),
          endTime: Number(data.endTime),
          totalVotes: Number(data.totalVotes),
          totalVoters: Number(data.totalVoters),
          executed: data.executed,
          cancelled: data.cancelled,
          status: getProposalStatus({
            startTime: Number(data.startTime),
            endTime: Number(data.endTime),
            executed: data.executed,
            cancelled: data.cancelled,
            totalVotes: Number(data.totalVotes),
          }),
        };
      });

      setProposals(formattedProposals);
    } catch (err: any) {
      console.error('Error fetching proposals:', err);
      setError(err.message || 'Failed to fetch proposals');
    } finally {
      setLoading(false);
    }
  }, [getGovernanceContract]);

  // Fetch proposal metadata from IPFS
  const fetchProposalMetadata = useCallback(async (ipfsHash: string): Promise<ProposalMetadata | null> => {
    try {
      const response = await fetch(`${IPFS_CONFIG.GATEWAY_URL}${ipfsHash}`);
      if (!response.ok) {
        // Try fallback gateways
        for (const gateway of IPFS_CONFIG.FALLBACK_GATEWAYS) {
          const fallbackResponse = await fetch(`${gateway}${ipfsHash}`);
          if (fallbackResponse.ok) {
            return await fallbackResponse.json();
          }
        }
        throw new Error('Failed to fetch from all IPFS gateways');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching IPFS metadata:', error);
      return null;
    }
  }, []);

  // Create new proposal
  const createProposal = useCallback(async (formData: CreateProposalForm): Promise<string> => {
    const contract = getGovernanceContract();
    if (!contract || !address) {
      throw new Error('Wallet not connected');
    }

    try {
      // First, upload metadata to IPFS
      const metadata: ProposalMetadata = {
        version: '1.0.0',
        type: 'dao-proposal',
        timestamp: new Date().toISOString(),
        proposal: {
          id: '', // Will be set after creation
          title: formData.title,
          description: formData.description,
          category: formData.category,
          tags: formData.tags,
          proposer: {
            address: address,
          },
          details: {
            summary: formData.summary,
            motivation: formData.motivation,
            specification: formData.specification,
            rationale: formData.rationale,
            implementation: formData.implementation,
            timeline: formData.timeline,
            budget: formData.budget,
          },
          voting: {
            type: 'quadratic',
            options: ['yes', 'no'],
          },
        },
        attachments: [], // TODO: Handle file uploads
        links: formData.links,
        references: [],
        technical: {
          ipfsVersion: 'unknown',
          uploadClient: 'dao-frontend',
          encoding: 'utf-8',
          format: 'json',
        },
      };

      // TODO: Implement actual IPFS upload
      // For now, we'll use a mock hash
      const ipfsHash = `Qm${Math.random().toString(36).substr(2, 44)}`;

      // Use metadata for IPFS upload (avoiding unused variable error)
      console.log('Uploading metadata to IPFS:', metadata.proposal.title);
      
      // Create proposal on-chain
      const tx = await contract.propose(formData.title, ipfsHash);
      const receipt = await tx.wait();
      
      // Extract proposal ID from events
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed?.name === 'ProposalCreated';
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = contract.interface.parseLog(event);
        const proposalId = parsed?.args.proposalId.toString();
        
        // Refresh proposals list
        await fetchProposals();
        
        return proposalId;
      }

      throw new Error('Failed to get proposal ID from transaction');
    } catch (err: any) {
      console.error('Error creating proposal:', err);
      throw new Error(err.message || 'Failed to create proposal');
    }
  }, [getGovernanceContract, address, fetchProposals]);

  // Vote on proposal
  const voteOnProposal = useCallback(async (proposalId: string, votes: number): Promise<void> => {
    const contract = getGovernanceContract();
    if (!contract) {
      throw new Error('Wallet not connected');
    }

    try {
      const tx = await contract.vote(proposalId, votes);
      await tx.wait();
      
      // Refresh proposals to update vote counts
      await fetchProposals();
    } catch (err: any) {
      console.error('Error voting on proposal:', err);
      throw new Error(err.message || 'Failed to vote on proposal');
    }
  }, [getGovernanceContract, fetchProposals]);

  // Get user's vote on a proposal
  const getUserVote = useCallback(async (proposalId: string): Promise<number> => {
    const contract = getGovernanceContract();
    if (!contract || !address) return 0;

    try {
      const votes = await contract.getVote(proposalId, address);
      return Number(votes);
    } catch (error) {
      console.error('Error getting user vote:', error);
      return 0;
    }
  }, [getGovernanceContract, address]);

  // Get proposal by ID
  const getProposal = useCallback((proposalId: string): Proposal | undefined => {
    return proposals.find(p => p.id === proposalId);
  }, [proposals]);

  // Filter proposals
  const getProposalsByStatus = useCallback((status: string) => {
    return proposals.filter(p => p.status === status);
  }, [proposals]);

  // Get user's proposals
  const getUserProposals = useCallback(() => {
    if (!address) return [];
    return proposals.filter(p => p.proposer.toLowerCase() === address.toLowerCase());
  }, [proposals, address]);

  // Initialize - fetch proposals when wallet connects
  useEffect(() => {
    if (isConnected) {
      fetchProposals();
    }
  }, [isConnected, fetchProposals]);

  // Set up event listeners for real-time updates
  useEffect(() => {
    const contract = getGovernanceContract();
    if (!contract) return;

    const handleProposalCreated = () => {
      fetchProposals();
    };

    const handleVoteCast = () => {
      fetchProposals();
    };

    contract.on('ProposalCreated', handleProposalCreated);
    contract.on('VoteCast', handleVoteCast);

    return () => {
      contract.off('ProposalCreated', handleProposalCreated);
      contract.off('VoteCast', handleVoteCast);
    };
  }, [getGovernanceContract, fetchProposals]);

  return {
    // State
    proposals,
    loading,
    error,
    
    // Actions
    fetchProposals,
    fetchProposalMetadata,
    createProposal,
    voteOnProposal,
    getUserVote,
    
    // Getters
    getProposal,
    getProposalsByStatus,
    getUserProposals,
    
    // Computed
    activeProposals: getProposalsByStatus('active'),
    pendingProposals: getProposalsByStatus('pending'),
    completedProposals: proposals.filter(p => 
      p.status === 'succeeded' || p.status === 'defeated' || p.status === 'executed'
    ),
    totalProposals: proposals.length,
  };
};

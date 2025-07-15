// Core DAO types
export interface Proposal {
  id: string;
  title: string;
  description: string;
  ipfsHash: string;
  proposer: string;
  startTime: number;
  endTime: number;
  totalVotes: number;
  totalVoters: number;
  executed: boolean;
  cancelled: boolean;
  status: ProposalStatus;
}

export const ProposalStatus = {
  PENDING: 'pending',
  ACTIVE: 'active',
  SUCCEEDED: 'succeeded',
  DEFEATED: 'defeated',
  CANCELLED: 'cancelled',
  EXECUTED: 'executed'
} as const;

export type ProposalStatus = typeof ProposalStatus[keyof typeof ProposalStatus];

export interface Vote {
  proposalId: string;
  voter: string;
  votes: number;
  tokensCost: string;
  timestamp: number;
}

export interface ProposalMetadata {
  version: string;
  type: string;
  timestamp: string;
  proposal: {
    id: string;
    title: string;
    description: string;
    category: string;
    tags: string[];
    proposer: {
      address: string;
      name?: string;
      contact?: string;
    };
    details: {
      summary: string;
      motivation?: string;
      specification?: string;
      rationale?: string;
      implementation?: string;
      timeline?: string;
      budget?: any;
    };
    voting: {
      type: string;
      startTime?: number;
      endTime?: number;
      quorum?: string;
      options: string[];
    };
  };
  attachments: Attachment[];
  links: Link[];
  references: string[];
  technical: {
    ipfsVersion: string;
    uploadClient: string;
    encoding: string;
    format: string;
  };
}

export interface Attachment {
  hash: string;
  name: string;
  size: number;
  type: string;
  uploadTime: string;
  checksum: string;
}

export interface Link {
  title: string;
  url: string;
}

// Wallet and Web3 types
export interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  balance: string;
  tokenBalance: string;
  votingPower: string;
  delegatedTo: string | null;
  delegatedVotes: string;
}

export interface ContractAddresses {
  governanceToken: string;
  daoGovernance: string;
  daoTreasury: string;
}

// UI types
export interface NotificationState {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: number;
  duration?: number;
}

export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

// Form types
export interface CreateProposalForm {
  title: string;
  description: string;
  category: string;
  tags: string[];
  summary: string;
  motivation?: string;
  specification?: string;
  rationale?: string;
  implementation?: string;
  timeline?: string;
  budget?: {
    total: string;
    breakdown: BudgetItem[];
  };
  links: Link[];
  attachments: File[];
}

export interface BudgetItem {
  item: string;
  amount: string;
}

export interface VoteForm {
  proposalId: string;
  votes: number;
  tokensCost: string;
}

// Treasury types
export interface TreasuryBalance {
  token: string;
  balance: string;
  allocated: string;
  available: string;
}

export interface BudgetAllocation {
  category: string;
  token: string;
  totalBudget: string;
  spentAmount: string;
  remainingBudget: string;
  active: boolean;
}

// Analytics types
export interface VotingAnalytics {
  totalProposals: number;
  activeProposals: number;
  totalVotes: number;
  totalVoters: number;
  participationRate: number;
  averageVotesPerProposal: number;
  topCategories: CategoryStats[];
}

export interface CategoryStats {
  category: string;
  count: number;
  percentage: number;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Event types
export interface ContractEvent {
  event: string;
  args: any;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
}

// Utility types
export type Address = `0x${string}`;
export type Hash = string;
export type BigNumberish = string | number | bigint;

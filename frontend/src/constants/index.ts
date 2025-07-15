import type { ContractAddresses } from '../types';

// Contract addresses - these will be updated after deployment
export const CONTRACT_ADDRESSES: ContractAddresses = {
  governanceToken: process.env.VITE_GOVERNANCE_TOKEN_ADDRESS || '',
  daoGovernance: process.env.VITE_DAO_GOVERNANCE_ADDRESS || '',
  daoTreasury: process.env.VITE_DAO_TREASURY_ADDRESS || '',
};

// Network configuration
export const SUPPORTED_CHAINS = {
  HARDHAT: {
    id: 31337,
    name: 'Hardhat',
    network: 'hardhat',
    nativeCurrency: {
      decimals: 18,
      name: 'Ethereum',
      symbol: 'ETH',
    },
    rpcUrls: {
      default: {
        http: ['http://127.0.0.1:8545'],
      },
      public: {
        http: ['http://127.0.0.1:8545'],
      },
    },
  },
  SEPOLIA: {
    id: 11155111,
    name: 'Sepolia',
    network: 'sepolia',
    nativeCurrency: {
      decimals: 18,
      name: 'Ethereum',
      symbol: 'ETH',
    },
    rpcUrls: {
      default: {
        http: ['https://rpc.sepolia.org'],
      },
      public: {
        http: ['https://rpc.sepolia.org'],
      },
    },
    blockExplorers: {
      default: { name: 'Etherscan', url: 'https://sepolia.etherscan.io' },
    },
  },
} as const;

// Token configuration
export const TOKEN_CONFIG = {
  SYMBOL: 'DAOGOV',
  NAME: 'DAO Governance Token',
  DECIMALS: 18,
  INITIAL_SUPPLY: '100000000', // 100M tokens
  MAX_SUPPLY: '1000000000', // 1B tokens
};

// Governance parameters
export const GOVERNANCE_CONFIG = {
  PROPOSAL_THRESHOLD: '1000', // 1K tokens
  VOTING_DELAY: 24 * 60 * 60, // 1 day in seconds
  VOTING_PERIOD: 7 * 24 * 60 * 60, // 7 days in seconds
  QUORUM_THRESHOLD: '100000', // 100K tokens
  MAX_VOTES_PER_WALLET: 10000,
  PROPOSAL_COOLDOWN: 24 * 60 * 60, // 1 day in seconds
};

// UI configuration
export const UI_CONFIG = {
  ITEMS_PER_PAGE: 10,
  NOTIFICATION_DURATION: 5000, // 5 seconds
  POLLING_INTERVAL: 30000, // 30 seconds
  DEBOUNCE_DELAY: 500, // 500ms
  ANIMATION_DURATION: 300, // 300ms
};

// IPFS configuration
export const IPFS_CONFIG = {
  GATEWAY_URL: 'https://ipfs.io/ipfs/',
  FALLBACK_GATEWAYS: [
    'https://gateway.pinata.cloud/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/',
    'https://dweb.link/ipfs/',
  ],
  MAX_FILE_SIZE: 20 * 1024 * 1024, // 20MB
  SUPPORTED_FILE_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/markdown',
    'application/json',
  ],
};

// Proposal categories
export const PROPOSAL_CATEGORIES = [
  { value: 'general', label: 'General', color: 'bg-secondary-500' },
  { value: 'development', label: 'Development', color: 'bg-primary-500' },
  { value: 'treasury', label: 'Treasury', color: 'bg-success-500' },
  { value: 'governance', label: 'Governance', color: 'bg-warning-500' },
  { value: 'community', label: 'Community', color: 'bg-purple-500' },
  { value: 'partnership', label: 'Partnership', color: 'bg-indigo-500' },
  { value: 'marketing', label: 'Marketing', color: 'bg-pink-500' },
  { value: 'research', label: 'Research', color: 'bg-teal-500' },
] as const;

// Status colors and labels
export const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    color: 'bg-warning-100 text-warning-800',
    icon: '⏳',
  },
  active: {
    label: 'Active',
    color: 'bg-success-100 text-success-800',
    icon: '🗳️',
  },
  succeeded: {
    label: 'Succeeded',
    color: 'bg-primary-100 text-primary-800',
    icon: '✅',
  },
  defeated: {
    label: 'Defeated',
    color: 'bg-error-100 text-error-800',
    icon: '❌',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-secondary-100 text-secondary-800',
    icon: '🚫',
  },
  executed: {
    label: 'Executed',
    color: 'bg-secondary-100 text-secondary-800',
    icon: '⚡',
  },
} as const;

// Error messages
export const ERROR_MESSAGES = {
  WALLET_NOT_CONNECTED: 'Please connect your wallet to continue',
  INSUFFICIENT_BALANCE: 'Insufficient token balance',
  INSUFFICIENT_VOTING_POWER: 'Insufficient voting power',
  PROPOSAL_NOT_FOUND: 'Proposal not found',
  VOTING_NOT_ACTIVE: 'Voting is not currently active for this proposal',
  ALREADY_VOTED: 'You have already voted on this proposal',
  INVALID_VOTE_AMOUNT: 'Invalid vote amount',
  TRANSACTION_FAILED: 'Transaction failed. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  IPFS_ERROR: 'Failed to upload to IPFS. Please try again.',
  FORM_VALIDATION_ERROR: 'Please fix the form errors before submitting',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  WALLET_CONNECTED: 'Wallet connected successfully',
  PROPOSAL_CREATED: 'Proposal created successfully',
  VOTE_CAST: 'Vote cast successfully',
  DELEGATION_SUCCESS: 'Vote delegation successful',
  DELEGATION_REVOKED: 'Vote delegation revoked',
  TRANSACTION_CONFIRMED: 'Transaction confirmed',
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  WALLET_PREFERENCE: 'dao_wallet_preference',
  THEME_PREFERENCE: 'dao_theme_preference',
  NOTIFICATION_SETTINGS: 'dao_notification_settings',
  DRAFT_PROPOSALS: 'dao_draft_proposals',
} as const;

// API endpoints (if using a backend)
export const API_ENDPOINTS = {
  PROPOSALS: '/api/proposals',
  VOTES: '/api/votes',
  ANALYTICS: '/api/analytics',
  IPFS_UPLOAD: '/api/ipfs/upload',
  METADATA: '/api/metadata',
} as const;

// Regex patterns
export const REGEX_PATTERNS = {
  ETHEREUM_ADDRESS: /^0x[a-fA-F0-9]{40}$/,
  IPFS_HASH: /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/,
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
} as const;

// Feature flags
export const FEATURE_FLAGS = {
  ENABLE_DELEGATION: true,
  ENABLE_TREASURY: true,
  ENABLE_ANALYTICS: true,
  ENABLE_NOTIFICATIONS: true,
  ENABLE_DARK_MODE: true,
  ENABLE_IPFS_UPLOAD: true,
} as const;

// Chart colors for analytics
export const CHART_COLORS = [
  '#0ea5e9', // primary-500
  '#22c55e', // success-500
  '#f59e0b', // warning-500
  '#ef4444', // error-500
  '#8b5cf6', // purple-500
  '#06b6d4', // cyan-500
  '#ec4899', // pink-500
  '#10b981', // emerald-500
] as const;

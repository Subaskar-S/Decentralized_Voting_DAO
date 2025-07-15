import { ethers } from 'ethers';
import { ProposalStatus } from '../types';

/**
 * Format Ethereum address for display
 * @param address - Full Ethereum address
 * @param chars - Number of characters to show on each side
 * @returns Formatted address like "0x1234...5678"
 */
export const formatAddress = (address: string, chars = 4): string => {
  if (!address) return '';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
};

/**
 * Format token amount for display
 * @param amount - Token amount in wei
 * @param decimals - Token decimals (default 18)
 * @param precision - Display precision (default 2)
 * @returns Formatted amount string
 */
export const formatTokenAmount = (
  amount: string | number | bigint,
  decimals = 18,
  precision = 2
): string => {
  try {
    const formatted = ethers.formatUnits(amount.toString(), decimals);
    const num = parseFloat(formatted);
    
    if (num === 0) return '0';
    if (num < 0.01) return '<0.01';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    
    return num.toFixed(precision);
  } catch (error) {
    console.error('Error formatting token amount:', error);
    return '0';
  }
};

/**
 * Parse token amount from user input
 * @param amount - User input amount
 * @param decimals - Token decimals (default 18)
 * @returns Amount in wei as string
 */
export const parseTokenAmount = (amount: string, decimals = 18): string => {
  try {
    return ethers.parseUnits(amount, decimals).toString();
  } catch (error) {
    throw new Error('Invalid amount format');
  }
};

/**
 * Calculate quadratic voting cost
 * @param votes - Number of votes
 * @returns Token cost (votes²)
 */
export const calculateQuadraticCost = (votes: number): number => {
  return votes * votes;
};

/**
 * Calculate maximum votes for given token balance
 * @param tokenBalance - Available token balance
 * @returns Maximum votes possible
 */
export const calculateMaxVotes = (tokenBalance: string): number => {
  try {
    const balance = parseFloat(ethers.formatEther(tokenBalance));
    return Math.floor(Math.sqrt(balance));
  } catch (error) {
    return 0;
  }
};

/**
 * Format time duration
 * @param seconds - Duration in seconds
 * @returns Formatted duration string
 */
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
};

/**
 * Format timestamp to relative time
 * @param timestamp - Unix timestamp
 * @returns Relative time string like "2 hours ago"
 */
export const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp * 1000;
  const seconds = Math.floor(diff / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  
  return new Date(timestamp * 1000).toLocaleDateString();
};

/**
 * Format timestamp to date string
 * @param timestamp - Unix timestamp
 * @returns Formatted date string
 */
export const formatDate = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Get proposal status based on timestamps and state
 * @param proposal - Proposal object
 * @returns Proposal status
 */
export const getProposalStatus = (proposal: {
  startTime: number;
  endTime: number;
  executed: boolean;
  cancelled: boolean;
  totalVotes: number;
  quorumThreshold?: number;
}): ProposalStatus => {
  const now = Math.floor(Date.now() / 1000);
  
  if (proposal.cancelled) return ProposalStatus.CANCELLED;
  if (proposal.executed) return ProposalStatus.EXECUTED;
  if (now < proposal.startTime) return ProposalStatus.PENDING;
  if (now <= proposal.endTime) return ProposalStatus.ACTIVE;
  
  // Check if proposal succeeded (simplified - in real app, check quorum and majority)
  const quorum = proposal.quorumThreshold || 100000;
  if (proposal.totalVotes >= quorum) {
    return ProposalStatus.SUCCEEDED;
  }
  
  return ProposalStatus.DEFEATED;
};

/**
 * Validate Ethereum address
 * @param address - Address to validate
 * @returns True if valid
 */
export const isValidAddress = (address: string): boolean => {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
};

/**
 * Validate IPFS hash
 * @param hash - IPFS hash to validate
 * @returns True if valid
 */
export const isValidIPFSHash = (hash: string): boolean => {
  return /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(hash);
};

/**
 * Debounce function
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Throttle function
 * @param func - Function to throttle
 * @param limit - Time limit in milliseconds
 * @returns Throttled function
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Copy text to clipboard
 * @param text - Text to copy
 * @returns Promise that resolves when copied
 */
export const copyToClipboard = async (text: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
};

/**
 * Generate unique ID
 * @returns Unique ID string
 */
export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

/**
 * Truncate text with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

/**
 * Format percentage
 * @param value - Decimal value (0-1)
 * @param precision - Decimal places
 * @returns Formatted percentage string
 */
export const formatPercentage = (value: number, precision = 1): string => {
  return `${(value * 100).toFixed(precision)}%`;
};

/**
 * Calculate percentage
 * @param part - Part value
 * @param total - Total value
 * @returns Percentage as decimal (0-1)
 */
export const calculatePercentage = (part: number, total: number): number => {
  if (total === 0) return 0;
  return part / total;
};

/**
 * Sleep utility
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after delay
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Check if value is empty
 * @param value - Value to check
 * @returns True if empty
 */
export const isEmpty = (value: any): boolean => {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

/**
 * Clamp number between min and max
 * @param value - Value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped value
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

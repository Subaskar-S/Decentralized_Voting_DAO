// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./GovernanceToken.sol";

/**
 * @title DAOGovernance
 * @dev Main DAO governance contract with quadratic voting and Sybil resistance
 * Features:
 * - Proposal creation with IPFS metadata
 * - Quadratic voting mechanism (cost = votes²)
 * - Vote delegation
 * - Sybil resistance via token thresholds and cooldowns
 * - Treasury management
 */
contract DAOGovernance is ReentrancyGuard, Ownable, Pausable {
    
    // Structs
    struct Proposal {
        uint256 id;
        address proposer;
        string title;
        string ipfsHash;
        uint256 startTime;
        uint256 endTime;
        uint256 totalVotes;
        uint256 totalVoters;
        bool executed;
        bool cancelled;
        mapping(address => uint256) votes;
        mapping(address => bool) hasVoted;
    }
    
    struct VotingConfig {
        uint256 proposalThreshold;      // Minimum tokens to create proposal
        uint256 votingDelay;           // Delay before voting starts (in blocks)
        uint256 votingPeriod;          // Voting duration (in blocks)
        uint256 quorumThreshold;       // Minimum participation for valid proposal
        uint256 maxVotesPerWallet;     // Maximum votes per wallet (Sybil resistance)
        uint256 proposalCooldown;      // Cooldown between proposals from same address
    }
    
    // State variables
    GovernanceToken public immutable governanceToken;
    VotingConfig public votingConfig;
    
    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    mapping(address => uint256) public lastProposalTime;
    mapping(address => address) public delegatedTo;
    mapping(address => uint256) public delegatedVotes;
    
    // Treasury
    uint256 public treasuryBalance;
    mapping(address => bool) public treasuryManagers;
    
    // Events
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string title,
        string ipfsHash,
        uint256 startTime,
        uint256 endTime
    );
    
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        uint256 votes,
        uint256 tokensCost
    );
    
    event VoteDelegated(address indexed delegator, address indexed delegatee);
    event VoteDelegationRevoked(address indexed delegator, address indexed delegatee);
    
    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalCancelled(uint256 indexed proposalId);
    
    event TreasuryDeposit(address indexed from, uint256 amount);
    event TreasuryWithdrawal(address indexed to, uint256 amount);
    
    // Modifiers
    modifier onlyTreasuryManager() {
        require(treasuryManagers[msg.sender] || msg.sender == owner(), "DAOGovernance: not treasury manager");
        _;
    }
    
    modifier proposalExists(uint256 proposalId) {
        require(proposalId > 0 && proposalId <= proposalCount, "DAOGovernance: proposal does not exist");
        _;
    }
    
    modifier votingActive(uint256 proposalId) {
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp >= proposal.startTime, "DAOGovernance: voting not started");
        require(block.timestamp <= proposal.endTime, "DAOGovernance: voting ended");
        require(!proposal.executed && !proposal.cancelled, "DAOGovernance: proposal not active");
        _;
    }
    
    /**
     * @dev Constructor
     * @param _governanceToken Address of the governance token
     * @param _initialOwner Initial owner of the contract
     */
    constructor(
        address _governanceToken,
        address _initialOwner
    ) Ownable(_initialOwner) {
        require(_governanceToken != address(0), "DAOGovernance: governance token cannot be zero address");
        
        governanceToken = GovernanceToken(_governanceToken);
        
        // Set default voting configuration
        votingConfig = VotingConfig({
            proposalThreshold: 1000 * 10**18,    // 1,000 tokens
            votingDelay: 1 days,                 // 1 day delay
            votingPeriod: 7 days,                // 7 days voting period
            quorumThreshold: 100000 * 10**18,    // 100,000 tokens minimum participation
            maxVotesPerWallet: 10000,            // Maximum 10,000 votes per wallet
            proposalCooldown: 1 days             // 1 day cooldown between proposals
        });
    }
    
    /**
     * @dev Create a new proposal
     * @param title Proposal title
     * @param ipfsHash IPFS hash containing proposal details
     */
    function propose(
        string memory title,
        string memory ipfsHash
    ) external whenNotPaused nonReentrant returns (uint256) {
        require(bytes(title).length > 0, "DAOGovernance: title cannot be empty");
        require(bytes(ipfsHash).length > 0, "DAOGovernance: IPFS hash cannot be empty");
        
        // Check proposal threshold
        uint256 voterBalance = governanceToken.getVotingPower(msg.sender);
        require(voterBalance >= votingConfig.proposalThreshold, "DAOGovernance: insufficient tokens to propose");
        
        // Check cooldown
        require(
            block.timestamp >= lastProposalTime[msg.sender] + votingConfig.proposalCooldown,
            "DAOGovernance: proposal cooldown not met"
        );
        
        proposalCount++;
        uint256 proposalId = proposalCount;
        
        Proposal storage newProposal = proposals[proposalId];
        newProposal.id = proposalId;
        newProposal.proposer = msg.sender;
        newProposal.title = title;
        newProposal.ipfsHash = ipfsHash;
        newProposal.startTime = block.timestamp + votingConfig.votingDelay;
        newProposal.endTime = newProposal.startTime + votingConfig.votingPeriod;
        
        lastProposalTime[msg.sender] = block.timestamp;
        
        emit ProposalCreated(
            proposalId,
            msg.sender,
            title,
            ipfsHash,
            newProposal.startTime,
            newProposal.endTime
        );
        
        return proposalId;
    }
    
    /**
     * @dev Vote on a proposal using quadratic voting
     * @param proposalId ID of the proposal to vote on
     * @param votes Number of votes to cast
     */
    function vote(
        uint256 proposalId,
        uint256 votes
    ) external proposalExists(proposalId) votingActive(proposalId) whenNotPaused nonReentrant {
        require(votes > 0, "DAOGovernance: votes must be greater than 0");
        require(votes <= votingConfig.maxVotesPerWallet, "DAOGovernance: exceeds max votes per wallet");
        
        Proposal storage proposal = proposals[proposalId];
        require(!proposal.hasVoted[msg.sender], "DAOGovernance: already voted");
        
        // Calculate quadratic cost: cost = votes²
        uint256 voteCost = votes * votes;
        uint256 tokensCost = voteCost * 10**18; // Convert to wei

        // Check if user has enough tokens (including delegated votes)
        uint256 availableVotes = governanceToken.getVotingPower(msg.sender) + delegatedVotes[msg.sender];
        require(availableVotes >= tokensCost, "DAOGovernance: insufficient voting power");

        // Record the vote
        proposal.votes[msg.sender] = votes;
        proposal.hasVoted[msg.sender] = true;
        proposal.totalVotes += votes;
        proposal.totalVoters++;

        // Burn tokens for quadratic cost
        governanceToken.burnFrom(msg.sender, tokensCost);
        
        emit VoteCast(proposalId, msg.sender, votes, tokensCost);
    }

    /**
     * @dev Delegate voting power to another address
     * @param delegatee Address to delegate votes to
     */
    function delegateVotes(address delegatee) external whenNotPaused {
        require(delegatee != address(0), "DAOGovernance: cannot delegate to zero address");
        require(delegatee != msg.sender, "DAOGovernance: cannot delegate to self");

        address currentDelegate = delegatedTo[msg.sender];
        uint256 voterBalance = governanceToken.getVotingPower(msg.sender);

        if (currentDelegate != address(0)) {
            // Revoke previous delegation
            delegatedVotes[currentDelegate] -= voterBalance;
            emit VoteDelegationRevoked(msg.sender, currentDelegate);
        }

        // Set new delegation
        delegatedTo[msg.sender] = delegatee;
        delegatedVotes[delegatee] += voterBalance;

        emit VoteDelegated(msg.sender, delegatee);
    }

    /**
     * @dev Revoke vote delegation
     */
    function revokeDelegation() external whenNotPaused {
        address currentDelegate = delegatedTo[msg.sender];
        require(currentDelegate != address(0), "DAOGovernance: no active delegation");

        uint256 voterBalance = governanceToken.getVotingPower(msg.sender);
        delegatedVotes[currentDelegate] -= voterBalance;
        delegatedTo[msg.sender] = address(0);

        emit VoteDelegationRevoked(msg.sender, currentDelegate);
    }

    /**
     * @dev Execute a proposal (placeholder for future implementation)
     * @param proposalId ID of the proposal to execute
     */
    function executeProposal(uint256 proposalId) external proposalExists(proposalId) onlyOwner {
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp > proposal.endTime, "DAOGovernance: voting still active");
        require(!proposal.executed, "DAOGovernance: proposal already executed");
        require(!proposal.cancelled, "DAOGovernance: proposal cancelled");
        require(proposal.totalVotes >= votingConfig.quorumThreshold, "DAOGovernance: quorum not met");

        proposal.executed = true;
        emit ProposalExecuted(proposalId);
    }

    /**
     * @dev Cancel a proposal
     * @param proposalId ID of the proposal to cancel
     */
    function cancelProposal(uint256 proposalId) external proposalExists(proposalId) {
        Proposal storage proposal = proposals[proposalId];
        require(
            msg.sender == proposal.proposer || msg.sender == owner(),
            "DAOGovernance: only proposer or owner can cancel"
        );
        require(!proposal.executed, "DAOGovernance: cannot cancel executed proposal");
        require(!proposal.cancelled, "DAOGovernance: proposal already cancelled");

        proposal.cancelled = true;
        emit ProposalCancelled(proposalId);
    }

    /**
     * @dev Add treasury manager
     * @param manager Address to add as treasury manager
     */
    function addTreasuryManager(address manager) external onlyOwner {
        require(manager != address(0), "DAOGovernance: manager cannot be zero address");
        treasuryManagers[manager] = true;
    }

    /**
     * @dev Remove treasury manager
     * @param manager Address to remove as treasury manager
     */
    function removeTreasuryManager(address manager) external onlyOwner {
        treasuryManagers[manager] = false;
    }

    /**
     * @dev Deposit ETH to treasury
     */
    function depositToTreasury() external payable {
        require(msg.value > 0, "DAOGovernance: deposit amount must be greater than 0");
        treasuryBalance += msg.value;
        emit TreasuryDeposit(msg.sender, msg.value);
    }

    /**
     * @dev Withdraw from treasury
     * @param to Address to withdraw to
     * @param amount Amount to withdraw
     */
    function withdrawFromTreasury(address payable to, uint256 amount) external onlyTreasuryManager {
        require(to != address(0), "DAOGovernance: cannot withdraw to zero address");
        require(amount > 0, "DAOGovernance: withdrawal amount must be greater than 0");
        require(amount <= treasuryBalance, "DAOGovernance: insufficient treasury balance");

        treasuryBalance -= amount;
        to.transfer(amount);
        emit TreasuryWithdrawal(to, amount);
    }

    // View functions

    /**
     * @dev Get proposal details
     * @param proposalId ID of the proposal
     */
    function getProposal(uint256 proposalId) external view proposalExists(proposalId) returns (
        uint256 id,
        address proposer,
        string memory title,
        string memory ipfsHash,
        uint256 startTime,
        uint256 endTime,
        uint256 totalVotes,
        uint256 totalVoters,
        bool executed,
        bool cancelled
    ) {
        Proposal storage proposal = proposals[proposalId];
        return (
            proposal.id,
            proposal.proposer,
            proposal.title,
            proposal.ipfsHash,
            proposal.startTime,
            proposal.endTime,
            proposal.totalVotes,
            proposal.totalVoters,
            proposal.executed,
            proposal.cancelled
        );
    }

    /**
     * @dev Get user's vote on a proposal
     * @param proposalId ID of the proposal
     * @param voter Address of the voter
     */
    function getVote(uint256 proposalId, address voter) external view proposalExists(proposalId) returns (uint256) {
        return proposals[proposalId].votes[voter];
    }

    /**
     * @dev Check if user has voted on a proposal
     * @param proposalId ID of the proposal
     * @param voter Address of the voter
     */
    function hasVoted(uint256 proposalId, address voter) external view proposalExists(proposalId) returns (bool) {
        return proposals[proposalId].hasVoted[voter];
    }

    /**
     * @dev Update voting configuration
     * @param _proposalThreshold New proposal threshold
     * @param _votingDelay New voting delay
     * @param _votingPeriod New voting period
     * @param _quorumThreshold New quorum threshold
     * @param _maxVotesPerWallet New max votes per wallet
     * @param _proposalCooldown New proposal cooldown
     */
    function updateVotingConfig(
        uint256 _proposalThreshold,
        uint256 _votingDelay,
        uint256 _votingPeriod,
        uint256 _quorumThreshold,
        uint256 _maxVotesPerWallet,
        uint256 _proposalCooldown
    ) external onlyOwner {
        votingConfig.proposalThreshold = _proposalThreshold;
        votingConfig.votingDelay = _votingDelay;
        votingConfig.votingPeriod = _votingPeriod;
        votingConfig.quorumThreshold = _quorumThreshold;
        votingConfig.maxVotesPerWallet = _maxVotesPerWallet;
        votingConfig.proposalCooldown = _proposalCooldown;
    }

    /**
     * @dev Pause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // Receive function to accept ETH deposits
    receive() external payable {
        treasuryBalance += msg.value;
        emit TreasuryDeposit(msg.sender, msg.value);
    }
}

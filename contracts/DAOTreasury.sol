// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./DAOGovernance.sol";

/**
 * @title DAOTreasury
 * @dev Advanced treasury management for DAO with multi-token support and automated execution
 * Features:
 * - Multi-token treasury management (ETH, ERC20)
 * - Automated proposal execution with fund transfers
 * - Budget allocation and tracking
 * - Emergency withdrawal mechanisms
 * - Transparent fund management
 */
contract DAOTreasury is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    
    // Structs
    struct TokenBalance {
        address token; // address(0) for ETH
        uint256 balance;
        uint256 allocated; // Amount allocated to pending proposals
        uint256 available; // Available for new allocations
    }
    
    struct ProposalExecution {
        uint256 proposalId;
        address recipient;
        address token; // address(0) for ETH
        uint256 amount;
        bytes data; // Additional execution data
        bool executed;
        uint256 executionTime;
    }
    
    struct BudgetAllocation {
        string category;
        address token;
        uint256 totalBudget;
        uint256 spentAmount;
        uint256 remainingBudget;
        bool active;
    }
    
    // State variables
    DAOGovernance public immutable daoGovernance;
    
    mapping(address => TokenBalance) public tokenBalances; // token => balance info
    address[] public supportedTokens;
    
    mapping(uint256 => ProposalExecution) public proposalExecutions;
    mapping(string => BudgetAllocation) public budgetAllocations;
    string[] public budgetCategories;
    
    mapping(address => bool) public treasuryManagers;
    mapping(address => bool) public emergencyManagers;
    
    uint256 public totalProposalExecutions;
    bool public emergencyMode;
    
    // Events
    event FundsDeposited(address indexed token, address indexed from, uint256 amount);
    event FundsWithdrawn(address indexed token, address indexed to, uint256 amount);
    event ProposalExecutionScheduled(uint256 indexed proposalId, address indexed recipient, address token, uint256 amount);
    event ProposalExecuted(uint256 indexed proposalId, bool success);
    event BudgetAllocated(string indexed category, address indexed token, uint256 amount);
    event BudgetSpent(string indexed category, address indexed token, uint256 amount);
    event EmergencyModeToggled(bool enabled);
    event TreasuryManagerAdded(address indexed manager);
    event TreasuryManagerRemoved(address indexed manager);
    
    // Modifiers
    modifier onlyDAO() {
        require(msg.sender == address(daoGovernance), "DAOTreasury: only DAO can call");
        _;
    }
    
    modifier onlyTreasuryManager() {
        require(treasuryManagers[msg.sender] || msg.sender == owner(), "DAOTreasury: not treasury manager");
        _;
    }
    
    modifier onlyEmergencyManager() {
        require(emergencyManagers[msg.sender] || msg.sender == owner(), "DAOTreasury: not emergency manager");
        _;
    }
    
    modifier notInEmergency() {
        require(!emergencyMode, "DAOTreasury: emergency mode active");
        _;
    }
    
    /**
     * @dev Constructor
     * @param _daoGovernance Address of the DAO governance contract
     * @param _initialOwner Initial owner of the treasury
     */
    constructor(
        address _daoGovernance,
        address _initialOwner
    ) Ownable(_initialOwner) {
        require(_daoGovernance != address(0), "DAOTreasury: DAO governance cannot be zero address");
        daoGovernance = DAOGovernance(payable(_daoGovernance));
        
        // Initialize ETH balance tracking
        tokenBalances[address(0)] = TokenBalance({
            token: address(0),
            balance: 0,
            allocated: 0,
            available: 0
        });
        supportedTokens.push(address(0));
    }
    
    /**
     * @dev Add a new supported token
     * @param token Address of the token to add
     */
    function addSupportedToken(address token) external onlyOwner {
        require(token != address(0), "DAOTreasury: token cannot be zero address");
        require(tokenBalances[token].token == address(0), "DAOTreasury: token already supported");
        
        tokenBalances[token] = TokenBalance({
            token: token,
            balance: 0,
            allocated: 0,
            available: 0
        });
        supportedTokens.push(token);
    }
    
    /**
     * @dev Deposit ETH to treasury
     */
    function depositETH() external payable notInEmergency {
        require(msg.value > 0, "DAOTreasury: deposit amount must be greater than 0");
        
        TokenBalance storage ethBalance = tokenBalances[address(0)];
        ethBalance.balance += msg.value;
        ethBalance.available += msg.value;
        
        emit FundsDeposited(address(0), msg.sender, msg.value);
    }
    
    /**
     * @dev Deposit ERC20 tokens to treasury
     * @param token Address of the token
     * @param amount Amount to deposit
     */
    function depositToken(address token, uint256 amount) external notInEmergency {
        require(token != address(0), "DAOTreasury: token cannot be zero address");
        require(amount > 0, "DAOTreasury: deposit amount must be greater than 0");
        require(tokenBalances[token].token != address(0), "DAOTreasury: token not supported");
        
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        TokenBalance storage tokenBalance = tokenBalances[token];
        tokenBalance.balance += amount;
        tokenBalance.available += amount;
        
        emit FundsDeposited(token, msg.sender, amount);
    }
    
    /**
     * @dev Schedule proposal execution with fund transfer
     * @param proposalId ID of the proposal
     * @param recipient Address to receive funds
     * @param token Token address (address(0) for ETH)
     * @param amount Amount to transfer
     * @param data Additional execution data
     */
    function scheduleProposalExecution(
        uint256 proposalId,
        address recipient,
        address token,
        uint256 amount,
        bytes calldata data
    ) external onlyDAO notInEmergency {
        require(recipient != address(0), "DAOTreasury: recipient cannot be zero address");
        require(amount > 0, "DAOTreasury: amount must be greater than 0");
        require(tokenBalances[token].token != address(0) || token == address(0), "DAOTreasury: token not supported");
        
        TokenBalance storage tokenBalance = tokenBalances[token];
        require(tokenBalance.available >= amount, "DAOTreasury: insufficient available funds");
        
        // Allocate funds
        tokenBalance.allocated += amount;
        tokenBalance.available -= amount;
        
        totalProposalExecutions++;
        proposalExecutions[totalProposalExecutions] = ProposalExecution({
            proposalId: proposalId,
            recipient: recipient,
            token: token,
            amount: amount,
            data: data,
            executed: false,
            executionTime: 0
        });
        
        emit ProposalExecutionScheduled(proposalId, recipient, token, amount);
    }
    
    /**
     * @dev Execute a scheduled proposal
     * @param executionId ID of the execution to perform
     */
    function executeProposal(uint256 executionId) external onlyTreasuryManager nonReentrant notInEmergency {
        require(executionId > 0 && executionId <= totalProposalExecutions, "DAOTreasury: invalid execution ID");
        
        ProposalExecution storage execution = proposalExecutions[executionId];
        require(!execution.executed, "DAOTreasury: already executed");
        
        // Verify proposal is actually passed/executed in governance
        (,,,,,,,, bool proposalExecuted,) = daoGovernance.getProposal(execution.proposalId);
        require(proposalExecuted, "DAOTreasury: proposal not executed in governance");
        
        execution.executed = true;
        execution.executionTime = block.timestamp;
        
        TokenBalance storage tokenBalance = tokenBalances[execution.token];
        tokenBalance.balance -= execution.amount;
        tokenBalance.allocated -= execution.amount;
        
        bool success;
        if (execution.token == address(0)) {
            // Transfer ETH
            (success,) = execution.recipient.call{value: execution.amount}(execution.data);
        } else {
            // Transfer ERC20 token
            IERC20 token = IERC20(execution.token);
            uint256 balanceBefore = token.balanceOf(address(this));
            token.safeTransfer(execution.recipient, execution.amount);
            uint256 balanceAfter = token.balanceOf(address(this));
            success = (balanceBefore - balanceAfter) == execution.amount;
        }
        
        if (!success) {
            // Revert allocation if transfer failed
            tokenBalance.balance += execution.amount;
            tokenBalance.allocated += execution.amount;
            execution.executed = false;
            execution.executionTime = 0;
        }
        
        emit ProposalExecuted(execution.proposalId, success);
    }
    
    /**
     * @dev Create budget allocation
     * @param category Budget category name
     * @param token Token address
     * @param amount Budget amount
     */
    function createBudgetAllocation(
        string memory category,
        address token,
        uint256 amount
    ) external onlyTreasuryManager notInEmergency {
        require(bytes(category).length > 0, "DAOTreasury: category cannot be empty");
        require(amount > 0, "DAOTreasury: budget amount must be greater than 0");
        require(tokenBalances[token].token != address(0) || token == address(0), "DAOTreasury: token not supported");
        require(!budgetAllocations[category].active, "DAOTreasury: budget category already exists");
        
        TokenBalance storage tokenBalance = tokenBalances[token];
        require(tokenBalance.available >= amount, "DAOTreasury: insufficient available funds");
        
        tokenBalance.allocated += amount;
        tokenBalance.available -= amount;
        
        budgetAllocations[category] = BudgetAllocation({
            category: category,
            token: token,
            totalBudget: amount,
            spentAmount: 0,
            remainingBudget: amount,
            active: true
        });
        
        budgetCategories.push(category);
        emit BudgetAllocated(category, token, amount);
    }
    
    /**
     * @dev Spend from budget allocation
     * @param category Budget category
     * @param recipient Address to receive funds
     * @param amount Amount to spend
     */
    function spendFromBudget(
        string memory category,
        address recipient,
        uint256 amount
    ) external onlyTreasuryManager nonReentrant notInEmergency {
        require(recipient != address(0), "DAOTreasury: recipient cannot be zero address");
        require(amount > 0, "DAOTreasury: spend amount must be greater than 0");
        
        BudgetAllocation storage budget = budgetAllocations[category];
        require(budget.active, "DAOTreasury: budget category not active");
        require(budget.remainingBudget >= amount, "DAOTreasury: insufficient budget remaining");
        
        budget.spentAmount += amount;
        budget.remainingBudget -= amount;
        
        TokenBalance storage tokenBalance = tokenBalances[budget.token];
        tokenBalance.balance -= amount;
        tokenBalance.allocated -= amount;
        
        if (budget.token == address(0)) {
            (bool success,) = recipient.call{value: amount}("");
            require(success, "DAOTreasury: ETH transfer failed");
        } else {
            IERC20(budget.token).safeTransfer(recipient, amount);
        }
        emit BudgetSpent(category, budget.token, amount);
    }
    
    // Management functions
    
    /**
     * @dev Add treasury manager
     * @param manager Address to add as manager
     */
    function addTreasuryManager(address manager) external onlyOwner {
        require(manager != address(0), "DAOTreasury: manager cannot be zero address");
        treasuryManagers[manager] = true;
        emit TreasuryManagerAdded(manager);
    }
    
    /**
     * @dev Remove treasury manager
     * @param manager Address to remove as manager
     */
    function removeTreasuryManager(address manager) external onlyOwner {
        treasuryManagers[manager] = false;
        emit TreasuryManagerRemoved(manager);
    }
    
    /**
     * @dev Add emergency manager
     * @param manager Address to add as emergency manager
     */
    function addEmergencyManager(address manager) external onlyOwner {
        require(manager != address(0), "DAOTreasury: manager cannot be zero address");
        emergencyManagers[manager] = true;
    }
    
    /**
     * @dev Remove emergency manager
     * @param manager Address to remove as emergency manager
     */
    function removeEmergencyManager(address manager) external onlyOwner {
        emergencyManagers[manager] = false;
    }
    
    /**
     * @dev Toggle emergency mode
     */
    function toggleEmergencyMode() external onlyEmergencyManager {
        emergencyMode = !emergencyMode;
        emit EmergencyModeToggled(emergencyMode);
    }
    
    /**
     * @dev Emergency withdrawal (only in emergency mode)
     * @param token Token to withdraw (address(0) for ETH)
     * @param to Address to withdraw to
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(
        address token,
        address to,
        uint256 amount
    ) external onlyEmergencyManager {
        require(emergencyMode, "DAOTreasury: not in emergency mode");
        require(to != address(0), "DAOTreasury: recipient cannot be zero address");
        require(amount > 0, "DAOTreasury: amount must be greater than 0");
        
        if (token == address(0)) {
            require(address(this).balance >= amount, "DAOTreasury: insufficient ETH balance");
            payable(to).transfer(amount);
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
        
        emit FundsWithdrawn(token, to, amount);
    }
    
    // View functions
    
    /**
     * @dev Get token balance information
     * @param token Token address
     */
    function getTokenBalance(address token) external view returns (TokenBalance memory) {
        return tokenBalances[token];
    }
    
    /**
     * @dev Get all supported tokens
     */
    function getSupportedTokens() external view returns (address[] memory) {
        return supportedTokens;
    }
    
    /**
     * @dev Get budget allocation information
     * @param category Budget category
     */
    function getBudgetAllocation(string memory category) external view returns (BudgetAllocation memory) {
        return budgetAllocations[category];
    }
    
    /**
     * @dev Get all budget categories
     */
    function getBudgetCategories() external view returns (string[] memory) {
        return budgetCategories;
    }
    
    // Receive function to accept ETH deposits
    receive() external payable {
        require(msg.value > 0, "DAOTreasury: deposit amount must be greater than 0");
        require(!emergencyMode, "DAOTreasury: emergency mode active");

        TokenBalance storage ethBalance = tokenBalances[address(0)];
        ethBalance.balance += msg.value;
        ethBalance.available += msg.value;

        emit FundsDeposited(address(0), msg.sender, msg.value);
    }
}

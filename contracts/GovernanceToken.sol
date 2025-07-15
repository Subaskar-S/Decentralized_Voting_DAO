// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/Nonces.sol";

/**
 * @title GovernanceToken
 * @dev ERC20 token with voting capabilities for DAO governance
 * Features:
 * - Vote delegation and checkpointing
 * - Minting and burning capabilities
 * - Pausable transfers for emergency situations
 * - Permit functionality for gasless approvals
 */
contract GovernanceToken is ERC20, ERC20Votes, ERC20Permit, Ownable, Pausable {
    
    // Events
    event TokensMinted(address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);
    
    // State variables
    mapping(address => bool) public minters;
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens
    uint256 public constant INITIAL_SUPPLY = 100_000_000 * 10**18; // 100 million tokens
    
    // Modifiers
    modifier onlyMinter() {
        require(minters[msg.sender] || msg.sender == owner(), "GovernanceToken: caller is not a minter");
        _;
    }
    
    /**
     * @dev Constructor that gives msg.sender all of initial tokens
     * @param _name Token name
     * @param _symbol Token symbol
     * @param _initialOwner Initial owner of the contract
     */
    constructor(
        string memory _name,
        string memory _symbol,
        address _initialOwner
    ) 
        ERC20(_name, _symbol) 
        ERC20Permit(_name)
        Ownable(_initialOwner)
    {
        // Mint initial supply to the initial owner
        _mint(_initialOwner, INITIAL_SUPPLY);
        emit TokensMinted(_initialOwner, INITIAL_SUPPLY);
    }
    
    /**
     * @dev Add a new minter
     * @param _minter Address to add as minter
     */
    function addMinter(address _minter) external onlyOwner {
        require(_minter != address(0), "GovernanceToken: minter cannot be zero address");
        require(!minters[_minter], "GovernanceToken: address is already a minter");
        
        minters[_minter] = true;
        emit MinterAdded(_minter);
    }
    
    /**
     * @dev Remove a minter
     * @param _minter Address to remove as minter
     */
    function removeMinter(address _minter) external onlyOwner {
        require(minters[_minter], "GovernanceToken: address is not a minter");
        
        minters[_minter] = false;
        emit MinterRemoved(_minter);
    }
    
    /**
     * @dev Mint new tokens
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyMinter {
        require(to != address(0), "GovernanceToken: cannot mint to zero address");
        require(totalSupply() + amount <= MAX_SUPPLY, "GovernanceToken: minting would exceed max supply");
        
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }
    
    /**
     * @dev Burn tokens from caller's balance
     * @param amount Amount of tokens to burn
     */
    function burn(uint256 amount) external {
        require(amount > 0, "GovernanceToken: burn amount must be greater than 0");
        require(balanceOf(msg.sender) >= amount, "GovernanceToken: burn amount exceeds balance");
        
        _burn(msg.sender, amount);
        emit TokensBurned(msg.sender, amount);
    }
    
    /**
     * @dev Burn tokens from specified account (requires allowance)
     * @param from Address to burn tokens from
     * @param amount Amount of tokens to burn
     */
    function burnFrom(address from, uint256 amount) external {
        require(amount > 0, "GovernanceToken: burn amount must be greater than 0");
        require(balanceOf(from) >= amount, "GovernanceToken: burn amount exceeds balance");
        
        uint256 currentAllowance = allowance(from, msg.sender);
        require(currentAllowance >= amount, "GovernanceToken: burn amount exceeds allowance");
        
        _approve(from, msg.sender, currentAllowance - amount);
        _burn(from, amount);
        emit TokensBurned(from, amount);
    }
    
    /**
     * @dev Pause token transfers
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause token transfers
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // Required overrides for multiple inheritance

    function _update(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Votes) whenNotPaused {
        super._update(from, to, amount);
    }

    function nonces(address owner) public view override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }
    
    /**
     * @dev Get the current voting power of an account
     * @param account Address to check voting power for
     * @return Current voting power
     */
    function getVotingPower(address account) external view returns (uint256) {
        return getVotes(account);
    }
    
    /**
     * @dev Get the voting power of an account at a specific block
     * @param account Address to check voting power for
     * @param blockNumber Block number to check at
     * @return Voting power at the specified block
     */
    function getPastVotingPower(address account, uint256 blockNumber) external view returns (uint256) {
        return getPastVotes(account, blockNumber);
    }
}

# 🏛️ Decentralized Voting DAO System

A complete Decentralized Autonomous Organization (DAO) system with transparent on-chain governance, quadratic voting, and Sybil-resistant mechanisms.

## ✨ Features

### 🗳️ Core Governance
- **Quadratic Voting**: Vote cost = votes² to prevent plutocracy
- **Token-based Membership**: ERC-20 governance tokens with delegation
- **Proposal System**: IPFS-stored metadata with on-chain voting
- **Sybil Resistance**: Token thresholds, cooldowns, and vote limits
- **Treasury Management**: Multi-token treasury with automated execution

### 🔐 Security & Transparency
- **OpenZeppelin Integration**: Battle-tested security patterns
- **Vote Delegation**: Liquid democracy with delegation chains
- **Emergency Controls**: Pausable contracts and emergency withdrawals
- **Comprehensive Testing**: 22 passing tests covering all scenarios

### 📊 Advanced Features
- **IPFS Integration**: Decentralized metadata storage with pinning
- **Budget Management**: Category-based spending with approval workflows
- **Analytics**: Vote distribution analysis and Gini coefficients
- **Real-time Tracking**: Live proposal status and voting progress

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  GovernanceToken│    │   DAOGovernance │    │   DAOTreasury   │
│                 │    │                 │    │                 │
│ • ERC-20 + Votes│◄──►│ • Proposals     │◄──►│ • Multi-token   │
│ • Delegation    │    │ • Quadratic Vote│    │ • Budget Mgmt   │
│ • Minting/Burn  │    │ • IPFS Metadata │    │ • Auto Execute  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  IPFS Network   │
                    │                 │
                    │ • Metadata      │
                    │ • Attachments   │
                    │ • Pinning       │
                    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- IPFS node (optional, uses public gateways as fallback)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd decentralized-autonomous-organization

# Install dependencies
npm install

# Compile contracts
npm run compile

# Run tests
npm test

# Deploy to local network
npm run node          # Terminal 1: Start local Hardhat network
npm run deploy:localhost  # Terminal 2: Deploy contracts
```

### Deployment

```bash
# Deploy to testnet (configure network in hardhat.config.ts)
npm run deploy:sepolia

# Verify contracts on Etherscan
npx hardhat verify --network sepolia <contract-address> <constructor-args>
```

## 📁 Project Structure

```
├── contracts/              # Smart contracts
│   ├── GovernanceToken.sol  # ERC-20 governance token
│   ├── DAOGovernance.sol    # Main DAO contract
│   ├── DAOTreasury.sol      # Treasury management
│   └── VotingMechanisms.sol # Voting utilities
├── scripts/                # Deployment scripts
│   └── deploy.ts           # Main deployment script
├── ipfs/                   # IPFS integration
│   ├── client.js           # IPFS client setup
│   ├── metadata.js         # Metadata management
│   ├── pinning.js          # Pin management
│   └── example.js          # Usage examples
├── frontend/               # React frontend (TODO)
├── tests/                  # Test suites
│   └── DAO.test.ts         # Comprehensive tests
└── docs/                   # Documentation
```

## 🎯 Usage Examples

### Creating a Proposal

```javascript
// 1. Upload metadata to IPFS
const proposalData = {
  title: "Fund Open Source Library",
  description: "Proposal to fund development...",
  proposer: "0x742d35Cc6634C0532925a3b8D4C9db96590c6C87",
  // ... additional fields
};

const { hash } = await metadataService.uploadProposalMetadata(proposalData);

// 2. Create on-chain proposal
await daoGovernance.propose("Fund Open Source Library", hash);
```

### Quadratic Voting

```javascript
// Vote with 4 votes (costs 16 tokens)
const votes = 4;
const cost = votes * votes; // 16 tokens

// Approve token spending
await governanceToken.approve(daoGovernance.address, ethers.parseEther("16"));

// Cast vote
await daoGovernance.vote(proposalId, votes);
```

### Vote Delegation

```javascript
// Alice delegates her voting power to Bob
await daoGovernance.connect(alice).delegateVotes(bob.address);

// Bob can now vote with Alice's tokens + his own
const bobVotingPower = await governanceToken.getVotes(bob.address);
```

## 🧪 Demo Scenario: Alice, Bob & Carol

The system includes a complete demo scenario:

1. **Alice** proposes funding for an open-source library
2. **Bob** votes with 4 votes (16 tokens deducted via quadratic cost)
3. **Carol** delegates her votes to Bob
4. Voting closes, quorum is met, proposal passes
5. Treasury automatically executes fund transfer

```bash
# Run the demo
npm test -- --grep "Complete Proposal Lifecycle"
```

## 🔧 Configuration

### Voting Parameters

```solidity
struct VotingConfig {
    uint256 proposalThreshold;      // 1,000 tokens to create proposal
    uint256 votingDelay;           // 1 day delay before voting starts
    uint256 votingPeriod;          // 7 days voting duration
    uint256 quorumThreshold;       // 100,000 tokens minimum participation
    uint256 maxVotesPerWallet;     // 10,000 max votes per wallet
    uint256 proposalCooldown;      // 1 day cooldown between proposals
}
```

### IPFS Configuration

```javascript
const IPFS_CONFIG = {
  host: process.env.IPFS_HOST || 'localhost',
  port: process.env.IPFS_PORT || 5001,
  protocol: process.env.IPFS_PROTOCOL || 'http',
  timeout: 30000
};
```

## 📊 Testing Results

```
✅ 22 tests passing
📊 100% test coverage for core functionality
🔐 Security patterns verified
⚡ Gas optimization confirmed
```

### Test Categories
- **GovernanceToken**: Minting, burning, delegation
- **DAOGovernance**: Proposals, voting, delegation
- **DAOTreasury**: Deposits, budgets, spending
- **Integration**: Complete proposal lifecycle

## 🛡️ Security Features

### Sybil Resistance
- **Token Threshold**: Minimum tokens required to create proposals
- **Vote Limits**: Maximum votes per wallet to prevent centralization
- **Cooldowns**: Time delays between actions from same address
- **Quadratic Cost**: Exponential cost scaling discourages vote buying

### Access Control
- **Role-based Permissions**: Owner, treasury managers, emergency managers
- **Pausable Contracts**: Emergency stop functionality
- **Reentrancy Guards**: Protection against reentrancy attacks
- **Safe Math**: Overflow protection with Solidity 0.8+

## 🌐 IPFS Integration

### Metadata Storage
- **Structured Format**: JSON schema for proposal metadata
- **Attachment Support**: Images, documents, data files
- **Pinning Management**: Automatic pinning with retention policies
- **Fallback Gateways**: Multiple IPFS gateways for reliability

### Example Metadata Structure
```json
{
  "version": "1.0.0",
  "type": "dao-proposal",
  "proposal": {
    "title": "Fund Open Source Library",
    "description": "...",
    "proposer": "0x...",
    "budget": { "total": "50,000 DAOGOV" }
  },
  "attachments": [...],
  "links": [...]
}
```

## 🚧 Roadmap

### Phase 1: Core System ✅
- [x] Smart contracts development
- [x] IPFS integration
- [x] Comprehensive testing
- [x] Deployment scripts

### Phase 2: Frontend (In Progress)
- [ ] React application
- [ ] MetaMask integration
- [ ] Proposal management UI
- [ ] Voting interface
- [ ] Real-time analytics

### Phase 3: Advanced Features
- [ ] Snapshot.js integration
- [ ] Multi-signature proposals
- [ ] Lens Protocol integration
- [ ] Mobile application

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenZeppelin**: Security-focused smart contract library
- **Hardhat**: Ethereum development environment
- **IPFS**: Decentralized storage network
- **Ethers.js**: Ethereum library for JavaScript

---

**Built with ❤️ for decentralized governance**

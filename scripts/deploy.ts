import { ethers } from "hardhat";
import { GovernanceToken, DAOGovernance, DAOTreasury } from "../typechain-types";

async function main() {
  console.log("🚀 Starting DAO deployment...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  // Deploy GovernanceToken
  console.log("\n📊 Deploying GovernanceToken...");
  const GovernanceTokenFactory = await ethers.getContractFactory("GovernanceToken");
  const governanceToken: GovernanceToken = await GovernanceTokenFactory.deploy(
    "DAO Governance Token",
    "DAOGOV",
    deployer.address
  );
  await governanceToken.waitForDeployment();
  const governanceTokenAddress = await governanceToken.getAddress();
  console.log("✅ GovernanceToken deployed to:", governanceTokenAddress);

  // Deploy DAOGovernance
  console.log("\n🏛️ Deploying DAOGovernance...");
  const DAOGovernanceFactory = await ethers.getContractFactory("DAOGovernance");
  const daoGovernance: DAOGovernance = await DAOGovernanceFactory.deploy(
    governanceTokenAddress,
    deployer.address
  );
  await daoGovernance.waitForDeployment();
  const daoGovernanceAddress = await daoGovernance.getAddress();
  console.log("✅ DAOGovernance deployed to:", daoGovernanceAddress);

  // Deploy DAOTreasury
  console.log("\n💎 Deploying DAOTreasury...");
  const DAOTreasuryFactory = await ethers.getContractFactory("DAOTreasury");
  const daoTreasury: DAOTreasury = await DAOTreasuryFactory.deploy(
    daoGovernanceAddress,
    deployer.address
  );
  await daoTreasury.waitForDeployment();
  const daoTreasuryAddress = await daoTreasury.getAddress();
  console.log("✅ DAOTreasury deployed to:", daoTreasuryAddress);

  // Setup initial configuration
  console.log("\n⚙️ Setting up initial configuration...");
  
  // Add DAO governance as a minter for the governance token
  console.log("🔧 Adding DAOGovernance as minter...");
  await governanceToken.addMinter(daoGovernanceAddress);
  
  // Add treasury as treasury manager in governance
  console.log("🔧 Adding DAOTreasury as treasury manager...");
  await daoGovernance.addTreasuryManager(daoTreasuryAddress);
  
  // Add deployer as treasury manager in treasury contract
  console.log("🔧 Adding deployer as treasury manager...");
  await daoTreasury.addTreasuryManager(deployer.address);

  // Mint some initial tokens for testing
  console.log("🪙 Minting initial tokens for testing...");
  const initialMintAmount = ethers.parseEther("10000"); // 10,000 tokens
  await governanceToken.mint(deployer.address, initialMintAmount);

  // Display deployment summary
  console.log("\n🎉 Deployment completed successfully!");
  console.log("=" .repeat(60));
  console.log("📋 DEPLOYMENT SUMMARY");
  console.log("=" .repeat(60));
  console.log(`🏷️  Network: ${(await ethers.provider.getNetwork()).name}`);
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`📊 GovernanceToken: ${governanceTokenAddress}`);
  console.log(`🏛️  DAOGovernance: ${daoGovernanceAddress}`);
  console.log(`💎 DAOTreasury: ${daoTreasuryAddress}`);
  console.log("=" .repeat(60));

  // Display token information
  const tokenName = await governanceToken.name();
  const tokenSymbol = await governanceToken.symbol();
  const totalSupply = await governanceToken.totalSupply();
  const deployerBalance = await governanceToken.balanceOf(deployer.address);
  
  console.log("\n📊 TOKEN INFORMATION");
  console.log("=" .repeat(40));
  console.log(`Name: ${tokenName}`);
  console.log(`Symbol: ${tokenSymbol}`);
  console.log(`Total Supply: ${ethers.formatEther(totalSupply)} ${tokenSymbol}`);
  console.log(`Deployer Balance: ${ethers.formatEther(deployerBalance)} ${tokenSymbol}`);

  // Display governance configuration
  const votingConfig = await daoGovernance.votingConfig();
  console.log("\n🏛️ GOVERNANCE CONFIGURATION");
  console.log("=" .repeat(40));
  console.log(`Proposal Threshold: ${ethers.formatEther(votingConfig.proposalThreshold)} ${tokenSymbol}`);
  console.log(`Voting Delay: ${votingConfig.votingDelay} seconds`);
  console.log(`Voting Period: ${votingConfig.votingPeriod} seconds`);
  console.log(`Quorum Threshold: ${ethers.formatEther(votingConfig.quorumThreshold)} ${tokenSymbol}`);
  console.log(`Max Votes Per Wallet: ${votingConfig.maxVotesPerWallet}`);
  console.log(`Proposal Cooldown: ${votingConfig.proposalCooldown} seconds`);

  // Save deployment addresses to a file for frontend use
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId,
    deployer: deployer.address,
    contracts: {
      GovernanceToken: {
        address: governanceTokenAddress,
        name: tokenName,
        symbol: tokenSymbol
      },
      DAOGovernance: {
        address: daoGovernanceAddress
      },
      DAOTreasury: {
        address: daoTreasuryAddress
      }
    },
    deploymentTime: new Date().toISOString()
  };

  // Write to file
  const fs = require('fs');
  const path = require('path');
  
  const deploymentDir = path.join(__dirname, '../deployments');
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }
  
  const deploymentFile = path.join(deploymentDir, `deployment-${Date.now()}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`\n💾 Deployment info saved to: ${deploymentFile}`);

  // Verification instructions
  console.log("\n🔍 VERIFICATION INSTRUCTIONS");
  console.log("=" .repeat(50));
  console.log("To verify contracts on Etherscan, run:");
  console.log(`npx hardhat verify --network <network> ${governanceTokenAddress} "DAO Governance Token" "DAOGOV" "${deployer.address}"`);
  console.log(`npx hardhat verify --network <network> ${daoGovernanceAddress} "${governanceTokenAddress}" "${deployer.address}"`);
  console.log(`npx hardhat verify --network <network> ${daoTreasuryAddress} "${daoGovernanceAddress}" "${deployer.address}"`);

  console.log("\n🎯 NEXT STEPS");
  console.log("=" .repeat(30));
  console.log("1. 🧪 Run tests: npm run test");
  console.log("2. 🌐 Set up frontend with contract addresses");
  console.log("3. 📝 Create your first proposal");
  console.log("4. 🗳️  Test the voting mechanism");
  console.log("5. 💰 Fund the treasury for proposal execution");

  return {
    governanceToken: governanceTokenAddress,
    daoGovernance: daoGovernanceAddress,
    daoTreasury: daoTreasuryAddress
  };
}

// Handle errors and run the deployment
main()
  .then((addresses) => {
    console.log("\n✨ Deployment successful!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });

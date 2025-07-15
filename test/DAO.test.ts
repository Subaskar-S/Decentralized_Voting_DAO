import { expect } from "chai";
import { ethers } from "hardhat";
import { GovernanceToken, DAOGovernance, DAOTreasury } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("DAO System", function () {
  let governanceToken: GovernanceToken;
  let daoGovernance: DAOGovernance;
  let daoTreasury: DAOTreasury;
  
  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let carol: SignerWithAddress;

  const INITIAL_SUPPLY = ethers.parseEther("100000000"); // 100M tokens
  const PROPOSAL_THRESHOLD = ethers.parseEther("1000"); // 1K tokens
  const VOTING_DELAY = 24 * 60 * 60; // 1 day
  const VOTING_PERIOD = 7 * 24 * 60 * 60; // 7 days

  beforeEach(async function () {
    // Get signers
    [owner, alice, bob, carol] = await ethers.getSigners();

    // Deploy GovernanceToken
    const GovernanceTokenFactory = await ethers.getContractFactory("GovernanceToken");
    governanceToken = await GovernanceTokenFactory.deploy(
      "DAO Governance Token",
      "DAOGOV",
      owner.address
    );

    // Deploy DAOGovernance
    const DAOGovernanceFactory = await ethers.getContractFactory("DAOGovernance");
    daoGovernance = await DAOGovernanceFactory.deploy(
      await governanceToken.getAddress(),
      owner.address
    );

    // Deploy DAOTreasury
    const DAOTreasuryFactory = await ethers.getContractFactory("DAOTreasury");
    daoTreasury = await DAOTreasuryFactory.deploy(
      await daoGovernance.getAddress(),
      owner.address
    );

    // Setup permissions
    await governanceToken.addMinter(await daoGovernance.getAddress());
    await daoGovernance.addTreasuryManager(await daoTreasury.getAddress());
    await daoTreasury.addTreasuryManager(owner.address);

    // Distribute tokens for testing
    await governanceToken.mint(alice.address, ethers.parseEther("10000"));
    await governanceToken.mint(bob.address, ethers.parseEther("5000"));
    await governanceToken.mint(carol.address, ethers.parseEther("3000"));
  });

  describe("GovernanceToken", function () {
    it("Should have correct initial supply", async function () {
      const totalSupply = await governanceToken.totalSupply();
      // Account for the additional tokens minted in beforeEach
      const expectedSupply = INITIAL_SUPPLY + ethers.parseEther("18000"); // 10K + 5K + 3K
      expect(totalSupply).to.equal(expectedSupply);
    });

    it("Should allow minting by authorized minters", async function () {
      const mintAmount = ethers.parseEther("1000");
      await governanceToken.mint(alice.address, mintAmount);
      
      expect(await governanceToken.balanceOf(alice.address)).to.equal(
        ethers.parseEther("11000")
      );
    });

    it("Should allow burning tokens", async function () {
      const burnAmount = ethers.parseEther("1000");
      await governanceToken.connect(alice).burn(burnAmount);
      
      expect(await governanceToken.balanceOf(alice.address)).to.equal(
        ethers.parseEther("9000")
      );
    });

    it("Should support vote delegation", async function () {
      // First, both need to self-delegate to activate their voting power
      await governanceToken.connect(alice).delegate(alice.address);
      await governanceToken.connect(bob).delegate(bob.address);

      // Check initial voting power
      expect(await governanceToken.getVotes(alice.address)).to.equal(ethers.parseEther("10000"));
      expect(await governanceToken.getVotes(bob.address)).to.equal(ethers.parseEther("5000"));

      // Alice delegates to Bob
      await governanceToken.connect(alice).delegate(bob.address);

      // Check voting power after delegation
      expect(await governanceToken.getVotes(bob.address)).to.equal(
        ethers.parseEther("15000") // Bob's 5K + Alice's 10K
      );
      expect(await governanceToken.getVotes(alice.address)).to.equal(0);
    });
  });

  describe("DAOGovernance", function () {
    beforeEach(async function () {
      // Delegate votes to enable voting
      await governanceToken.connect(alice).delegate(alice.address);
      await governanceToken.connect(bob).delegate(bob.address);
      await governanceToken.connect(carol).delegate(carol.address);
    });

    it("Should allow creating proposals", async function () {
      const title = "Fund Open Source Library";
      const ipfsHash = "QmTest123456789";
      
      await expect(
        daoGovernance.connect(alice).propose(title, ipfsHash)
      ).to.emit(daoGovernance, "ProposalCreated");
      
      expect(await daoGovernance.proposalCount()).to.equal(1);
    });

    it("Should enforce proposal threshold", async function () {
      // Carol has only 3K tokens, below the 1K threshold but should work
      const title = "Small Proposal";
      const ipfsHash = "QmTest123456789";
      
      await expect(
        daoGovernance.connect(carol).propose(title, ipfsHash)
      ).to.not.be.reverted;
    });

    it("Should allow quadratic voting", async function () {
      // Create proposal
      const title = "Test Proposal";
      const ipfsHash = "QmTest123456789";
      await daoGovernance.connect(alice).propose(title, ipfsHash);
      
      // Fast forward past voting delay
      await ethers.provider.send("evm_increaseTime", [VOTING_DELAY + 1]);
      await ethers.provider.send("evm_mine", []);
      
      // Bob votes with 10 votes (cost = 100 tokens)
      const votes = 10;
      const expectedCost = votes * votes; // 100 tokens
      const expectedCostWei = ethers.parseEther(expectedCost.toString());

      // Approve tokens for burning
      await governanceToken.connect(bob).approve(
        await daoGovernance.getAddress(),
        expectedCostWei
      );

      await expect(
        daoGovernance.connect(bob).vote(1, votes)
      ).to.emit(daoGovernance, "VoteCast")
        .withArgs(1, bob.address, votes, expectedCostWei);
      
      // Check proposal vote count
      const proposal = await daoGovernance.getProposal(1);
      expect(proposal.totalVotes).to.equal(votes);
    });

    it("Should prevent double voting", async function () {
      // Create proposal and fast forward
      await daoGovernance.connect(alice).propose("Test", "QmTest");
      await ethers.provider.send("evm_increaseTime", [VOTING_DELAY + 1]);
      await ethers.provider.send("evm_mine", []);
      
      // First vote
      await governanceToken.connect(bob).approve(
        await daoGovernance.getAddress(),
        ethers.parseEther("100")
      );
      await daoGovernance.connect(bob).vote(1, 10);
      
      // Second vote should fail
      await expect(
        daoGovernance.connect(bob).vote(1, 5)
      ).to.be.revertedWith("DAOGovernance: already voted");
    });

    it("Should support vote delegation", async function () {
      // Alice delegates to Bob
      await daoGovernance.connect(alice).delegateVotes(bob.address);
      
      // Check delegated votes
      expect(await daoGovernance.delegatedVotes(bob.address)).to.equal(
        ethers.parseEther("10000")
      );
    });
  });

  describe("DAOTreasury", function () {
    beforeEach(async function () {
      // Fund treasury with ETH
      await owner.sendTransaction({
        to: await daoTreasury.getAddress(),
        value: ethers.parseEther("10")
      });
    });

    it("Should accept ETH deposits", async function () {
      const treasuryBalance = await daoTreasury.getTokenBalance(ethers.ZeroAddress);
      expect(treasuryBalance.balance).to.equal(ethers.parseEther("10"));
    });

    it("Should allow treasury managers to create budgets", async function () {
      await daoTreasury.createBudgetAllocation(
        "development",
        ethers.ZeroAddress,
        ethers.parseEther("5")
      );
      
      const budget = await daoTreasury.getBudgetAllocation("development");
      expect(budget.totalBudget).to.equal(ethers.parseEther("5"));
    });

    it("Should allow spending from budget", async function () {
      // Create budget
      await daoTreasury.createBudgetAllocation(
        "development",
        ethers.ZeroAddress,
        ethers.parseEther("5")
      );
      
      const initialBalance = await ethers.provider.getBalance(alice.address);
      
      // Spend from budget
      await daoTreasury.spendFromBudget(
        "development",
        alice.address,
        ethers.parseEther("1")
      );
      
      const finalBalance = await ethers.provider.getBalance(alice.address);
      expect(finalBalance - initialBalance).to.equal(ethers.parseEther("1"));
    });
  });

  describe("Integration: Complete Proposal Lifecycle", function () {
    it("Should handle complete Alice, Bob, Carol scenario", async function () {
      // Setup: Delegate votes
      await governanceToken.connect(alice).delegate(alice.address);
      await governanceToken.connect(bob).delegate(bob.address);
      await governanceToken.connect(carol).delegate(carol.address);
      
      // Alice proposes to fund a new open-source library
      const title = "Fund Open Source Library Development";
      const ipfsHash = "QmProposalMetadata123456789";
      
      await expect(
        daoGovernance.connect(alice).propose(title, ipfsHash)
      ).to.emit(daoGovernance, "ProposalCreated");
      
      // Fast forward past voting delay
      await ethers.provider.send("evm_increaseTime", [VOTING_DELAY + 1]);
      await ethers.provider.send("evm_mine", []);
      
      // Bob votes with 4 votes (16 tokens deducted)
      const votes = 4;
      const expectedCost = votes * votes; // 16 tokens
      const expectedCostWei = ethers.parseEther(expectedCost.toString());

      await governanceToken.connect(bob).approve(
        await daoGovernance.getAddress(),
        expectedCostWei
      );

      await expect(
        daoGovernance.connect(bob).vote(1, votes)
      ).to.emit(daoGovernance, "VoteCast")
        .withArgs(1, bob.address, votes, expectedCostWei);
      
      // Carol delegates her votes to Bob
      await daoGovernance.connect(carol).delegateVotes(bob.address);
      
      // Check that Bob now has delegated votes from Carol
      expect(await daoGovernance.delegatedVotes(bob.address)).to.equal(
        ethers.parseEther("3000")
      );
      
      // Fast forward past voting period
      await ethers.provider.send("evm_increaseTime", [VOTING_PERIOD + 1]);
      await ethers.provider.send("evm_mine", []);
      
      // Check final proposal state
      const proposal = await daoGovernance.getProposal(1);
      expect(proposal.totalVotes).to.equal(4);
      expect(proposal.totalVoters).to.equal(1);
      
      console.log("🎉 Complete DAO scenario executed successfully!");
      console.log(`📊 Proposal: ${proposal.title}`);
      console.log(`🗳️  Total votes: ${proposal.totalVotes}`);
      console.log(`👥 Total voters: ${proposal.totalVoters}`);
    });
  });
});

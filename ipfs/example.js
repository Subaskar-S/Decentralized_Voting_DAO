/**
 * IPFS Integration Example
 * 
 * This script demonstrates how to use the IPFS integration
 * for uploading and managing DAO proposal metadata.
 */

const { metadataService } = require('./metadata');
const { pinningService } = require('./pinning');
const { ipfsClient } = require('./client');

async function runExample() {
  try {
    console.log('🚀 Starting IPFS Integration Example...\n');

    // Initialize services
    console.log('1️⃣ Initializing IPFS services...');
    await ipfsClient.initialize();
    await pinningService.initialize();
    console.log('✅ Services initialized\n');

    // Example proposal data
    const proposalData = {
      id: 'PROP-001',
      title: 'Fund Open Source Library Development',
      description: `This proposal requests funding to develop a new open-source library that will benefit the entire DAO ecosystem. 
      
The library will provide:
- Standardized governance interfaces
- Quadratic voting utilities
- IPFS metadata management
- Treasury management tools

The development will take approximately 3 months and require a budget of 50,000 DAOGOV tokens.`,
      
      proposer: '0x742d35Cc6634C0532925a3b8D4C9db96590c6C87',
      proposerName: 'Alice Developer',
      proposerContact: 'alice@example.com',
      
      category: 'development',
      tags: ['open-source', 'library', 'governance', 'tools'],
      
      summary: 'Fund development of open-source governance library',
      motivation: 'Current governance tools are fragmented and difficult to use',
      specification: 'Build TypeScript library with React components',
      rationale: 'Standardized tools will improve DAO participation',
      implementation: 'Agile development with 2-week sprints',
      timeline: '3 months from approval',
      budget: {
        total: '50,000 DAOGOV',
        breakdown: [
          { item: 'Development', amount: '40,000 DAOGOV' },
          { item: 'Testing & QA', amount: '7,000 DAOGOV' },
          { item: 'Documentation', amount: '3,000 DAOGOV' }
        ]
      },
      
      links: [
        { title: 'GitHub Repository', url: 'https://github.com/dao/governance-lib' },
        { title: 'Technical Specification', url: 'https://docs.dao.org/specs/gov-lib' }
      ],
      
      references: [
        'Previous proposal PROP-000 for infrastructure',
        'Community discussion thread #123'
      ],
      
      // Example attachments (in real usage, these would be actual file data)
      attachments: [
        {
          name: 'technical-spec.pdf',
          type: 'application/pdf',
          data: Buffer.from('Mock PDF content for technical specification')
        },
        {
          name: 'budget-breakdown.csv',
          type: 'text/csv',
          data: Buffer.from('Item,Amount\nDevelopment,40000\nTesting,7000\nDocs,3000')
        }
      ]
    };

    // Upload proposal metadata
    console.log('2️⃣ Uploading proposal metadata to IPFS...');
    const uploadResult = await metadataService.uploadProposalMetadata(proposalData);
    console.log(`✅ Metadata uploaded: ${uploadResult.hash}\n`);

    // Pin the proposal
    console.log('3️⃣ Pinning proposal content...');
    const attachmentHashes = uploadResult.metadata.attachments.map(att => att.hash);
    const pinResult = await pinningService.pinProposal(
      proposalData.id,
      uploadResult.hash,
      attachmentHashes,
      { retentionPeriod: 365 * 24 * 60 * 60 * 1000 } // 1 year
    );
    console.log(`✅ Pinned ${pinResult.totalPinned} items\n`);

    // Retrieve and verify metadata
    console.log('4️⃣ Retrieving and verifying metadata...');
    const retrievedMetadata = await metadataService.retrieveProposalMetadata(uploadResult.hash);
    console.log(`✅ Retrieved proposal: ${retrievedMetadata.proposal.title}`);
    console.log(`📎 Attachments: ${retrievedMetadata.attachments.length}\n`);

    // Display pinning statistics
    console.log('5️⃣ Pinning statistics:');
    const stats = pinningService.getStatistics();
    console.log(`📌 Total pins: ${stats.total}`);
    console.log(`📊 By category:`, stats.byCategory);
    console.log(`⭐ By priority:`, stats.byPriority);
    console.log(`💾 Total size: ${stats.totalSize} bytes\n`);

    // List all pins
    console.log('6️⃣ Current pins:');
    const pins = pinningService.listPins();
    pins.forEach(pin => {
      console.log(`  📌 ${pin.hash.substring(0, 12)}... (${pin.category}) - ${pin.description}`);
    });
    console.log();

    // Demonstrate retrieval of individual attachments
    console.log('7️⃣ Retrieving individual attachments...');
    for (const attachment of retrievedMetadata.attachments) {
      try {
        const attachmentData = await ipfsClient.retrieve(attachment.hash);
        console.log(`✅ Retrieved ${attachment.name}: ${attachmentData.length} bytes`);
      } catch (error) {
        console.error(`❌ Failed to retrieve ${attachment.name}:`, error.message);
      }
    }
    console.log();

    // Get IPFS node information
    console.log('8️⃣ IPFS Node Information:');
    const nodeInfo = await ipfsClient.getNodeInfo();
    console.log(`🔗 Version: ${nodeInfo.version}`);
    console.log(`🆔 Peer ID: ${nodeInfo.peerId.substring(0, 20)}...`);
    console.log(`💾 Repo Size: ${nodeInfo.repoSize} bytes`);
    console.log(`📦 Objects: ${nodeInfo.numObjects}\n`);

    // Demonstrate proposal lifecycle
    console.log('9️⃣ Simulating proposal lifecycle...');
    
    // Update retention period (proposal becomes active)
    await pinningService.updateRetentionPeriod(
      uploadResult.hash,
      30 * 24 * 60 * 60 * 1000 // 30 days
    );
    console.log('✅ Updated retention period for active proposal');

    // Later, when proposal is completed, extend retention
    await pinningService.updateRetentionPeriod(
      uploadResult.hash,
      365 * 24 * 60 * 60 * 1000 // 1 year
    );
    console.log('✅ Extended retention period for completed proposal\n');

    // Show upload history
    console.log('🔟 Upload History:');
    const history = metadataService.getUploadHistory();
    history.forEach(entry => {
      console.log(`  📝 ${entry.title} (${entry.hash.substring(0, 12)}...) - ${new Date(entry.timestamp).toLocaleString()}`);
    });
    console.log();

    console.log('🎉 IPFS Integration Example completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   • Uploaded proposal metadata: ${uploadResult.hash}`);
    console.log(`   • Pinned ${pinResult.totalPinned} items`);
    console.log(`   • Total pins in system: ${stats.total}`);
    console.log(`   • IPFS node version: ${nodeInfo.version}`);

  } catch (error) {
    console.error('❌ Example failed:', error.message);
    console.error(error.stack);
  } finally {
    // Cleanup
    await ipfsClient.close();
  }
}

// Additional utility functions for testing

/**
 * Test IPFS connectivity
 */
async function testConnectivity() {
  try {
    console.log('🔍 Testing IPFS connectivity...');
    await ipfsClient.initialize();
    
    const testData = { test: true, timestamp: Date.now() };
    const hash = await ipfsClient.upload(testData);
    const retrieved = await ipfsClient.retrieve(hash);
    
    console.log('✅ IPFS connectivity test passed');
    return JSON.parse(retrieved);
  } catch (error) {
    console.error('❌ IPFS connectivity test failed:', error.message);
    throw error;
  }
}

/**
 * Cleanup test data
 */
async function cleanup() {
  try {
    console.log('🧹 Cleaning up test data...');
    
    await pinningService.initialize();
    const pins = pinningService.listPins({ category: 'proposal-metadata' });
    
    for (const pin of pins) {
      if (pin.proposalId === 'PROP-001') {
        await pinningService.unpinContent(pin.hash, true);
        console.log(`🗑️ Unpinned: ${pin.hash.substring(0, 12)}...`);
      }
    }
    
    console.log('✅ Cleanup completed');
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  }
}

// Export functions for use in other scripts
module.exports = {
  runExample,
  testConnectivity,
  cleanup
};

// Run example if called directly
if (require.main === module) {
  runExample().catch(console.error);
}

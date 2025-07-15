/**
 * IPFS Pinning Management Service
 * 
 * This module manages IPFS pinning to ensure proposal metadata
 * and attachments remain accessible and persistent.
 */

const { ipfsClient } = require('./client');
const fs = require('fs').promises;
const path = require('path');

// Pinning configuration
const PINNING_CONFIG = {
  // Auto-pin new uploads
  autoPinUploads: true,
  
  // Pin retention periods (in milliseconds)
  retentionPeriods: {
    active: 30 * 24 * 60 * 60 * 1000,    // 30 days for active proposals
    completed: 365 * 24 * 60 * 60 * 1000, // 1 year for completed proposals
    permanent: -1                          // Permanent pinning
  },
  
  // Maximum pins per category
  maxPins: {
    proposals: 1000,
    attachments: 5000,
    metadata: 500
  },
  
  // Pin database file
  pinDatabaseFile: path.join(__dirname, 'pins.json')
};

class PinningService {
  constructor() {
    this.pins = new Map();
    this.initialized = false;
  }

  /**
   * Initialize pinning service
   */
  async initialize() {
    if (this.initialized) return;

    try {
      console.log('📌 Initializing pinning service...');
      
      // Load existing pins from database
      await this.loadPinDatabase();
      
      // Sync with IPFS node
      await this.syncWithIPFS();
      
      // Start cleanup scheduler
      this.startCleanupScheduler();
      
      this.initialized = true;
      console.log('✅ Pinning service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize pinning service:', error.message);
      throw error;
    }
  }

  /**
   * Pin content with metadata
   * @param {string} hash - IPFS hash to pin
   * @param {Object} metadata - Pin metadata
   * @returns {Promise<boolean>} Success status
   */
  async pinContent(hash, metadata = {}) {
    try {
      if (!this.initialized) await this.initialize();

      console.log(`📌 Pinning content: ${hash}`);
      
      // Check if already pinned
      if (this.pins.has(hash)) {
        console.log(`ℹ️ Content already pinned: ${hash}`);
        return true;
      }

      // Pin to IPFS
      await ipfsClient.pin(hash);
      
      // Store pin metadata
      const pinInfo = {
        hash,
        pinnedAt: Date.now(),
        category: metadata.category || 'general',
        proposalId: metadata.proposalId || null,
        retentionPeriod: metadata.retentionPeriod || PINNING_CONFIG.retentionPeriods.active,
        priority: metadata.priority || 'normal',
        description: metadata.description || '',
        size: metadata.size || null,
        ...metadata
      };

      this.pins.set(hash, pinInfo);
      
      // Save to database
      await this.savePinDatabase();
      
      console.log(`✅ Content pinned successfully: ${hash}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to pin content ${hash}:`, error.message);
      throw error;
    }
  }

  /**
   * Unpin content
   * @param {string} hash - IPFS hash to unpin
   * @param {boolean} force - Force unpin even if retention period not met
   * @returns {Promise<boolean>} Success status
   */
  async unpinContent(hash, force = false) {
    try {
      if (!this.initialized) await this.initialize();

      console.log(`📌 Unpinning content: ${hash}`);
      
      const pinInfo = this.pins.get(hash);
      if (!pinInfo) {
        console.log(`ℹ️ Content not in pin database: ${hash}`);
        return true;
      }

      // Check retention period unless forced
      if (!force && pinInfo.retentionPeriod > 0) {
        const age = Date.now() - pinInfo.pinnedAt;
        if (age < pinInfo.retentionPeriod) {
          throw new Error(`Retention period not met. ${Math.ceil((pinInfo.retentionPeriod - age) / (24 * 60 * 60 * 1000))} days remaining`);
        }
      }

      // Unpin from IPFS
      await ipfsClient.unpin(hash);
      
      // Remove from database
      this.pins.delete(hash);
      await this.savePinDatabase();
      
      console.log(`✅ Content unpinned successfully: ${hash}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to unpin content ${hash}:`, error.message);
      throw error;
    }
  }

  /**
   * Pin proposal metadata and attachments
   * @param {string} proposalId - Proposal ID
   * @param {string} metadataHash - Metadata IPFS hash
   * @param {Array} attachmentHashes - Attachment IPFS hashes
   * @param {Object} options - Pinning options
   * @returns {Promise<Object>} Pinning results
   */
  async pinProposal(proposalId, metadataHash, attachmentHashes = [], options = {}) {
    try {
      console.log(`📌 Pinning proposal ${proposalId}...`);
      
      const results = {
        proposalId,
        metadata: { hash: metadataHash, success: false },
        attachments: [],
        totalPinned: 0
      };

      // Pin metadata
      try {
        await this.pinContent(metadataHash, {
          category: 'proposal-metadata',
          proposalId,
          retentionPeriod: options.retentionPeriod || PINNING_CONFIG.retentionPeriods.active,
          priority: 'high',
          description: `Proposal ${proposalId} metadata`
        });
        results.metadata.success = true;
        results.totalPinned++;
      } catch (error) {
        results.metadata.error = error.message;
      }

      // Pin attachments
      for (const attachmentHash of attachmentHashes) {
        const attachmentResult = { hash: attachmentHash, success: false };
        
        try {
          await this.pinContent(attachmentHash, {
            category: 'proposal-attachment',
            proposalId,
            retentionPeriod: options.retentionPeriod || PINNING_CONFIG.retentionPeriods.active,
            priority: 'normal',
            description: `Proposal ${proposalId} attachment`
          });
          attachmentResult.success = true;
          results.totalPinned++;
        } catch (error) {
          attachmentResult.error = error.message;
        }
        
        results.attachments.push(attachmentResult);
      }

      console.log(`✅ Proposal pinning completed: ${results.totalPinned} items pinned`);
      return results;
    } catch (error) {
      console.error(`❌ Failed to pin proposal ${proposalId}:`, error.message);
      throw error;
    }
  }

  /**
   * Update pin retention period
   * @param {string} hash - IPFS hash
   * @param {number} newRetentionPeriod - New retention period in milliseconds
   * @returns {Promise<boolean>} Success status
   */
  async updateRetentionPeriod(hash, newRetentionPeriod) {
    try {
      const pinInfo = this.pins.get(hash);
      if (!pinInfo) {
        throw new Error(`Pin not found: ${hash}`);
      }

      pinInfo.retentionPeriod = newRetentionPeriod;
      pinInfo.updatedAt = Date.now();
      
      this.pins.set(hash, pinInfo);
      await this.savePinDatabase();
      
      console.log(`✅ Updated retention period for ${hash}: ${newRetentionPeriod}ms`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to update retention period:`, error.message);
      throw error;
    }
  }

  /**
   * Get pin information
   * @param {string} hash - IPFS hash
   * @returns {Object|null} Pin information
   */
  getPinInfo(hash) {
    return this.pins.get(hash) || null;
  }

  /**
   * List all pins with optional filtering
   * @param {Object} filters - Filter options
   * @returns {Array} List of pins
   */
  listPins(filters = {}) {
    let pins = Array.from(this.pins.values());

    // Apply filters
    if (filters.category) {
      pins = pins.filter(pin => pin.category === filters.category);
    }

    if (filters.proposalId) {
      pins = pins.filter(pin => pin.proposalId === filters.proposalId);
    }

    if (filters.priority) {
      pins = pins.filter(pin => pin.priority === filters.priority);
    }

    // Sort by pinned date (newest first)
    pins.sort((a, b) => b.pinnedAt - a.pinnedAt);

    return pins;
  }

  /**
   * Get pinning statistics
   * @returns {Object} Pinning statistics
   */
  getStatistics() {
    const pins = Array.from(this.pins.values());
    
    const stats = {
      total: pins.length,
      byCategory: {},
      byPriority: {},
      totalSize: 0,
      oldestPin: null,
      newestPin: null
    };

    pins.forEach(pin => {
      // Count by category
      stats.byCategory[pin.category] = (stats.byCategory[pin.category] || 0) + 1;
      
      // Count by priority
      stats.byPriority[pin.priority] = (stats.byPriority[pin.priority] || 0) + 1;
      
      // Calculate total size
      if (pin.size) {
        stats.totalSize += pin.size;
      }
      
      // Track oldest and newest
      if (!stats.oldestPin || pin.pinnedAt < stats.oldestPin.pinnedAt) {
        stats.oldestPin = pin;
      }
      
      if (!stats.newestPin || pin.pinnedAt > stats.newestPin.pinnedAt) {
        stats.newestPin = pin;
      }
    });

    return stats;
  }

  /**
   * Cleanup expired pins
   * @returns {Promise<Object>} Cleanup results
   */
  async cleanupExpiredPins() {
    try {
      console.log('🧹 Starting pin cleanup...');
      
      const now = Date.now();
      const expiredPins = [];
      
      for (const [hash, pinInfo] of this.pins.entries()) {
        if (pinInfo.retentionPeriod > 0) {
          const age = now - pinInfo.pinnedAt;
          if (age > pinInfo.retentionPeriod) {
            expiredPins.push({ hash, pinInfo });
          }
        }
      }

      const results = {
        checked: this.pins.size,
        expired: expiredPins.length,
        unpinned: 0,
        errors: []
      };

      for (const { hash, pinInfo } of expiredPins) {
        try {
          await this.unpinContent(hash, true);
          results.unpinned++;
        } catch (error) {
          results.errors.push({ hash, error: error.message });
        }
      }

      console.log(`✅ Pin cleanup completed: ${results.unpinned}/${results.expired} expired pins removed`);
      return results;
    } catch (error) {
      console.error('❌ Pin cleanup failed:', error.message);
      throw error;
    }
  }

  /**
   * Sync pin database with IPFS node
   * @returns {Promise<Object>} Sync results
   */
  async syncWithIPFS() {
    try {
      console.log('🔄 Syncing pin database with IPFS node...');
      
      // Get pins from IPFS node
      const ipfsPins = await ipfsClient.listPinned();
      const ipfsHashes = new Set(ipfsPins.map(pin => pin.hash));
      
      // Get pins from database
      const dbHashes = new Set(this.pins.keys());
      
      const results = {
        ipfsPins: ipfsPins.length,
        dbPins: dbHashes.size,
        onlyInIPFS: [],
        onlyInDB: [],
        synced: 0
      };

      // Find pins only in IPFS
      for (const hash of ipfsHashes) {
        if (!dbHashes.has(hash)) {
          results.onlyInIPFS.push(hash);
        }
      }

      // Find pins only in database
      for (const hash of dbHashes) {
        if (!ipfsHashes.has(hash)) {
          results.onlyInDB.push(hash);
          // Remove from database if not in IPFS
          this.pins.delete(hash);
        } else {
          results.synced++;
        }
      }

      // Save updated database
      if (results.onlyInDB.length > 0) {
        await this.savePinDatabase();
      }

      console.log(`✅ Pin sync completed: ${results.synced} synced, ${results.onlyInIPFS.length} IPFS-only, ${results.onlyInDB.length} removed`);
      return results;
    } catch (error) {
      console.error('❌ Pin sync failed:', error.message);
      throw error;
    }
  }

  /**
   * Load pin database from file
   */
  async loadPinDatabase() {
    try {
      const data = await fs.readFile(PINNING_CONFIG.pinDatabaseFile, 'utf8');
      const pins = JSON.parse(data);
      
      this.pins.clear();
      for (const pin of pins) {
        this.pins.set(pin.hash, pin);
      }
      
      console.log(`📂 Loaded ${pins.length} pins from database`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('📂 No existing pin database found, starting fresh');
      } else {
        console.error('❌ Failed to load pin database:', error.message);
        throw error;
      }
    }
  }

  /**
   * Save pin database to file
   */
  async savePinDatabase() {
    try {
      const pins = Array.from(this.pins.values());
      await fs.writeFile(PINNING_CONFIG.pinDatabaseFile, JSON.stringify(pins, null, 2));
      console.log(`💾 Saved ${pins.length} pins to database`);
    } catch (error) {
      console.error('❌ Failed to save pin database:', error.message);
      throw error;
    }
  }

  /**
   * Start cleanup scheduler
   */
  startCleanupScheduler() {
    // Run cleanup every 24 hours
    const cleanupInterval = 24 * 60 * 60 * 1000;
    
    setInterval(async () => {
      try {
        await this.cleanupExpiredPins();
      } catch (error) {
        console.error('❌ Scheduled cleanup failed:', error.message);
      }
    }, cleanupInterval);
    
    console.log('⏰ Pin cleanup scheduler started (24h interval)');
  }
}

// Export singleton instance
const pinningService = new PinningService();

module.exports = {
  PinningService,
  pinningService,
  PINNING_CONFIG
};

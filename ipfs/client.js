/**
 * IPFS Client Configuration and Setup
 * 
 * This module provides a configured IPFS client for uploading and retrieving
 * proposal metadata with proper error handling and retry mechanisms.
 */

const { create } = require('ipfs-http-client');

// IPFS Configuration
const IPFS_CONFIG = {
  // Default to local IPFS node, can be overridden with environment variables
  host: process.env.IPFS_HOST || 'localhost',
  port: process.env.IPFS_PORT || 5001,
  protocol: process.env.IPFS_PROTOCOL || 'http',
  
  // Timeout settings
  timeout: 30000, // 30 seconds
  
  // API path
  apiPath: '/api/v0'
};

// Alternative public IPFS gateways for fallback
const PUBLIC_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://dweb.link/ipfs/'
];

class IPFSClient {
  constructor(config = IPFS_CONFIG) {
    this.config = config;
    this.client = null;
    this.isConnected = false;
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 second
  }

  /**
   * Initialize IPFS client connection
   */
  async initialize() {
    try {
      console.log('🔗 Initializing IPFS client...');
      
      this.client = create({
        host: this.config.host,
        port: this.config.port,
        protocol: this.config.protocol,
        timeout: this.config.timeout,
        apiPath: this.config.apiPath
      });

      // Test connection
      await this.testConnection();
      this.isConnected = true;
      
      console.log('✅ IPFS client initialized successfully');
      console.log(`📡 Connected to: ${this.config.protocol}://${this.config.host}:${this.config.port}`);
      
      return this.client;
    } catch (error) {
      console.error('❌ Failed to initialize IPFS client:', error.message);
      this.isConnected = false;
      throw new Error(`IPFS initialization failed: ${error.message}`);
    }
  }

  /**
   * Test IPFS connection
   */
  async testConnection() {
    if (!this.client) {
      throw new Error('IPFS client not initialized');
    }

    try {
      const version = await this.client.version();
      console.log(`📋 IPFS Node Version: ${version.version}`);
      return true;
    } catch (error) {
      throw new Error(`IPFS connection test failed: ${error.message}`);
    }
  }

  /**
   * Upload data to IPFS with retry mechanism
   * @param {Object|String} data - Data to upload
   * @param {Object} options - Upload options
   * @returns {Promise<string>} IPFS hash
   */
  async upload(data, options = {}) {
    if (!this.isConnected) {
      await this.initialize();
    }

    const uploadOptions = {
      pin: true, // Pin by default
      wrapWithDirectory: false,
      ...options
    };

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        console.log(`📤 Uploading to IPFS (attempt ${attempt}/${this.retryAttempts})...`);
        
        // Convert data to appropriate format
        const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
        
        // Upload to IPFS
        const result = await this.client.add(content, uploadOptions);
        const hash = result.cid.toString();
        
        console.log(`✅ Upload successful! IPFS Hash: ${hash}`);
        
        // Verify upload by trying to retrieve
        await this.retrieve(hash);
        
        return hash;
      } catch (error) {
        console.error(`❌ Upload attempt ${attempt} failed:`, error.message);
        
        if (attempt === this.retryAttempts) {
          throw new Error(`IPFS upload failed after ${this.retryAttempts} attempts: ${error.message}`);
        }
        
        // Wait before retry
        await this.delay(this.retryDelay * attempt);
      }
    }
  }

  /**
   * Retrieve data from IPFS
   * @param {string} hash - IPFS hash
   * @param {Object} options - Retrieval options
   * @returns {Promise<string>} Retrieved data
   */
  async retrieve(hash, options = {}) {
    if (!this.isConnected) {
      await this.initialize();
    }

    const retrieveOptions = {
      timeout: 10000, // 10 seconds timeout for retrieval
      ...options
    };

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        console.log(`📥 Retrieving from IPFS: ${hash} (attempt ${attempt}/${this.retryAttempts})`);
        
        // Retrieve from IPFS
        const chunks = [];
        for await (const chunk of this.client.cat(hash, retrieveOptions)) {
          chunks.push(chunk);
        }
        
        const data = Buffer.concat(chunks).toString();
        console.log(`✅ Retrieval successful for hash: ${hash}`);
        
        return data;
      } catch (error) {
        console.error(`❌ Retrieval attempt ${attempt} failed:`, error.message);
        
        if (attempt === this.retryAttempts) {
          // Try public gateways as fallback
          console.log('🔄 Trying public gateways as fallback...');
          return await this.retrieveFromGateway(hash);
        }
        
        await this.delay(this.retryDelay * attempt);
      }
    }
  }

  /**
   * Retrieve data from public IPFS gateways as fallback
   * @param {string} hash - IPFS hash
   * @returns {Promise<string>} Retrieved data
   */
  async retrieveFromGateway(hash) {
    for (const gateway of PUBLIC_GATEWAYS) {
      try {
        console.log(`🌐 Trying gateway: ${gateway}`);
        
        const response = await fetch(`${gateway}${hash}`, {
          timeout: 10000
        });
        
        if (response.ok) {
          const data = await response.text();
          console.log(`✅ Retrieved from gateway: ${gateway}`);
          return data;
        }
      } catch (error) {
        console.error(`❌ Gateway ${gateway} failed:`, error.message);
      }
    }
    
    throw new Error(`Failed to retrieve ${hash} from all sources`);
  }

  /**
   * Pin content to IPFS
   * @param {string} hash - IPFS hash to pin
   * @returns {Promise<boolean>} Success status
   */
  async pin(hash) {
    if (!this.isConnected) {
      await this.initialize();
    }

    try {
      console.log(`📌 Pinning content: ${hash}`);
      await this.client.pin.add(hash);
      console.log(`✅ Content pinned successfully: ${hash}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to pin content: ${error.message}`);
      throw new Error(`IPFS pinning failed: ${error.message}`);
    }
  }

  /**
   * Unpin content from IPFS
   * @param {string} hash - IPFS hash to unpin
   * @returns {Promise<boolean>} Success status
   */
  async unpin(hash) {
    if (!this.isConnected) {
      await this.initialize();
    }

    try {
      console.log(`📌 Unpinning content: ${hash}`);
      await this.client.pin.rm(hash);
      console.log(`✅ Content unpinned successfully: ${hash}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to unpin content: ${error.message}`);
      throw new Error(`IPFS unpinning failed: ${error.message}`);
    }
  }

  /**
   * Get pinned content list
   * @returns {Promise<Array>} List of pinned hashes
   */
  async listPinned() {
    if (!this.isConnected) {
      await this.initialize();
    }

    try {
      const pinned = [];
      for await (const pin of this.client.pin.ls()) {
        pinned.push({
          hash: pin.cid.toString(),
          type: pin.type
        });
      }
      return pinned;
    } catch (error) {
      console.error(`❌ Failed to list pinned content: ${error.message}`);
      throw new Error(`IPFS pin list failed: ${error.message}`);
    }
  }

  /**
   * Get IPFS node information
   * @returns {Promise<Object>} Node information
   */
  async getNodeInfo() {
    if (!this.isConnected) {
      await this.initialize();
    }

    try {
      const [version, id, stats] = await Promise.all([
        this.client.version(),
        this.client.id(),
        this.client.stats.repo()
      ]);

      return {
        version: version.version,
        peerId: id.id,
        addresses: id.addresses,
        repoSize: stats.repoSize,
        storageMax: stats.storageMax,
        numObjects: stats.numObjects
      };
    } catch (error) {
      console.error(`❌ Failed to get node info: ${error.message}`);
      throw new Error(`IPFS node info failed: ${error.message}`);
    }
  }

  /**
   * Utility function for delays
   * @param {number} ms - Milliseconds to delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Close IPFS client connection
   */
  async close() {
    if (this.client) {
      console.log('🔌 Closing IPFS client connection...');
      this.isConnected = false;
      this.client = null;
      console.log('✅ IPFS client connection closed');
    }
  }
}

// Export singleton instance
const ipfsClient = new IPFSClient();

module.exports = {
  IPFSClient,
  ipfsClient,
  IPFS_CONFIG,
  PUBLIC_GATEWAYS
};

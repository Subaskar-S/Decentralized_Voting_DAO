/**
 * Proposal Metadata Upload Service
 * 
 * This module provides services for uploading proposal descriptions,
 * attachments, and metadata to IPFS with proper validation and formatting.
 */

const { ipfsClient } = require('./client');
const crypto = require('crypto');
const path = require('path');

// Metadata schema version
const METADATA_VERSION = '1.0.0';

// Supported file types for attachments
const SUPPORTED_FILE_TYPES = {
  images: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
  documents: ['.pdf', '.doc', '.docx', '.txt', '.md', '.rtf'],
  data: ['.json', '.csv', '.xml', '.yaml', '.yml'],
  archives: ['.zip', '.tar', '.gz', '.rar']
};

// Maximum file sizes (in bytes)
const MAX_FILE_SIZES = {
  image: 5 * 1024 * 1024,    // 5MB
  document: 10 * 1024 * 1024, // 10MB
  data: 1 * 1024 * 1024,     // 1MB
  archive: 20 * 1024 * 1024   // 20MB
};

class MetadataService {
  constructor() {
    this.uploadHistory = new Map();
  }

  /**
   * Create and upload proposal metadata to IPFS
   * @param {Object} proposalData - Proposal information
   * @returns {Promise<Object>} Upload result with IPFS hash
   */
  async uploadProposalMetadata(proposalData) {
    try {
      console.log('📝 Creating proposal metadata...');
      
      // Validate proposal data
      this.validateProposalData(proposalData);
      
      // Create metadata object
      const metadata = await this.createMetadataObject(proposalData);
      
      // Upload to IPFS
      const hash = await ipfsClient.upload(metadata, { pin: true });
      
      // Store in upload history
      this.uploadHistory.set(hash, {
        timestamp: Date.now(),
        proposalId: proposalData.id,
        title: proposalData.title
      });
      
      console.log(`✅ Proposal metadata uploaded successfully: ${hash}`);
      
      return {
        success: true,
        hash,
        metadata,
        uploadTime: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Failed to upload proposal metadata:', error.message);
      throw new Error(`Metadata upload failed: ${error.message}`);
    }
  }

  /**
   * Retrieve proposal metadata from IPFS
   * @param {string} hash - IPFS hash
   * @returns {Promise<Object>} Proposal metadata
   */
  async retrieveProposalMetadata(hash) {
    try {
      console.log(`📥 Retrieving proposal metadata: ${hash}`);
      
      const data = await ipfsClient.retrieve(hash);
      const metadata = JSON.parse(data);
      
      // Validate metadata structure
      this.validateMetadataStructure(metadata);
      
      console.log(`✅ Proposal metadata retrieved successfully: ${hash}`);
      
      return metadata;
    } catch (error) {
      console.error('❌ Failed to retrieve proposal metadata:', error.message);
      throw new Error(`Metadata retrieval failed: ${error.message}`);
    }
  }

  /**
   * Upload file attachment to IPFS
   * @param {Buffer|String} fileData - File data
   * @param {Object} fileInfo - File information
   * @returns {Promise<Object>} Upload result
   */
  async uploadAttachment(fileData, fileInfo) {
    try {
      console.log(`📎 Uploading attachment: ${fileInfo.name}`);
      
      // Validate file
      this.validateFile(fileData, fileInfo);
      
      // Upload file to IPFS
      const hash = await ipfsClient.upload(fileData, { pin: true });
      
      // Create attachment metadata
      const attachmentMetadata = {
        hash,
        name: fileInfo.name,
        size: fileData.length,
        type: fileInfo.type || this.getFileType(fileInfo.name),
        uploadTime: new Date().toISOString(),
        checksum: this.calculateChecksum(fileData)
      };
      
      console.log(`✅ Attachment uploaded successfully: ${hash}`);
      
      return attachmentMetadata;
    } catch (error) {
      console.error('❌ Failed to upload attachment:', error.message);
      throw new Error(`Attachment upload failed: ${error.message}`);
    }
  }

  /**
   * Create metadata object with proper structure
   * @param {Object} proposalData - Proposal data
   * @returns {Promise<Object>} Formatted metadata
   */
  async createMetadataObject(proposalData) {
    const metadata = {
      version: METADATA_VERSION,
      type: 'dao-proposal',
      timestamp: new Date().toISOString(),
      
      // Basic proposal information
      proposal: {
        id: proposalData.id,
        title: proposalData.title,
        description: proposalData.description,
        category: proposalData.category || 'general',
        tags: proposalData.tags || [],
        
        // Proposer information
        proposer: {
          address: proposalData.proposer,
          name: proposalData.proposerName || null,
          contact: proposalData.proposerContact || null
        },
        
        // Proposal details
        details: {
          summary: proposalData.summary || proposalData.description.substring(0, 200),
          motivation: proposalData.motivation || null,
          specification: proposalData.specification || null,
          rationale: proposalData.rationale || null,
          implementation: proposalData.implementation || null,
          timeline: proposalData.timeline || null,
          budget: proposalData.budget || null
        },
        
        // Voting information
        voting: {
          type: 'quadratic',
          startTime: proposalData.startTime || null,
          endTime: proposalData.endTime || null,
          quorum: proposalData.quorum || null,
          options: proposalData.options || ['yes', 'no']
        }
      },
      
      // Attachments
      attachments: [],
      
      // Links and references
      links: proposalData.links || [],
      references: proposalData.references || [],
      
      // Technical metadata
      technical: {
        ipfsVersion: await this.getIPFSVersion(),
        uploadClient: 'dao-governance-system',
        encoding: 'utf-8',
        format: 'json'
      }
    };

    // Process attachments if provided
    if (proposalData.attachments && proposalData.attachments.length > 0) {
      for (const attachment of proposalData.attachments) {
        const attachmentMetadata = await this.uploadAttachment(
          attachment.data,
          {
            name: attachment.name,
            type: attachment.type
          }
        );
        metadata.attachments.push(attachmentMetadata);
      }
    }

    return metadata;
  }

  /**
   * Validate proposal data structure
   * @param {Object} proposalData - Proposal data to validate
   */
  validateProposalData(proposalData) {
    const required = ['title', 'description', 'proposer'];
    
    for (const field of required) {
      if (!proposalData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate field lengths
    if (proposalData.title.length > 200) {
      throw new Error('Title too long (max 200 characters)');
    }

    if (proposalData.description.length > 10000) {
      throw new Error('Description too long (max 10,000 characters)');
    }

    // Validate proposer address format (basic check)
    if (!/^0x[a-fA-F0-9]{40}$/.test(proposalData.proposer)) {
      throw new Error('Invalid proposer address format');
    }
  }

  /**
   * Validate metadata structure
   * @param {Object} metadata - Metadata to validate
   */
  validateMetadataStructure(metadata) {
    if (!metadata.version || !metadata.type || !metadata.proposal) {
      throw new Error('Invalid metadata structure');
    }

    if (metadata.type !== 'dao-proposal') {
      throw new Error('Invalid metadata type');
    }

    if (!metadata.proposal.title || !metadata.proposal.description) {
      throw new Error('Missing required proposal fields');
    }
  }

  /**
   * Validate file for upload
   * @param {Buffer|String} fileData - File data
   * @param {Object} fileInfo - File information
   */
  validateFile(fileData, fileInfo) {
    if (!fileData || !fileInfo.name) {
      throw new Error('Invalid file data or name');
    }

    const fileType = this.getFileType(fileInfo.name);
    const maxSize = this.getMaxFileSize(fileType);

    if (fileData.length > maxSize) {
      throw new Error(`File too large. Max size for ${fileType}: ${maxSize} bytes`);
    }

    if (!this.isFileTypeSupported(fileInfo.name)) {
      throw new Error(`Unsupported file type: ${path.extname(fileInfo.name)}`);
    }
  }

  /**
   * Get file type category
   * @param {string} filename - File name
   * @returns {string} File type category
   */
  getFileType(filename) {
    const ext = path.extname(filename).toLowerCase();
    
    for (const [category, extensions] of Object.entries(SUPPORTED_FILE_TYPES)) {
      if (extensions.includes(ext)) {
        return category.slice(0, -1); // Remove 's' from plural
      }
    }
    
    return 'unknown';
  }

  /**
   * Check if file type is supported
   * @param {string} filename - File name
   * @returns {boolean} Whether file type is supported
   */
  isFileTypeSupported(filename) {
    const ext = path.extname(filename).toLowerCase();
    
    for (const extensions of Object.values(SUPPORTED_FILE_TYPES)) {
      if (extensions.includes(ext)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get maximum file size for type
   * @param {string} fileType - File type category
   * @returns {number} Maximum file size in bytes
   */
  getMaxFileSize(fileType) {
    return MAX_FILE_SIZES[fileType] || MAX_FILE_SIZES.data;
  }

  /**
   * Calculate file checksum
   * @param {Buffer|String} data - File data
   * @returns {string} SHA256 checksum
   */
  calculateChecksum(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Get IPFS version
   * @returns {Promise<string>} IPFS version
   */
  async getIPFSVersion() {
    try {
      const nodeInfo = await ipfsClient.getNodeInfo();
      return nodeInfo.version;
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Get upload history
   * @returns {Array} Upload history
   */
  getUploadHistory() {
    return Array.from(this.uploadHistory.entries()).map(([hash, info]) => ({
      hash,
      ...info
    }));
  }

  /**
   * Clear upload history
   */
  clearUploadHistory() {
    this.uploadHistory.clear();
  }
}

// Export singleton instance
const metadataService = new MetadataService();

module.exports = {
  MetadataService,
  metadataService,
  METADATA_VERSION,
  SUPPORTED_FILE_TYPES,
  MAX_FILE_SIZES
};

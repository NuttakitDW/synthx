/**
 * Blockscout API Client
 *
 * Wrapper around Blockscout REST API for easy blockchain queries
 * This makes calls directly - in production, Blockscout MCP would be used via Claude
 */

class BlockscoutClient {
  constructor(chainId = '1', apiBase = 'https://blockscout.com/api/v2') {
    this.chainId = chainId;
    this.apiBase = apiBase;
  }

  /**
   * Make API call to Blockscout
   * @param {string} endpoint - API endpoint path
   * @param {object} params - Query parameters
   * @returns {Promise<object>} API response
   */
  async call(endpoint, params = {}) {
    try {
      const url = new URL(`${this.apiBase}${endpoint}`);
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          url.searchParams.append(key, value);
        }
      });

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Blockscout API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[Blockscout] API Error:', error);
      throw error;
    }
  }

  /**
   * Get address information (contract details, balance, etc.)
   * @param {string} address - Token or contract address
   * @returns {Promise<object>} Address info
   */
  async getAddressInfo(address) {
    return this.call(`/addresses/${address}`);
  }

  /**
   * Get tokens held by an address (for checking top holders)
   * @param {string} address - Address to check
   * @param {object} options - Query options
   * @returns {Promise<object>} Token holders data
   */
  async getTokensByAddress(address, options = {}) {
    return this.call(`/addresses/${address}/tokens`, options);
  }

  /**
   * Get transactions for an address
   * @param {string} address - Address to query
   * @param {object} options - Query options (filter, sort, etc)
   * @returns {Promise<object>} Transactions list
   */
  async getTransactionsByAddress(address, options = {}) {
    return this.call(`/addresses/${address}/transactions`, options);
  }

  /**
   * Get token transfers for an address
   * @param {string} address - Address to query
   * @param {object} options - Query options
   * @returns {Promise<object>} Token transfers
   */
  async getTokenTransfersByAddress(address, options = {}) {
    return this.call(`/addresses/${address}/token-transfers`, options);
  }

  /**
   * Get block information
   * @param {string} blockNumber - Block number or hash
   * @returns {Promise<object>} Block data
   */
  async getBlockInfo(blockNumber) {
    return this.call(`/blocks/${blockNumber}`);
  }

  /**
   * Get transaction information
   * @param {string} txHash - Transaction hash
   * @returns {Promise<object>} Transaction data
   */
  async getTransactionInfo(txHash) {
    return this.call(`/transactions/${txHash}`);
  }

  /**
   * Get logs for a transaction
   * @param {string} txHash - Transaction hash
   * @returns {Promise<object>} Transaction logs
   */
  async getTransactionLogs(txHash) {
    return this.call(`/transactions/${txHash}/logs`);
  }

  /**
   * Get latest block
   * @returns {Promise<object>} Latest block info
   */
  async getLatestBlock() {
    return this.call('/blocks');
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BlockscoutClient;
}

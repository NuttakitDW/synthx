/**
 * Token Safety Score Component
 *
 * Analyzes any token for safety using Blockscout data + Claude AI
 */

class TokenSafetyAnalyzer {
  constructor(blockscoutClient, claudeClient) {
    this.blockscout = blockscoutClient;
    this.claude = claudeClient;
    this.cache = new Map();
  }

  /**
   * Main entry point: analyze a token
   * @param {string} tokenAddress - Token contract address
   * @returns {Promise<object>} Analysis result with safety score
   */
  async analyzeToken(tokenAddress) {
    console.log(`[TokenSafety] Analyzing token: ${tokenAddress}`);

    // Check cache first
    const cached = this.cache.get(tokenAddress);
    if (cached && Date.now() - cached.timestamp < 3600000) {
      console.log('[TokenSafety] Using cached result');
      return cached.result;
    }

    try {
      // Fetch token data from Blockscout
      const tokenData = await this._fetchTokenData(tokenAddress);

      // Analyze with Claude
      const analysis = await this.claude.analyzeTokenSafety(tokenData);

      // Format result for UI
      const result = {
        address: tokenAddress,
        ...analysis,
        fetched_at: new Date().toISOString(),
      };

      // Cache the result
      this.cache.set(tokenAddress, {
        result,
        timestamp: Date.now(),
      });

      return result;
    } catch (error) {
      console.error('[TokenSafety] Analysis failed:', error);
      return {
        address: tokenAddress,
        safety_score: 0,
        verdict: 'ERROR',
        risks: ['Unable to fetch token data'],
        reason: error.message,
        confidence: 'LOW',
        error: true,
      };
    }
  }

  /**
   * Fetch all relevant token data from Blockscout
   * @private
   * @param {string} tokenAddress - Token address
   * @returns {Promise<object>} Combined token data
   */
  async _fetchTokenData(tokenAddress) {
    // Validate address format
    if (!this._isValidAddress(tokenAddress)) {
      throw new Error('Invalid Ethereum address');
    }

    try {
      // Fetch address info (contract details)
      const addressInfo = await this.blockscout.getAddressInfo(tokenAddress);

      // Fetch token holders (to check concentration)
      const tokenHolders = await this.blockscout.getTokensByAddress(tokenAddress, {
        limit: 10,
      });

      // Fetch recent transactions (to check activity)
      const transactions = await this.blockscout.getTransactionsByAddress(tokenAddress, {
        limit: 20,
      });

      // Compile token data
      return {
        name: addressInfo.name || 'Unknown',
        symbol: addressInfo.symbol || 'UNKNOWN',
        address: tokenAddress,
        is_contract: addressInfo.type === 'contract',
        is_verified: addressInfo.verified === true,
        creation_timestamp: addressInfo.creation_tx_hash ? 'Yes' : 'No',
        owner: addressInfo.owner_address || 'Unknown',
        implementation: addressInfo.implementation || null,
        total_supply: addressInfo.exchange_rate || 'N/A',

        // Holder data
        top_holders: tokenHolders?.items?.slice(0, 5).map((h) => ({
          address: h.address,
          percentage: h.percentage || '0',
        })) || [],

        // Activity data
        recent_transactions: transactions?.items?.length || 0,
        has_recent_activity: transactions?.items?.length > 0,
      };
    } catch (error) {
      console.error('[TokenSafety] Data fetch failed:', error);
      throw new Error(`Failed to fetch token data: ${error.message}`);
    }
  }

  /**
   * Validate Ethereum address format
   * @private
   * @param {string} address - Address to validate
   * @returns {boolean}
   */
  _isValidAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Format result for UI display
   * @param {object} analysis - Analysis result
   * @returns {string} Formatted HTML/text
   */
  formatForUI(analysis) {
    const score = analysis.safety_score || 0;
    const verdict = analysis.verdict || 'UNKNOWN';

    let emoji = '❓';
    if (verdict === 'SAFE') emoji = '🟢';
    else if (verdict === 'RISKY') emoji = '🟡';
    else if (verdict === 'SCAM') emoji = '🔴';
    else if (verdict === 'ERROR') emoji = '❌';

    return {
      emoji,
      verdict,
      score,
      risks: analysis.risks || [],
      reason: analysis.reason || 'No analysis available',
      confidence: analysis.confidence || 'LOW',
    };
  }
}

// Export for use in background.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TokenSafetyAnalyzer;
}

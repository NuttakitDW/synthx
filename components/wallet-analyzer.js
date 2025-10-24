/**
 * Wallet Analyzer Component
 *
 * Analyzes wallet trading history and performance
 */

class WalletAnalyzer {
  constructor(blockscoutClient, claudeClient) {
    this.blockscout = blockscoutClient;
    this.claude = claudeClient;
    this.cache = new Map();
  }

  /**
   * Main entry point: analyze a wallet
   * @param {string} walletAddress - Wallet address to analyze
   * @param {object} options - Analysis options (limit, days, etc)
   * @returns {Promise<object>} Analysis result
   */
  async analyzeWallet(walletAddress, options = {}) {
    console.log(`[WalletAnalyzer] Analyzing wallet: ${walletAddress}`);

    const { days = 90, limit = 100 } = options;

    // Check cache
    const cacheKey = `${walletAddress}-${days}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 3600000) {
      console.log('[WalletAnalyzer] Using cached result');
      return cached.result;
    }

    try {
      // Fetch wallet data
      const walletData = await this._fetchWalletData(walletAddress, { days, limit });

      // Analyze with Claude
      const analysis = await this.claude.analyzeWalletTrading(walletData);

      // Format result
      const result = {
        address: walletAddress,
        period_days: days,
        ...analysis,
        fetched_at: new Date().toISOString(),
      };

      // Cache result
      this.cache.set(cacheKey, {
        result,
        timestamp: Date.now(),
      });

      return result;
    } catch (error) {
      console.error('[WalletAnalyzer] Analysis failed:', error);
      return {
        address: walletAddress,
        error: true,
        message: error.message,
        win_rate: 'N/A',
        total_trades: 0,
        recommendation: 'Unable to analyze - please try again',
      };
    }
  }

  /**
   * Fetch wallet trading data from Blockscout
   * @private
   * @param {string} walletAddress - Wallet address
   * @param {object} options - Query options
   * @returns {Promise<object>} Trading data
   */
  async _fetchWalletData(walletAddress, options = {}) {
    if (!this._isValidAddress(walletAddress)) {
      throw new Error('Invalid Ethereum address');
    }

    try {
      // Fetch all transactions
      const transactions = await this.blockscout.getTransactionsByAddress(walletAddress, {
        limit: options.limit || 100,
      });

      // Fetch token transfers
      const tokenTransfers = await this.blockscout.getTokenTransfersByAddress(walletAddress, {
        limit: options.limit || 100,
      });

      // Fetch current holdings
      const holdings = await this.blockscout.getTokensByAddress(walletAddress);

      // Analyze transactions for swaps/trades
      const trades = this._analyzeTransactionsForTrades(transactions?.items || []);

      return {
        address: walletAddress,
        total_transactions: transactions?.pagination?.total_count || transactions?.items?.length || 0,
        total_token_transfers: tokenTransfers?.pagination?.total_count || tokenTransfers?.items?.length || 0,

        // Trade analysis
        trades: trades.slice(0, 20), // Last 20 trades
        total_trades: trades.length,

        // Holdings
        current_holdings: holdings?.items?.slice(0, 10) || [],
        number_of_tokens: holdings?.items?.length || 0,

        // Activity summary
        has_activity: transactions?.items && transactions.items.length > 0,
        most_active_period: this._getMostActivePeriod(transactions?.items || []),
      };
    } catch (error) {
      console.error('[WalletAnalyzer] Data fetch failed:', error);
      throw new Error(`Failed to fetch wallet data: ${error.message}`);
    }
  }

  /**
   * Analyze transactions to identify trades/swaps
   * @private
   * @param {array} transactions - Transaction list
   * @returns {array} Identified trades
   */
  _analyzeTransactionsForTrades(transactions) {
    return transactions
      .filter((tx) => {
        // Filter for swap-like transactions (multiple token transfers)
        return (
          tx.to_address &&
          (tx.method || '').includes('swap') ||
          (tx.method || '').includes('exchange') ||
          (tx.method || '').includes('Send')
        );
      })
      .map((tx) => ({
        hash: tx.hash,
        from: tx.from?.hash || 'unknown',
        to: tx.to?.hash || 'unknown',
        method: tx.method || 'Unknown',
        value: tx.value || '0',
        status: tx.status || 'unknown',
        timestamp: tx.timestamp,
        gas_used: tx.gas_used,
      }));
  }

  /**
   * Determine the most active trading period
   * @private
   * @param {array} transactions - Transaction list
   * @returns {string} Period description
   */
  _getMostActivePeriod(transactions) {
    if (!transactions || transactions.length === 0) return 'No activity';

    // Simple heuristic: check recent vs older
    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

    const recentCount = transactions.filter((tx) => {
      const txTime = new Date(tx.timestamp).getTime();
      return txTime > oneWeekAgo;
    }).length;

    if (recentCount > transactions.length * 0.5) {
      return 'Last 7 days';
    } else if (recentCount > 0) {
      return 'Last month';
    } else {
      return 'Older than 30 days';
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
   * @returns {object} Formatted data
   */
  formatForUI(analysis) {
    return {
      address: analysis.address,
      win_rate: analysis.win_rate || 'N/A',
      total_trades: analysis.total_trades || 0,
      profitable_trades: analysis.profitable_trades || 0,
      biggest_win: analysis.biggest_win || '-',
      biggest_loss: analysis.biggest_loss || '-',
      most_profitable_pair: analysis.most_profitable_pair || '-',
      recommendation: analysis.recommendation || 'No recommendations available',
      risk_patterns: analysis.risk_patterns || [],
      average_hold_time: analysis.average_hold_time || '-',
    };
  }
}

// Export for use in background.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WalletAnalyzer;
}

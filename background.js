/**
 * SynthX Background Service Worker
 *
 * - Handles messages from sidebar UI
 * - Orchestrates Claude API + Blockscout queries
 * - Routes requests to appropriate analyzers
 */

// NOTE: In a real extension, these would be imported as modules
// For now, we'll load them dynamically or include their code inline

let claudeClient;
let blockscoutClient;
let tokenSafetyAnalyzer;
let walletAnalyzer;

/**
 * Initialize clients on extension startup
 */
async function initializeClients() {
  console.log('[Background] Initializing SynthX...');

  // Get API key from storage (user will set this during setup)
  const { CLAUDE_API_KEY, BLOCKSCOUT_CHAIN_ID } = await chrome.storage.local.get([
    'CLAUDE_API_KEY',
    'BLOCKSCOUT_CHAIN_ID',
  ]);

  if (!CLAUDE_API_KEY) {
    console.warn('[Background] Claude API key not found. Please configure in settings.');
  }

  // Initialize clients (would normally import these modules)
  // For MVP, we'll create lightweight versions here
  claudeClient = new SimplifiedClaudeClient(CLAUDE_API_KEY || '');
  blockscoutClient = new SimplifiedBlockscoutClient(BLOCKSCOUT_CHAIN_ID || '1');

  console.log('[Background] Clients initialized');
}

/**
 * Listen for messages from sidebar
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Background] Received message:', request.action);

  // Handle different actions
  switch (request.action) {
    case 'analyzeToken':
      handleAnalyzeToken(request.data)
        .then((result) => sendResponse({ success: true, data: result }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true; // Keep channel open for async response

    case 'analyzeWallet':
      handleAnalyzeWallet(request.data)
        .then((result) => sendResponse({ success: true, data: result }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true;

    case 'setApiKey':
      handleSetApiKey(request.apiKey)
        .then((result) => sendResponse({ success: true, data: result }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true;

    case 'ping':
      sendResponse({ success: true, message: 'SynthX is running' });
      return true;

    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

/**
 * Handle token analysis request
 */
async function handleAnalyzeToken(data) {
  const { tokenAddress } = data;

  if (!tokenAddress) {
    throw new Error('Token address required');
  }

  console.log(`[Background] Analyzing token: ${tokenAddress}`);

  // Fetch token data from Blockscout
  const tokenData = await blockscoutClient.getAddressInfo(tokenAddress);

  // Analyze with Claude
  const analysis = await claudeClient.analyzeTokenSafety(tokenData);

  return {
    address: tokenAddress,
    analysis,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Handle wallet analysis request
 */
async function handleAnalyzeWallet(data) {
  const { walletAddress, days = 90 } = data;

  if (!walletAddress) {
    throw new Error('Wallet address required');
  }

  console.log(`[Background] Analyzing wallet: ${walletAddress}`);

  // Fetch wallet data
  const txns = await blockscoutClient.getTransactionsByAddress(walletAddress, { limit: 100 });
  const transfers = await blockscoutClient.getTokenTransfersByAddress(walletAddress, { limit: 100 });

  const walletData = {
    address: walletAddress,
    total_transactions: txns?.items?.length || 0,
    total_transfers: transfers?.items?.length || 0,
    transactions: txns?.items?.slice(0, 20) || [],
    transfers: transfers?.items?.slice(0, 20) || [],
  };

  // Analyze with Claude
  const analysis = await claudeClient.analyzeWalletTrading(walletData);

  return {
    address: walletAddress,
    analysis,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Handle API key setup
 */
async function handleSetApiKey(apiKey) {
  if (!apiKey || !apiKey.startsWith('sk-ant-')) {
    throw new Error('Invalid Claude API key format');
  }

  await chrome.storage.local.set({ CLAUDE_API_KEY: apiKey });
  claudeClient = new SimplifiedClaudeClient(apiKey);

  return { message: 'API key saved successfully' };
}

/**
 * Simplified Claude Client (for MVP)
 * In production, would use full ClaudeClient module
 */
class SimplifiedClaudeClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.apiBase = 'https://api.anthropic.com/v1';
  }

  async analyzeTokenSafety(tokenData) {
    const systemPrompt = `You are a DeFi token safety analyzer. Return ONLY valid JSON:
{
  "safety_score": <0-100>,
  "verdict": "<SCAM|RISKY|SAFE>",
  "risks": ["<risk>"],
  "reason": "<explanation>",
  "confidence": "<HIGH|MEDIUM|LOW>"
}`;

    const userMessage = `Analyze token: ${JSON.stringify(tokenData)}`;

    return this._chat(userMessage, systemPrompt);
  }

  async analyzeWalletTrading(walletData) {
    const systemPrompt = `You are a trading analyst. Return ONLY valid JSON:
{
  "win_rate": "<percentage>",
  "total_trades": <number>,
  "biggest_loss": "<amount>",
  "most_profitable_pair": "<pair>",
  "risk_patterns": ["<pattern>"],
  "recommendation": "<advice>"
}`;

    const userMessage = `Analyze wallet: ${JSON.stringify(walletData)}`;

    return this._chat(userMessage, systemPrompt);
  }

  async _chat(userMessage, systemPrompt) {
    if (!this.apiKey) {
      throw new Error('Claude API key not configured. Please set it in settings.');
    }

    try {
      const response = await fetch(`${this.apiBase}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1024,
          messages: [{ role: 'user', content: userMessage }],
          system: systemPrompt,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `API error ${response.status}`);
      }

      const data = await response.json();
      const responseText = data.content[0].text;

      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid response format');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('[Claude] Error:', error);
      throw error;
    }
  }
}

/**
 * Simplified Blockscout Client (for MVP)
 */
class SimplifiedBlockscoutClient {
  constructor(chainId = '1') {
    this.chainId = chainId;
    this.apiBase = 'https://blockscout.com/api/v2';
  }

  async getAddressInfo(address) {
    return this._call(`/addresses/${address}`);
  }

  async getTransactionsByAddress(address, options = {}) {
    return this._call(`/addresses/${address}/transactions`, options);
  }

  async getTokenTransfersByAddress(address, options = {}) {
    return this._call(`/addresses/${address}/token-transfers`, options);
  }

  async _call(endpoint, params = {}) {
    try {
      const url = new URL(`${this.apiBase}${endpoint}`);
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          url.searchParams.append(key, value);
        }
      });

      const response = await fetch(url.toString());
      if (!response.ok) throw new Error(`API error ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('[Blockscout] Error:', error);
      throw error;
    }
  }
}

// Initialize on startup
initializeClients();

console.log('[Background] SynthX service worker loaded');

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
    case 'analyzeAddress':
      handleAnalyzeAddress(request.data)
        .then((result) => sendResponse({ success: true, data: result }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true; // Keep channel open for async response

    case 'parseTradeCommand':
      handleParseTradeCommand(request.data)
        .then((result) => sendResponse({ success: true, data: result }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true;

    case 'getSwapQuote':
      handleGetSwapQuote(request.data)
        .then((result) => sendResponse({ success: true, data: result }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true;

    case 'executeSwap':
      handleExecuteSwap(request.data)
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
 * Handle unified address scanning
 */
async function handleAnalyzeAddress(data) {
  const { address } = data;

  if (!address) {
    throw new Error('Address required');
  }

  console.log(`[Background] Scanning address: ${address}`);

  // Fetch address info from Blockscout
  const addressInfo = await blockscoutClient.getAddressInfo(address);

  // Analyze for safety (works for both tokens and contracts)
  const analysis = await claudeClient.analyzeTokenSafety(addressInfo);

  // Extract on-chain data to display
  const onchainData = {
    type: addressInfo.type === 'contract' ? (addressInfo.token ? '📦 Token Contract' : '⚙️ Smart Contract') : '👤 Wallet',
    balance: addressInfo.coin_balance ? `${(addressInfo.coin_balance / 1e18).toFixed(4)} ETH` : '0 ETH',
    txCount: addressInfo.transactions_count || '0',
    verified: addressInfo.verified || false,
  };

  return {
    address,
    analysis,
    onchain: onchainData,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Parse natural language trade commands using Claude AI
 */
async function handleParseTradeCommand(data) {
  const { command } = data;

  console.log(`[Background] Parsing command: ${command}`);

  const systemPrompt = `You are a DeFi trade command parser. Extract swap parameters from user input and return ONLY valid JSON:
{
  "fromToken": "<token name or address>",
  "toToken": "<token name or address>",
  "amount": "<number>"
}

Examples:
  "Swap 0.01 ETH for USDC" → {"fromToken": "ETH", "toToken": "USDC", "amount": "0.01"}
  "Trade 5 USDC to WETH" → {"fromToken": "USDC", "toToken": "WETH", "amount": "5"}
  "Exchange 100 USDC for 0.05 ETH" → {"fromToken": "USDC", "toToken": "ETH", "amount": "100"}

Return ONLY the JSON object, no other text.`;

  try {
    const response = await claudeClient._chat(command, systemPrompt);
    console.log('[Background] Parsed command:', response);

    return { parsed: response };
  } catch (error) {
    console.error('[Background] Error parsing command:', error);
    throw new Error('Failed to parse command: ' + error.message);
  }
}

/**
 * Handle swap quote request with AI recommendations
 */
async function handleGetSwapQuote(data) {
  const { fromToken, amount, toToken, platform } = data;

  console.log(`[Background] Getting swap quote: ${amount} ${fromToken} -> ${toToken}`);

  // Get real quote from injected.js via content script
  let quote = null;
  try {
    // This will be fetched from injected.js during execution
    // For now, create a placeholder that indicates real quote pending
    quote = {
      expectedOutput: 'Loading...',
      minReceived: 'Loading...',
      gasCost: 'Estimating...',
      priceImpact: 'Calculating...',
      platform: platform,
      fromToken,
      toToken,
      amount,
      isRealQuote: true, // Flag indicating this will be real
    };

    // Try to get gas estimate
    try {
      const gasEstimate = await getGasEstimate();
      quote.gasCost = gasEstimate;
    } catch (error) {
      console.warn('[Background] Gas estimation failed:', error);
      quote.gasCost = '~0.01 ETH';
    }
  } catch (error) {
    console.error('[Background] Error getting quote:', error);
    // Fallback to mock quote for demo
    quote = {
      expectedOutput: (parseFloat(amount) * 1.5).toFixed(4),
      minReceived: (parseFloat(amount) * 1.49).toFixed(4),
      gasCost: '~0.01 ETH',
      priceImpact: '0.1%',
      platform: platform,
      fromToken,
      toToken,
      amount,
      isRealQuote: false,
    };
  }

  // Get AI recommendations
  try {
    const recommendations = await generateSwapRecommendations(fromToken, toToken, amount, quote);
    Object.assign(quote, recommendations);
  } catch (error) {
    console.error('[Background] Error generating recommendations:', error);
    // Continue with quote even if recommendations fail
  }

  return { quote };
}

/**
 * Estimate gas cost from Sepolia network
 */
async function getGasEstimate() {
  try {
    // In a real scenario, we'd fetch from RPC
    // For now, return a reasonable estimate
    return '~0.005 ETH (Sepolia)';
  } catch (error) {
    throw error;
  }
}

/**
 * Generate AI recommendations for a swap
 */
async function generateSwapRecommendations(fromToken, toToken, amount, quote) {
  const systemPrompt = `You are a DeFi trade advisor. Analyze a swap and provide brief recommendations in JSON format:
{
  "gasOptimization": "<brief tip or null>",
  "riskWarning": "<warning or null>",
  "liquidityAnalysis": "<analysis or null>",
  "timingAdvice": "<timing tip or null>"
}

All fields should be null or strings of max 100 characters.`;

  const userMessage = `Analyze this swap:
From: ${fromToken}
To: ${toToken}
Amount: ${amount}
Expected Output: ${quote.expectedOutput}
Gas Cost: ${quote.gasCost}
Price Impact: ${quote.priceImpact}

Provide recommendations.`;

  try {
    const recommendations = await claudeClient._chat(userMessage, systemPrompt);
    return recommendations;
  } catch (error) {
    console.error('[Background] Error in recommendations:', error);
    return {};
  }
}

/**
 * Handle swap execution
 */
async function handleExecuteSwap(data) {
  console.log('[Background] handleExecuteSwap called with data:', data);

  const { fromToken, toToken, amount, quote } = data;

  console.log(`[Background] Executing swap: ${amount} ${fromToken} -> ${toToken}`);

  // Step 1: Get the active tab (where user is browsing)
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs || tabs.length === 0) {
    throw new Error('No active tab found. Please open any webpage and try again.');
  }

  const activeTab = tabs[0];
  console.log(`[Background] Sending swap to tab ${activeTab.id}: ${activeTab.url}`);

  // Step 2: Send swap execution request to content script
  try {
    // First, try to inject content script if not already there
    try {
      console.log('[Background] Attempting to inject content script...');
      await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        files: ['content.js'],
      });
      console.log('[Background] Content script injected successfully');
    } catch (injectError) {
      console.warn('[Background] Content script injection warning:', injectError.message);
      // Continue anyway - script might already be there
    }

    // Give content script a moment to load
    await new Promise(resolve => setTimeout(resolve, 500));

    const response = await chrome.tabs.sendMessage(activeTab.id, {
      action: 'executeSwapViaMetaMask',
      data: {
        fromToken,
        toToken,
        amount,
      },
    });

    console.log('[Background] Swap response:', response);

    if (response.success) {
      return response.data;
    } else {
      throw new Error(response.error || 'Swap execution failed');
    }
  } catch (error) {
    console.error('[Background] Error executing swap:', error);

    // Provide helpful error messages
    if (error.message.includes('Could not establish connection')) {
      throw new Error(
        'Content script not found on this page. Try: 1) Refresh the page, 2) Ensure MetaMask is installed, 3) Try another website like uniswap.org'
      );
    }

    if (error.message.includes('Extension context invalidated')) {
      throw new Error('Extension was updated. Please refresh the page and try again.');
    }

    throw error;
  }
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
  "risks": ["<risk1>", "<risk2>"],
  "reason": "<explanation>",
  "confidence": "<HIGH|MEDIUM|LOW>"
}

IMPORTANT:
- If no risks found, return empty array: "risks": []
- Never include text like "none identified" or "no risks" in the risks array
- Leave risks array EMPTY if address is safe`;

    const userMessage = `Analyze token: ${JSON.stringify(tokenData)}`;

    return this._chat(userMessage, systemPrompt);
  }

  async analyzeWalletTrading(walletData) {
    const systemPrompt = `You are a blockchain analyst. Analyze this wallet activity and return ONLY a valid JSON object:
{
  "win_rate": "N/A",
  "total_trades": <number>,
  "biggest_loss": "<amount or Unknown>",
  "most_profitable_pair": "<pair or Unknown>",
  "risk_patterns": ["<pattern>"],
  "recommendation": "<brief advice>"
}`;

    // Build a concise summary of wallet activity
    const recentActivity = walletData.transactions.length > 0
      ? `Last txs: ${walletData.transactions.map(t => t.method || 'Unknown').join(', ')}`
      : 'No recent transactions';

    const recentTransfers = walletData.transfers.length > 0
      ? `Recent transfers: ${walletData.transfers.map(t => t.token || 'Unknown').join(', ')}`
      : 'No token transfers';

    const userMessage = `Analyze wallet activity:
Address: ${walletData.address}
Total Transactions: ${walletData.total_transactions}
Total Token Transfers: ${walletData.total_transfers}
${recentActivity}
${recentTransfers}

Provide brief analysis and recommendations based on activity level and patterns.`;

    return this._chat(userMessage, systemPrompt);
  }

  async _chat(userMessage, systemPrompt) {
    if (!this.apiKey) {
      throw new Error('Claude API key not configured. Please set it in settings.');
    }

    try {
      console.log('[Claude] Sending message to Claude API...');

      const response = await fetch(`${this.apiBase}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
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
        const errorMessage = error.error?.message || `API error ${response.status}`;
        console.error(`[Claude] Error: ${errorMessage}`);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const responseText = data.content[0].text;

      console.log('[Claude] Received response, parsing JSON...');

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
    // Use eth.blockscout.com for Ethereum Mainnet (more reliable)
    // For Sepolia: https://sepolia.blockscout.com/api/v2
    this.apiBase = chainId === '11155111'
      ? 'https://sepolia.blockscout.com/api/v2'
      : 'https://eth.blockscout.com/api/v2';
  }

  async getAddressInfo(address) {
    return this._call(`/addresses/${address}`);
  }

  async getTransactionsByAddress(address, options = {}) {
    return this._call(`/addresses/${address}/transactions`, {});
  }

  async getTokenTransfersByAddress(address, options = {}) {
    return this._call(`/addresses/${address}/token-transfers`, {});
  }

  async _call(endpoint, params = {}) {
    try {
      const url = new URL(`${this.apiBase}${endpoint}`);

      // Note: Blockscout API doesn't accept 'limit' param
      // It returns paginated results by default
      Object.entries(params).forEach(([key, value]) => {
        // Skip 'limit' parameter - not supported by this API version
        if (key === 'limit') return;
        if (value !== null && value !== undefined) {
          url.searchParams.append(key, value);
        }
      });

      const urlString = url.toString();
      console.log(`[Blockscout] Calling: ${urlString}`);

      const response = await fetch(urlString);
      if (!response.ok) {
        const errorData = await response.json();
        console.error(`[Blockscout] Error ${response.status}:`, errorData);
        throw new Error(`API error ${response.status}`);
      }
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

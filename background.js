/**
 * SynthX Background Service Worker
 *
 * - Handles messages from sidebar UI
 * - Orchestrates Blockscout + Claude API
 * - Focuses on address scanning and analysis
 */

let claudeClient;
let blockscoutClient;

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

  // Initialize clients
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

  async getAdvisorResponse(userMessage, systemPrompt) {
    const response = await this._chat(userMessage, systemPrompt);
    // For advisor responses, we expect plain text, not JSON
    // If Claude returns text, extract it; if it returns JSON, convert to text
    if (typeof response === 'string') {
      return response;
    }
    return JSON.stringify(response);
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

      console.log('[Claude] Received response');

      // Try to parse as JSON if it looks like JSON, otherwise return as plain text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        console.log('[Claude] Parsing as JSON...');
        return JSON.parse(jsonMatch[0]);
      }

      // Return as plain text for advisor responses
      console.log('[Claude] Returning as plain text...');
      return responseText;
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

  async _call(endpoint, params = {}) {
    try {
      const url = new URL(`${this.apiBase}${endpoint}`);

      Object.entries(params).forEach(([key, value]) => {
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

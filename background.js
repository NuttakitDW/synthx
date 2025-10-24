/**
 * SynthX Background Service Worker
 *
 * - Orchestrates Claude API for on-chain explanation
 * - Fetches data from Blockscout API
 * - Generates human-readable summaries of transactions, addresses, and tokens
 */

let claudeClient;

/**
 * Initialize on extension startup
 */
async function initializeClients() {
  console.log('[Background] Initializing SynthX...');

  const { CLAUDE_API_KEY } = await chrome.storage.local.get(['CLAUDE_API_KEY']);

  if (!CLAUDE_API_KEY) {
    console.warn('[Background] Claude API key not found. Please configure in settings.');
  }

  claudeClient = new ClaudeClient(CLAUDE_API_KEY || '');

  console.log('[Background] SynthX initialized');
}

/**
 * Listen for messages from content script
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Background] Received message:', request.action);

  switch (request.action) {
    case 'analyzePage':
      handleAnalyzePage(request.pageData)
        .then((result) => sendResponse(result))
        .catch((error) => sendResponse({ error: error.message }));
      return true;

    case 'askFollowUp':
      handleFollowUp(request.pageData, request.question)
        .then((result) => sendResponse(result))
        .catch((error) => sendResponse({ error: error.message }));
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
      sendResponse({ error: 'Unknown action' });
  }
});

/**
 * Handle API key setup
 */
async function handleSetApiKey(apiKey) {
  if (!apiKey || !apiKey.startsWith('sk-ant-')) {
    throw new Error('Invalid Claude API key format');
  }

  await chrome.storage.local.set({ CLAUDE_API_KEY: apiKey });
  claudeClient = new ClaudeClient(apiKey);

  return { message: 'API key saved successfully' };
}

/**
 * Analyze page based on type (tx, address, token)
 */
async function handleAnalyzePage(pageData) {
  const { type, value, url } = pageData;
  console.log(`[Background] Analyzing ${type}: ${value}`);

  try {
    let pageInfo;

    if (type === 'transaction') {
      pageInfo = await fetchTransactionData(value, url);
    } else if (type === 'address') {
      pageInfo = await fetchAddressData(value, url);
    } else if (type === 'token') {
      pageInfo = await fetchTokenData(value, url);
    } else {
      throw new Error('Unknown page type');
    }

    // Send to Claude for explanation
    const analysis = await claudeClient.explainOnChainData(type, pageInfo);

    return { analysis };
  } catch (error) {
    console.error('[Background] Error:', error);
    throw error;
  }
}

/**
 * Handle follow-up questions
 */
async function handleFollowUp(pageData, question) {
  const { type, value, url } = pageData;
  console.log(`[Background] Follow-up question for ${type}: ${question}`);

  try {
    let pageInfo;

    if (type === 'transaction') {
      pageInfo = await fetchTransactionData(value, url);
    } else if (type === 'address') {
      pageInfo = await fetchAddressData(value, url);
    } else if (type === 'token') {
      pageInfo = await fetchTokenData(value, url);
    } else {
      throw new Error('Unknown page type');
    }

    // Ask Claude with context
    const analysis = await claudeClient.answerQuestion(type, pageInfo, question);

    return { analysis };
  } catch (error) {
    console.error('[Background] Error:', error);
    throw error;
  }
}

/**
 * Fetch transaction data from Blockscout
 */
async function fetchTransactionData(txHash, blockscoutUrl) {
  // Extract chain from URL (eth.blockscout.com, sepolia.blockscout.com, etc)
  const chainMatch = blockscoutUrl.match(/https:\/\/([^.]+)\.blockscout\.com/);
  const chain = chainMatch ? chainMatch[1] : 'eth';

  const apiBase = chain === 'sepolia'
    ? 'https://sepolia.blockscout.com/api/v2'
    : `https://${chain}.blockscout.com/api/v2`;

  try {
    const response = await fetch(`${apiBase}/transactions/${txHash}`);
    if (!response.ok) throw new Error(`Blockscout API error: ${response.status}`);

    const txData = await response.json();

    console.log('[Background] Fetched transaction data:', txData);

    return {
      hash: txHash,
      from: txData.from?.hash,
      to: txData.to?.hash,
      value: txData.value,
      gasUsed: txData.gas_used,
      gasPrice: txData.gas_price,
      status: txData.status,
      method: txData.method,
      timestamp: txData.timestamp,
      decoded_input: txData.decoded_input,
      token_transfers: txData.token_transfers,
      confirmations: txData.confirmation_duration,
    };
  } catch (error) {
    console.error('[Background] Error fetching transaction:', error);
    throw new Error(`Failed to fetch transaction: ${error.message}`);
  }
}

/**
 * Fetch address data from Blockscout
 */
async function fetchAddressData(address, blockscoutUrl) {
  const chainMatch = blockscoutUrl.match(/https:\/\/([^.]+)\.blockscout\.com/);
  const chain = chainMatch ? chainMatch[1] : 'eth';

  const apiBase = chain === 'sepolia'
    ? 'https://sepolia.blockscout.com/api/v2'
    : `https://${chain}.blockscout.com/api/v2`;

  try {
    // Fetch basic address info
    const response = await fetch(`${apiBase}/addresses/${address}`);
    if (!response.ok) throw new Error(`Blockscout API error: ${response.status}`);

    const addressData = await response.json();

    console.log('[Background] Fetched address data:', addressData);

    // Also fetch recent token transfers to detect patterns
    let tokenTransfers = [];
    try {
      const transfersResponse = await fetch(`${apiBase}/addresses/${address}/token-transfers?limit=50`);
      if (transfersResponse.ok) {
        const transfersData = await transfersResponse.json();
        if (transfersData.items) {
          // Only keep last 20 transfers for analysis
          tokenTransfers = transfersData.items.slice(0, 20).map(t => ({
            from: t.from?.hash,
            to: t.to?.hash,
            value: t.total?.value,
            token: t.token?.name || t.token?.symbol,
            timestamp: t.timestamp,
          }));
        }
      }
    } catch (e) {
      console.log('[Background] Could not fetch token transfers:', e);
    }

    return {
      address,
      type: addressData.is_contract ? 'contract' : 'wallet',
      balance: addressData.coin_balance,
      tx_count: addressData.transactions_count,
      verified: addressData.verified_info?.is_verified || false,
      token_info: addressData.token,
      ens_name: addressData.ens_domain_name,
      implementation: addressData.implementation_address,
      recent_transfers: tokenTransfers,
    };
  } catch (error) {
    console.error('[Background] Error fetching address:', error);
    throw new Error(`Failed to fetch address: ${error.message}`);
  }
}

/**
 * Fetch token data from Blockscout
 */
async function fetchTokenData(tokenAddress, blockscoutUrl) {
  const chainMatch = blockscoutUrl.match(/https:\/\/([^.]+)\.blockscout\.com/);
  const chain = chainMatch ? chainMatch[1] : 'eth';

  const apiBase = chain === 'sepolia'
    ? 'https://sepolia.blockscout.com/api/v2'
    : `https://${chain}.blockscout.com/api/v2`;

  try {
    const response = await fetch(`${apiBase}/tokens/${tokenAddress}`);
    if (!response.ok) throw new Error(`Blockscout API error: ${response.status}`);

    const tokenData = await response.json();

    console.log('[Background] Fetched token data:', tokenData);

    return {
      address: tokenAddress,
      name: tokenData.name,
      symbol: tokenData.symbol,
      decimals: tokenData.decimals,
      total_supply: tokenData.total_supply,
      holders: tokenData.holders,
      type: tokenData.type,
      verified: tokenData.verified_info?.is_verified || false,
      exchange_rate: tokenData.exchange_rate,
    };
  } catch (error) {
    console.error('[Background] Error fetching token:', error);
    throw new Error(`Failed to fetch token: ${error.message}`);
  }
}

/**
 * Claude Client for on-chain explanations
 */
class ClaudeClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.apiBase = 'https://api.anthropic.com/v1';
  }

  async explainOnChainData(type, pageInfo) {
    let systemPrompt = '';
    let userMessage = '';

    if (type === 'transaction') {
      systemPrompt = `You are an expert blockchain analyst. Explain this transaction to a regular user.
Respond with ONLY valid JSON (no markdown, no code blocks):
{
  "summary": "<1-2 sentence explanation of what happened>",
  "key_actions": ["<action1>", "<action2>"],
  "risks": ["<risk1>"] or [] if no risks,
  "details": "<additional context>"
}

IMPORTANT GUIDELINES:
- Only flag actual problems (unusual patterns, unverified + suspicious, etc)
- Do NOT flag verified contracts as risks
- Do NOT flag standard operations as risks
- Do NOT list "temporary loss of functionality" for wrapped tokens
- Focus on: actual exploits, honeypots, unverified suspicious behavior
- Leave risks EMPTY [] if contract is verified or operation is normal`;

      userMessage = `Analyze this transaction:\n${JSON.stringify(pageInfo, null, 2)}`;
    } else if (type === 'address') {
      systemPrompt = `You are an expert blockchain analyst. Summarize this address for a regular user.
Respond with ONLY valid JSON (no markdown, no code blocks):
{
  "summary": "<1-2 sentence description of what this address is>",
  "key_actions": ["<pattern1>", "<pattern2>"],
  "risks": ["<risk1>"] or [] if no risks,
  "details": "<useful information>"
}

CRITICAL PATTERN DETECTION (look at recent_transfers array):
- COMPROMISED WALLET (HIGHEST PRIORITY):
  If you see the pattern where address receives tokens/funds, then immediately sends them out
  Look for: token_in from other address → token_out to different address (within minutes)
  Example: Receive 10 USDC at 10:00 → Send 10 USDC at 10:01 to different wallet
  Label as: "⚠️ POSSIBLE COMPROMISED WALLET - Immediate fund sweeping detected (private key leaked)"
  This is a CRITICAL red flag for hacked/compromised accounts

- BOT ACTIVITY: If you see rapid fire transactions (multiple in/out within seconds)
  Pattern: alternating buys/sells in quick succession
  Label as: "⚠️ Possible bot-controlled account - rapid trading detected"

- DRAIN WALLET: If all transfers are OUTBOUND and no incoming funds
  Pattern: only sends, never receives
  Label as: "⚠️ Possible drain/theft activity"

IMPORTANT GUIDELINES:
- Do NOT flag verified contracts as risks
- Do NOT flag normal trading activity as risks
- DO flag fund sweeping patterns (immediate in→out) - this is a security issue
- Leave risks EMPTY [] for normal wallets with normal activity
- Focus on: actual exploitation/compromise patterns (especially fund sweeping)`;

      userMessage = `Analyze this address:\n${JSON.stringify(pageInfo, null, 2)}`;
    } else if (type === 'token') {
      systemPrompt = `You are an expert DeFi analyst. Summarize this token for a regular user.
Respond with ONLY valid JSON (no markdown, no code blocks):
{
  "summary": "<1-2 sentence description of the token>",
  "key_actions": ["<feature1>", "<feature2>"],
  "risks": ["<risk1>"] or [] if no risks,
  "details": "<useful information>"
}

IMPORTANT GUIDELINES:
- Do NOT flag verified tokens as risks
- Major tokens (USDC, USDT, WETH, DAI, etc) are safe
- Only flag actual issues: honeypots, unverified + suspicious, exploit patterns
- Leave risks EMPTY [] for verified, well-known tokens
- Focus on: actual scams/honeypots, not just being a new token`;

      userMessage = `Analyze this token:\n${JSON.stringify(pageInfo, null, 2)}`;
    }

    try {
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
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const responseText = data.content[0].text;

      // Extract JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      throw new Error('Could not parse Claude response as JSON');
    } catch (error) {
      console.error('[Claude] Error:', error);
      throw error;
    }
  }

  async answerQuestion(type, pageInfo, question) {
    const systemPrompt = `You are an expert blockchain analyst answering questions about on-chain data.
Keep responses concise and clear for non-technical users.
Respond with ONLY valid JSON (no markdown, no code blocks):
{
  "summary": "<direct answer to the question>",
  "key_actions": ["<relevant action1>"] or [],
  "risks": ["<risk1>"] or [] if no risks,
  "details": "<additional context or explanation>"
}`;

    const userMessage = `Context: ${type}\nData: ${JSON.stringify(pageInfo)}\n\nQuestion: ${question}`;

    try {
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
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const responseText = data.content[0].text;

      // Extract JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      throw new Error('Could not parse Claude response as JSON');
    } catch (error) {
      console.error('[Claude] Error:', error);
      throw error;
    }
  }
}

// Initialize on startup
initializeClients();

console.log('[Background] SynthX service worker loaded');

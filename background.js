/**
 * SynthX Background Service Worker - Enhanced
 *
 * - Orchestrates Claude API for on-chain explanation
 * - Fetches comprehensive data from Blockscout API
 * - Generates human-readable summaries
 * - Properly handles verified status and detailed analysis
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
      from_verified: txData.from?.is_contract && txData.from?.verified_info?.is_verified,
      to: txData.to?.hash,
      to_verified: txData.to?.is_contract && txData.to?.verified_info?.is_verified,
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
 * Fetch address data from Blockscout with comprehensive details
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
          tokenTransfers = transfersData.items.slice(0, 20).map(t => ({
            from: t.from?.hash,
            to: t.to?.hash,
            value: t.total?.value,
            token: t.token?.name || t.token?.symbol,
            is_verified: t.token?.is_verified_token,
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
      is_verified: addressData.verified_info?.is_verified || false,
      verification_name: addressData.verified_info?.name,
      balance: addressData.coin_balance,
      tx_count: addressData.transactions_count,
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
      is_verified: tokenData.is_verified_token || false,
      verification_name: tokenData.verified_info?.name,
      exchange_rate: tokenData.exchange_rate,
      description: tokenData.description,
      website: tokenData.website,
      social: tokenData.social_media || [],
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
Return ONLY valid JSON (no markdown):
{
  "summary": "<Clear explanation of what happened>",
  "key_actions": ["<action1>", "<action2>"],
  "risks": ["<risk1>"] or [],
  "details": "<Technical details>"
}

VERIFICATION STATUS:
- Check from_verified and to_verified fields - if true, contract is verified and safe
- Only flag unverified contracts if there are suspicious patterns
- Verified contracts are trustworthy

KEY INFO TO INCLUDE:
- What tokens were transferred (if any)
- Which protocols/contracts were used
- Verification status of contracts
- Gas efficiency
- Any unusual patterns`;

      userMessage = `Analyze transaction:\n${JSON.stringify(pageInfo, null, 2)}`;
    } else if (type === 'address') {
      systemPrompt = `You are an expert blockchain analyst. Analyze this blockchain address.
Return ONLY valid JSON (no markdown):
{
  "summary": "<What is this address>",
  "key_actions": ["<pattern1>", "<pattern2>"],
  "risks": ["<risk1>"] or [],
  "details": "<Full analysis>"
}

VERIFICATION:
- is_verified field shows if contract is verified - verified=safe
- If verified, show verification name (project name)
- Only flag unverified contracts if suspicious activity exists

PATTERN ANALYSIS (from recent_transfers):
- Fund sweeping: Receive → immediately send to different address = COMPROMISED
- All outbound only = Possible drain
- Rapid alternating in/out = Bot activity

INCLUDE:
- Address type (wallet/contract)
- Balance and activity level
- Verification status with name
- Recent transfer patterns
- Any security concerns`;

      userMessage = `Analyze address:\n${JSON.stringify(pageInfo, null, 2)}`;
    } else if (type === 'token') {
      systemPrompt = `You are an expert DeFi analyst. Analyze this token.
Return ONLY valid JSON (no markdown):
{
  "summary": "<What is this token>",
  "key_actions": ["<feature1>", "<feature2>"],
  "risks": ["<risk1>"] or [],
  "details": "<Full analysis>"
}

VERIFICATION:
- is_verified field: true = verified safe token
- Verified tokens include USDC, WETH, DAI, USDT, etc
- If is_verified=true, show verification_name (project)
- Do NOT flag verified tokens as risky

TOKEN DETAILS TO INCLUDE:
- Token name, symbol, type (ERC-20, etc)
- Total supply and holder count
- Verification status with official name
- Website and social media if available
- Exchange rate if available
- Purpose/description

ONLY FLAG RISKS FOR:
- Unverified tokens with suspicious patterns
- Honeypots or exploits
- NOT just because unverified`;

      userMessage = `Analyze token:\n${JSON.stringify(pageInfo, null, 2)}`;
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
Keep responses concise and clear. Return ONLY valid JSON (no markdown):
{
  "summary": "<Direct answer to question>",
  "key_actions": ["<relevant action1>"] or [],
  "risks": ["<risk1>"] or [],
  "details": "<Additional context>"
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

/**
 * SynthX Sidebar UI Logic
 *
 * Handles user interactions and communicates with background.js
 */

// DOM Elements
const addressInput = document.getElementById('addressInput');
const analyzeAddressBtn = document.getElementById('analyzeAddressBtn');
const tokenResult = document.getElementById('tokenResult');
const tokenLoading = document.getElementById('tokenLoading');
const tokenError = document.getElementById('tokenError');

const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const apiKeyInput = document.getElementById('apiKeyInput');
const chainSelect = document.getElementById('chainSelect');

const statusBar = document.getElementById('statusBar');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');

// Trade/Swap elements
const commandInput = document.getElementById('commandInput');
const parseCommandBtn = document.getElementById('parseCommandBtn');
const formSection = document.getElementById('formSection');
const fromTokenInput = document.getElementById('fromTokenInput');
const amountInput = document.getElementById('amountInput');
const toTokenInput = document.getElementById('toTokenInput');
const platformSelect = document.getElementById('platformSelect');
const getQuoteBtn = document.getElementById('getQuoteBtn');
const executeSwapBtn = document.getElementById('executeSwapBtn');
const swapPreview = document.getElementById('swapPreview');
const swapLoading = document.getElementById('swapLoading');
const swapError = document.getElementById('swapError');
const swapStatus = document.getElementById('swapStatus');
const aiRecommendations = document.getElementById('aiRecommendations');

// Store swap quote data and history
let currentQuote = null;
let tradeHistory = [];

/**
 * Initialize UI on load
 */
document.addEventListener('DOMContentLoaded', () => {
  console.log('[UI] SynthX sidebar loaded');

  // Load saved settings
  loadSettings();

  // Check extension status
  checkExtensionStatus();

  // Setup tab switching
  setupTabs();

  // Scanner events
  analyzeAddressBtn.addEventListener('click', handleAnalyzeAddress);

  // Trade events
  parseCommandBtn.addEventListener('click', handleParseCommand);
  getQuoteBtn.addEventListener('click', handleGetQuote);
  executeSwapBtn.addEventListener('click', handleExecuteSwap);

  // Load trade history
  loadTradeHistory();

  settingsBtn.addEventListener('click', openSettings);
  closeSettingsBtn.addEventListener('click', closeSettings);
  saveSettingsBtn.addEventListener('click', saveSettings);

  // Allow Enter key to submit
  addressInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAnalyzeAddress();
  });

  amountInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleGetQuote();
  });
});

/**
 * Handle unified address scanning (token or wallet)
 */
async function handleAnalyzeAddress() {
  const address = addressInput.value.trim();

  if (!address) {
    showTokenError('Please enter an address');
    return;
  }

  // Reset UI
  hideTokenResult();
  hideTokenError();

  // Show loading
  tokenLoading.style.display = 'block';
  analyzeAddressBtn.disabled = true;

  try {
    console.log('[UI] Scanning address:', address);

    // Send message to background.js
    const response = await chrome.runtime.sendMessage({
      action: 'analyzeAddress',
      data: { address: address },
    });

    if (response.success) {
      displayTokenResult(response.data.analysis);
    } else {
      showTokenError(response.error || 'Analysis failed');
    }
  } catch (error) {
    console.error('[UI] Error:', error);
    showTokenError(error.message || 'Unable to scan address. Check if extension is properly configured.');
  } finally {
    tokenLoading.style.display = 'none';
    analyzeAddressBtn.disabled = false;
  }
}

/**
 * Display token analysis result
 */
function displayTokenResult(analysis) {
  const { safety_score, verdict, risks, reason, confidence } = analysis;

  // Set verdict emoji and color
  let emoji = '❓';
  if (verdict === 'SAFE') emoji = '🟢';
  else if (verdict === 'RISKY') emoji = '🟡';
  else if (verdict === 'SCAM') emoji = '🔴';

  document.getElementById('verdictEmoji').textContent = emoji;
  document.getElementById('verdictText').textContent = verdict;
  document.getElementById('safetyScore').textContent = `${safety_score}/100`;
  document.getElementById('tokenReason').textContent = reason;

  // Display risks
  const risksList = document.getElementById('risksList');
  risksList.innerHTML = '';
  if (risks && risks.length > 0) {
    risks.forEach((risk) => {
      const li = document.createElement('li');
      li.textContent = risk;
      risksList.appendChild(li);
    });
  } else {
    // Show clear message when no risks detected
    const li = document.createElement('li');
    li.style.color = '#10b981';
    li.style.listStyleType = 'none';
    li.textContent = '✅ No red flags detected';
    risksList.appendChild(li);
  }

  document.getElementById('confidence').textContent = `Confidence: ${confidence}`;

  // Show result
  tokenResult.style.display = 'block';
}

/**
 * Show token error
 */
function showTokenError(message) {
  tokenError.textContent = message;
  tokenError.style.display = 'block';
}

function hideTokenError() {
  tokenError.style.display = 'none';
}

function hideTokenResult() {
  tokenResult.style.display = 'none';
}


/**
 * Check extension status
 */
async function checkExtensionStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'ping' });
    if (response.success) {
      statusDot.classList.add('connected');
      statusText.textContent = 'SynthX Ready';
      console.log('[UI] Extension is running');
    }
  } catch (error) {
    statusDot.classList.remove('connected');
    statusText.textContent = 'Extension Error';
    console.error('[UI] Extension check failed:', error);
  }
}

/**
 * Settings Modal
 */
function openSettings() {
  settingsModal.style.display = 'flex';
}

function closeSettings() {
  settingsModal.style.display = 'none';
}

async function loadSettings() {
  try {
    const data = await chrome.storage.local.get(['CLAUDE_API_KEY', 'BLOCKSCOUT_CHAIN_ID']);
    if (data.CLAUDE_API_KEY) {
      // Show masked API key
      apiKeyInput.value = data.CLAUDE_API_KEY.substring(0, 10) + '...';
      apiKeyInput.setAttribute('data-key', data.CLAUDE_API_KEY);
    }
    if (data.BLOCKSCOUT_CHAIN_ID) {
      chainSelect.value = data.BLOCKSCOUT_CHAIN_ID;
    }
  } catch (error) {
    console.error('[UI] Failed to load settings:', error);
  }
}

async function saveSettings() {
  let apiKey = apiKeyInput.value;

  // If user didn't change the key, use the saved one
  if (apiKey.endsWith('...')) {
    apiKey = apiKeyInput.getAttribute('data-key') || '';
  }

  if (!apiKey || !apiKey.startsWith('sk-ant-')) {
    alert('Please enter a valid Claude API key (starts with sk-ant-)');
    return;
  }

  try {
    // Save settings to Chrome storage
    await chrome.storage.local.set({
      CLAUDE_API_KEY: apiKey,
      BLOCKSCOUT_CHAIN_ID: chainSelect.value,
    });

    // Notify background.js of settings change
    chrome.runtime.sendMessage({
      action: 'setApiKey',
      apiKey: apiKey,
    });

    alert('Settings saved!');
    closeSettings();
  } catch (error) {
    console.error('[UI] Failed to save settings:', error);
    alert('Failed to save settings');
  }
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
  if (e.target === settingsModal) {
    closeSettings();
  }
});

/**
 * Tab Navigation
 */
function setupTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;

      // Remove active class from all buttons and contents
      tabBtns.forEach((b) => b.classList.remove('active'));
      tabContents.forEach((content) => content.classList.remove('active'));

      // Add active class to clicked button and corresponding content
      btn.classList.add('active');
      const activeContent = document.getElementById(tabId);
      if (activeContent) {
        activeContent.classList.add('active');
      }

      console.log('[UI] Switched to tab:', tabId);
    });
  });
}

/**
 * AI Command Parser - Parse natural language commands
 */
async function handleParseCommand() {
  const command = commandInput.value.trim();

  if (!command) {
    showSwapError('Please enter a command like "Swap 0.01 ETH for USDC"');
    return;
  }

  swapLoading.style.display = 'block';
  document.getElementById('loadingMessage').textContent = 'Parsing command with AI...';
  parseCommandBtn.disabled = true;

  try {
    console.log('[UI] Parsing command:', command);

    // Send to background for Claude parsing
    const response = await chrome.runtime.sendMessage({
      action: 'parseTradeCommand',
      data: { command },
    });

    if (response.success) {
      const parsed = response.data.parsed;

      // Fill in the form
      fromTokenInput.value = parsed.fromToken || '';
      amountInput.value = parsed.amount || '';
      toTokenInput.value = parsed.toToken || '';

      // Show the form section
      formSection.style.display = 'block';

      // Clear input
      commandInput.value = '';

      // Show success message
      showSwapSuccess({
        message: `✅ Parsed! "${parsed.fromToken}" → "${parsed.toToken}" (${parsed.amount})`
      });

      console.log('[UI] Parsed command:', parsed);
    } else {
      showSwapError(response.error || 'Failed to parse command');
    }
  } catch (error) {
    console.error('[UI] Error parsing command:', error);
    showSwapError('Error: ' + error.message);
  } finally {
    swapLoading.style.display = 'none';
    parseCommandBtn.disabled = false;
  }
}

/**
 * Display AI Recommendations
 */
function displayAIRecommendations(quote) {
  aiRecommendations.style.display = 'block';

  // Gas Optimization
  const gasOpt = document.getElementById('gasOptimization');
  if (quote.gasOptimization) {
    gasOpt.style.display = 'block';
    document.getElementById('gasOptText').textContent = quote.gasOptimization;
  }

  // Risk Warning
  const riskWarn = document.getElementById('riskWarning');
  if (quote.riskWarning) {
    riskWarn.style.display = 'block';
    document.getElementById('riskWarnText').textContent = quote.riskWarning;
  }

  // Liquidity Info
  const liquidity = document.getElementById('liquidityInfo');
  if (quote.liquidityAnalysis) {
    liquidity.style.display = 'block';
    document.getElementById('liquidityText').textContent = quote.liquidityAnalysis;
  }

  // Timing Advice
  const timing = document.getElementById('timingAdvice');
  if (quote.timingAdvice) {
    timing.style.display = 'block';
    document.getElementById('timingText').textContent = quote.timingAdvice;
  }
}

/**
 * Load trade history from storage
 */
async function loadTradeHistory() {
  try {
    const data = await chrome.storage.local.get('TRADE_HISTORY');
    if (data.TRADE_HISTORY) {
      tradeHistory = JSON.parse(data.TRADE_HISTORY);
      console.log('[UI] Loaded trade history:', tradeHistory.length, 'trades');
    }
  } catch (error) {
    console.error('[UI] Error loading trade history:', error);
  }
}

/**
 * Save trade to history
 */
async function saveTradeToHistory(trade) {
  try {
    tradeHistory.push({
      ...trade,
      timestamp: new Date().toISOString(),
    });

    // Keep only last 50 trades
    if (tradeHistory.length > 50) {
      tradeHistory = tradeHistory.slice(-50);
    }

    await chrome.storage.local.set({
      TRADE_HISTORY: JSON.stringify(tradeHistory),
    });

    console.log('[UI] Saved trade to history');
  } catch (error) {
    console.error('[UI] Error saving trade history:', error);
  }
}

/**
 * Trade/Swap Feature Handlers
 */
async function handleGetQuote() {
  const fromToken = fromTokenInput.value.trim();
  const amount = amountInput.value.trim();
  const toToken = toTokenInput.value.trim();

  if (!fromToken || !amount || !toToken) {
    showSwapError('Please fill in all fields (From Token, Amount, To Token)');
    return;
  }

  if (isNaN(amount) || parseFloat(amount) <= 0) {
    showSwapError('Please enter a valid amount');
    return;
  }

  hideSwapError();
  hideSwapPreview();

  swapLoading.style.display = 'block';
  document.getElementById('loadingMessage').textContent = 'Fetching quote...';
  getQuoteBtn.disabled = true;

  try {
    console.log('[UI] Getting swap quote:', {
      from: fromToken,
      amount: amount,
      to: toToken,
    });

    // Send message to background.js for quote
    const response = await chrome.runtime.sendMessage({
      action: 'getSwapQuote',
      data: {
        fromToken: fromToken,
        amount: amount,
        toToken: toToken,
        platform: platformSelect.value,
      },
    });

    if (response.success) {
      currentQuote = response.data.quote;
      displaySwapPreview(response.data.quote);
    } else {
      showSwapError(response.error || 'Failed to get quote');
    }
  } catch (error) {
    console.error('[UI] Error getting quote:', error);
    showSwapError(error.message || 'Unable to fetch quote. Check your inputs and try again.');
  } finally {
    swapLoading.style.display = 'none';
    getQuoteBtn.disabled = false;
  }
}

function displaySwapPreview(quote) {
  document.getElementById('expectedOutput').textContent = quote.expectedOutput || '-';
  document.getElementById('minReceived').textContent = quote.minReceived || '-';
  document.getElementById('gasCost').textContent = quote.gasCost || '~0.01 ETH';
  document.getElementById('priceImpact').textContent = quote.priceImpact || '0.1%';

  // Display AI recommendations if available
  if (quote.gasOptimization || quote.riskWarning || quote.liquidityAnalysis || quote.timingAdvice) {
    displayAIRecommendations(quote);
  }

  swapPreview.style.display = 'block';
  executeSwapBtn.style.display = 'block';
}

function hideSwapPreview() {
  swapPreview.style.display = 'none';
  executeSwapBtn.style.display = 'none';
}

async function handleExecuteSwap() {
  if (!currentQuote) {
    showSwapError('No quote available. Please get a quote first.');
    return;
  }

  hideSwapError();
  swapStatus.style.display = 'none';

  swapLoading.style.display = 'block';
  document.getElementById('loadingMessage').textContent = 'Preparing swap transaction...';
  executeSwapBtn.disabled = true;

  try {
    console.log('[UI] Executing swap with quote:', currentQuote);

    // Send message to background.js to execute swap
    const response = await chrome.runtime.sendMessage({
      action: 'executeSwap',
      data: {
        fromToken: fromTokenInput.value.trim(),
        toToken: toTokenInput.value.trim(),
        amount: amountInput.value.trim(),
        quote: currentQuote,
      },
    });

    if (response.success) {
      showSwapSuccess(response.data);
      // Clear form
      fromTokenInput.value = '';
      amountInput.value = '';
      toTokenInput.value = '';
      currentQuote = null;
      hideSwapPreview();
    } else {
      showSwapError(response.error || 'Swap execution failed');
    }
  } catch (error) {
    console.error('[UI] Error executing swap:', error);
    showSwapError(error.message || 'Unable to execute swap. Check MetaMask and try again.');
  } finally {
    swapLoading.style.display = 'none';
    executeSwapBtn.disabled = false;
  }
}

function showSwapSuccess(txData) {
  swapStatus.style.display = 'block';
  const statusMessage = document.getElementById('statusMessage');
  statusMessage.textContent = '✅ Swap submitted! Transaction: ' + (txData.txHash || 'Processing...');

  if (txData.txHash) {
    const txLink = document.getElementById('txLink');
    const txHashLink = document.getElementById('txHash');
    txLink.style.display = 'block';
    txHashLink.href = `https://sepolia.etherscan.io/tx/${txData.txHash}`;
    txHashLink.textContent = 'View on Sepolia Etherscan';
  }
}

function showSwapError(message) {
  swapError.textContent = message;
  swapError.style.display = 'block';
}

function hideSwapError() {
  swapError.style.display = 'none';
}

console.log('[UI] Event listeners attached');

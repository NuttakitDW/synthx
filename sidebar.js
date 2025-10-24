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

/**
 * Initialize UI on load
 */
document.addEventListener('DOMContentLoaded', () => {
  console.log('[UI] SynthX sidebar loaded');

  // Load saved settings
  loadSettings();

  // Check extension status
  checkExtensionStatus();

  // Event listeners
  analyzeAddressBtn.addEventListener('click', handleAnalyzeAddress);

  settingsBtn.addEventListener('click', openSettings);
  closeSettingsBtn.addEventListener('click', closeSettings);
  saveSettingsBtn.addEventListener('click', saveSettings);

  // Allow Enter key to submit
  addressInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAnalyzeAddress();
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

console.log('[UI] Event listeners attached');

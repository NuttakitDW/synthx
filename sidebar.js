/**
 * SynthX - Contract Safety Scanner
 *
 * Simple, honest extension that:
 * - Analyzes any Ethereum contract for safety
 * - Uses Claude AI for risk assessment
 * - Shows verdict: SAFE / RISKY / SCAM
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
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');

/**
 * Initialize
 */
document.addEventListener('DOMContentLoaded', () => {
  console.log('[SynthX] Scanner loaded');

  loadSettings();
  checkExtensionStatus();

  analyzeAddressBtn.addEventListener('click', handleAnalyzeAddress);
  addressInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAnalyzeAddress();
  });

  settingsBtn.addEventListener('click', openSettings);
  closeSettingsBtn.addEventListener('click', closeSettings);
  saveSettingsBtn.addEventListener('click', saveSettings);

  document.addEventListener('click', (e) => {
    if (e.target === settingsModal) closeSettings();
  });
});

/**
 * Check extension status
 */
async function checkExtensionStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'ping' });
    if (response.success) {
      statusDot.classList.add('connected');
      statusText.textContent = 'SynthX Ready';
    }
  } catch (error) {
    statusDot.classList.remove('connected');
    statusText.textContent = 'Error';
    console.error('[SynthX] Status check failed:', error);
  }
}

/**
 * Analyze address
 */
async function handleAnalyzeAddress() {
  const address = addressInput.value.trim();

  if (!address) {
    showError('Please enter an address');
    return;
  }

  hideResult();
  hideError();
  tokenLoading.style.display = 'block';
  analyzeAddressBtn.disabled = true;

  try {
    console.log('[SynthX] Scanning:', address);

    const response = await chrome.runtime.sendMessage({
      action: 'analyzeAddress',
      data: { address }
    });

    if (response.success) {
      displayResult(response.data.analysis);
    } else {
      showError(response.error || 'Analysis failed');
    }
  } catch (error) {
    console.error('[SynthX] Error:', error);
    showError(error.message || 'Unable to scan. Check API key and try again.');
  } finally {
    tokenLoading.style.display = 'none';
    analyzeAddressBtn.disabled = false;
  }
}

/**
 * Display result
 */
function displayResult(analysis) {
  const { safety_score, verdict, risks, reason, confidence } = analysis;

  let emoji = '❓';
  if (verdict === 'SAFE') emoji = '🟢';
  else if (verdict === 'RISKY') emoji = '🟡';
  else if (verdict === 'SCAM') emoji = '🔴';

  document.getElementById('verdictEmoji').textContent = emoji;
  document.getElementById('verdictText').textContent = verdict;
  document.getElementById('safetyScore').textContent = `${safety_score}/100`;
  document.getElementById('tokenReason').textContent = reason;

  const risksList = document.getElementById('risksList');
  risksList.innerHTML = '';
  if (risks && risks.length > 0) {
    risks.forEach(risk => {
      const li = document.createElement('li');
      li.textContent = risk;
      risksList.appendChild(li);
    });
  } else {
    const li = document.createElement('li');
    li.style.color = '#10b981';
    li.style.listStyleType = 'none';
    li.textContent = '✅ No red flags detected';
    risksList.appendChild(li);
  }

  document.getElementById('confidence').textContent = `Confidence: ${confidence}`;
  tokenResult.style.display = 'block';
}

function showError(message) {
  tokenError.textContent = message;
  tokenError.style.display = 'block';
}

function hideError() {
  tokenError.style.display = 'none';
}

function hideResult() {
  tokenResult.style.display = 'none';
}

/**
 * Settings
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
      apiKeyInput.value = data.CLAUDE_API_KEY.substring(0, 10) + '...';
      apiKeyInput.setAttribute('data-key', data.CLAUDE_API_KEY);
    }
    if (data.BLOCKSCOUT_CHAIN_ID) {
      chainSelect.value = data.BLOCKSCOUT_CHAIN_ID;
    }
  } catch (error) {
    console.error('[SynthX] Failed to load settings:', error);
  }
}

async function saveSettings() {
  let apiKey = apiKeyInput.value;

  if (apiKey.endsWith('...')) {
    apiKey = apiKeyInput.getAttribute('data-key') || '';
  }

  if (!apiKey || !apiKey.startsWith('sk-ant-')) {
    alert('Please enter a valid Claude API key (starts with sk-ant-)');
    return;
  }

  try {
    await chrome.storage.local.set({
      CLAUDE_API_KEY: apiKey,
      BLOCKSCOUT_CHAIN_ID: chainSelect.value,
    });

    chrome.runtime.sendMessage({
      action: 'setApiKey',
      apiKey: apiKey,
    });

    alert('Settings saved!');
    closeSettings();
  } catch (error) {
    console.error('[SynthX] Failed to save settings:', error);
    alert('Failed to save settings');
  }
}

console.log('[SynthX] Ready');

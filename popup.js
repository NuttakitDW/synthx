/**
 * SynthX Popup Script
 * - Settings UI for Claude API key configuration
 */

const apiKeyInput = document.getElementById('apiKeyInput');
const saveBtn = document.getElementById('saveBtn');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const saveStatus = document.getElementById('saveStatus');

/**
 * Initialize on popup load
 */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Popup] Loading settings...');

  // Load saved API key
  const { CLAUDE_API_KEY } = await chrome.storage.local.get(['CLAUDE_API_KEY']);
  if (CLAUDE_API_KEY) {
    apiKeyInput.value = CLAUDE_API_KEY.substring(0, 10) + '...';
    apiKeyInput.setAttribute('data-key', CLAUDE_API_KEY);
  }

  // Check extension status
  checkStatus();

  // Save button handler
  saveBtn.addEventListener('click', handleSave);
  apiKeyInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSave();
  });
});

/**
 * Check extension status
 */
async function checkStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'ping' });
    if (response.success) {
      statusDot.classList.add('connected');
      statusText.textContent = 'Extension ready';
    }
  } catch (error) {
    statusDot.classList.remove('connected');
    statusText.textContent = 'Error';
  }
}

/**
 * Handle API key save
 */
async function handleSave() {
  let apiKey = apiKeyInput.value;

  // Check if user edited or it's masked
  if (apiKey.endsWith('...')) {
    apiKey = apiKeyInput.getAttribute('data-key') || '';
  }

  if (!apiKey || !apiKey.startsWith('sk-ant-')) {
    showSaveStatus('Invalid API key. Must start with sk-ant-', 'error');
    return;
  }

  try {
    await chrome.storage.local.set({ CLAUDE_API_KEY: apiKey });

    // Notify background script
    chrome.runtime.sendMessage({
      action: 'setApiKey',
      apiKey: apiKey,
    });

    showSaveStatus('API key saved!', 'success');
    setTimeout(() => {
      apiKeyInput.value = apiKey.substring(0, 10) + '...';
      apiKeyInput.setAttribute('data-key', apiKey);
    }, 500);
  } catch (error) {
    showSaveStatus('Failed to save API key', 'error');
  }
}

/**
 * Show save status message
 */
function showSaveStatus(message, type) {
  saveStatus.textContent = message;
  saveStatus.className = `status-message ${type}`;
  saveStatus.style.display = 'block';

  setTimeout(() => {
    saveStatus.style.display = 'none';
  }, 3000);
}

console.log('[Popup] Loaded');

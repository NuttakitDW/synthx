/**
 * SynthX Content Script - Enhanced with Pattern Analysis
 *
 * - Detects Blockscout page type (address, tx, token)
 * - Shows scanned address/hash in header
 * - Detects compromised wallets (immediate fund transfers)
 * - Improved color scheme (cyan/teal instead of purple)
 */

console.log('[SynthX] Content script loaded');

let currentPageData = null;

/**
 * Detect page type and extract relevant data
 */
function detectPageData() {
  const url = window.location.href;
  const pathname = window.location.pathname;

  // Transaction page: /tx/0x...
  if (pathname.includes('/tx/')) {
    const match = pathname.match(/\/tx\/(.+?)(?:\/|$)/);
    if (match) {
      return {
        type: 'transaction',
        value: match[1],
        url: url
      };
    }
  }

  // Address page: /address/0x...
  if (pathname.includes('/address/')) {
    const match = pathname.match(/\/address\/(.+?)(?:\/|$)/);
    if (match) {
      return {
        type: 'address',
        value: match[1],
        url: url
      };
    }
  }

  // Token page: /token/0x...
  if (pathname.includes('/token/')) {
    const match = pathname.match(/\/token\/(.+?)(?:\/|$)/);
    if (match) {
      return {
        type: 'token',
        value: match[1],
        url: url
      };
    }
  }

  return null;
}

/**
 * Shorten address for display
 */
function shortenAddress(addr) {
  if (!addr) return '';
  return addr.substring(0, 6) + '...' + addr.substring(addr.length - 4);
}

/**
 * Inject improved overlay UI
 */
function injectOverlay(pageData) {
  // Remove existing overlay if present
  const existing = document.getElementById('synthx-overlay');
  if (existing) existing.remove();

  currentPageData = pageData;

  // Create overlay container
  const overlay = document.createElement('div');
  overlay.id = 'synthx-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    right: 0;
    width: 420px;
    height: 100vh;
    background: linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%);
    border-left: 2px solid #00d9ff;
    box-shadow: -8px 0 32px rgba(0, 217, 255, 0.12);
    z-index: 10000;
    display: flex;
    flex-direction: column;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    overflow: hidden;
  `;

  // Header with info and minimize button
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 14px 16px;
    background: linear-gradient(135deg, #00d9ff 0%, #0099cc 100%);
    color: white;
    border-bottom: none;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  `;

  const displayValue = pageData.type === 'transaction'
    ? shortenAddress(pageData.value)
    : pageData.type === 'token'
    ? shortenAddress(pageData.value)
    : shortenAddress(pageData.value);

  const typeEmoji = pageData.type === 'transaction' ? '🔄' : pageData.type === 'token' ? '🪙' : '👤';

  header.innerHTML = `
    <div style="flex: 1;">
      <h2 style="margin: 0; font-size: 18px; font-weight: 700; letter-spacing: -0.5px;">🧠 SynthX</h2>
      <p style="margin: 4px 0 0 0; color: rgba(255,255,255,0.85); font-size: 10px; font-weight: 500; font-family: monospace; word-break: break-all;">
        ${typeEmoji} ${displayValue}
      </p>
    </div>
    <div style="display: flex; gap: 8px;">
      <button id="synthx-minimize" style="
        background: rgba(255,255,255,0.25);
        border: none;
        color: white;
        cursor: pointer;
        border-radius: 6px;
        width: 32px;
        height: 32px;
        font-size: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      " title="Minimize">−</button>
      <button id="synthx-close" style="
        background: rgba(255,255,255,0.25);
        border: none;
        color: white;
        cursor: pointer;
        border-radius: 6px;
        width: 32px;
        height: 32px;
        font-size: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      " title="Close">✕</button>
    </div>
  `;

  // Content area (scrollable)
  const content = document.createElement('div');
  content.id = 'synthx-content';
  content.style.cssText = `
    flex: 1;
    overflow-y: auto;
    padding: 0;
    display: flex;
    flex-direction: column;
  `;
  content.innerHTML = `
    <div id="synthx-loading" style="
      text-align: center;
      padding: 60px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #0099cc;
    ">
      <div style="
        display: inline-block;
        width: 40px;
        height: 40px;
        border: 3px solid #e0f7ff;
        border-top: 3px solid #00d9ff;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      "></div>
      <p style="margin-top: 16px; font-size: 13px; color: #0099cc;">Analyzing ${pageData.type}...</p>
    </div>
    <div id="synthx-result" style="display: none; padding: 16px; flex: 1; overflow-y: auto;"></div>
    <div id="synthx-error" style="
      display: none;
      padding: 16px;
      background: #fee;
      border-left: 4px solid #d32f2f;
      color: #991b1b;
      font-size: 13px;
      margin: 0;
    "></div>
  `;

  // Button bar (scan + minimal spacing)
  const buttonBar = document.createElement('div');
  buttonBar.style.cssText = `
    padding: 12px 16px;
    background: white;
    border-top: 1px solid #e0f7ff;
    display: flex;
    gap: 8px;
  `;
  buttonBar.innerHTML = `
    <button id="synthx-scan-btn" style="
      flex: 1;
      padding: 10px;
      background: linear-gradient(135deg, #00d9ff 0%, #0099cc 100%);
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    ">🔄 Scan</button>
  `;

  // Q&A section
  const qa = document.createElement('div');
  qa.style.cssText = `
    padding: 12px 16px;
    background: white;
    border-top: 1px solid #e0f7ff;
  `;
  qa.innerHTML = `
    <input
      type="text"
      id="synthx-question"
      placeholder="Ask a follow-up question..."
      style="
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #b3e5fc;
        border-radius: 6px;
        font-size: 12px;
        box-sizing: border-box;
        background: #f0f9ff;
        transition: all 0.2s;
      "
    />
  `;

  // Add animation styles
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    #synthx-overlay * {
      box-sizing: border-box;
    }
    #synthx-overlay input:focus {
      outline: none;
      border-color: #00d9ff;
      background: white;
      box-shadow: 0 0 0 3px rgba(0, 217, 255, 0.1);
    }
    #synthx-overlay button:hover {
      opacity: 0.9;
      transform: scale(1.02);
    }
    #synthx-result {
      color: #1f2937;
    }
  `;
  document.head.appendChild(style);

  // Assemble overlay
  overlay.appendChild(header);
  overlay.appendChild(content);
  overlay.appendChild(buttonBar);
  overlay.appendChild(qa);
  document.body.appendChild(overlay);

  // Event handlers
  document.getElementById('synthx-close').addEventListener('click', () => {
    overlay.remove();
  });

  // Create restore button (hidden until minimized)
  const restoreBtn = document.createElement('button');
  restoreBtn.id = 'synthx-restore-btn';
  restoreBtn.style.cssText = `
    position: fixed;
    bottom: 30px;
    right: 20px;
    width: 50px;
    height: 50px;
    background: linear-gradient(135deg, #00d9ff 0%, #0099cc 100%);
    color: white;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    z-index: 9999;
    display: none;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    box-shadow: 0 4px 12px rgba(0, 217, 255, 0.4);
    transition: all 0.2s;
  `;
  restoreBtn.innerHTML = '🧠';
  restoreBtn.title = 'Show SynthX';
  document.body.appendChild(restoreBtn);

  document.getElementById('synthx-minimize').addEventListener('click', () => {
    overlay.style.width = '0px';
    overlay.style.opacity = '0';
    overlay.style.transition = 'all 0.3s ease';
    restoreBtn.style.display = 'flex';
  });

  restoreBtn.addEventListener('click', () => {
    overlay.style.width = '420px';
    overlay.style.opacity = '1';
    restoreBtn.style.display = 'none';
  });

  document.getElementById('synthx-scan-btn').addEventListener('click', () => {
    console.log('[SynthX] Scan button clicked - re-analyzing');
    analyzePageData();
  });

  const questionInput = document.getElementById('synthx-question');
  questionInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && questionInput.value.trim()) {
      handleFollowUp(questionInput.value);
      questionInput.value = '';
    }
  });

  // Initial analysis
  analyzePageData();
}

/**
 * Request analysis from background script
 */
function analyzePageData() {
  const loadingEl = document.getElementById('synthx-loading');
  const resultEl = document.getElementById('synthx-result');
  const errorEl = document.getElementById('synthx-error');

  if (loadingEl) loadingEl.style.display = 'flex';
  if (resultEl) resultEl.style.display = 'none';
  if (errorEl) errorEl.style.display = 'none';

  console.log('[SynthX] Sending analyze message for:', currentPageData);

  chrome.runtime.sendMessage(
    { action: 'analyzePage', pageData: currentPageData },
    (response) => {
      console.log('[SynthX] Received response:', response);
      handleAnalysisResponse(response);
    }
  );
}

/**
 * Handle analysis response from background script
 */
function handleAnalysisResponse(response) {
  const loadingEl = document.getElementById('synthx-loading');
  const resultEl = document.getElementById('synthx-result');
  const errorEl = document.getElementById('synthx-error');

  if (!loadingEl || !resultEl || !errorEl) return;

  if (response.error) {
    if (loadingEl) loadingEl.style.display = 'none';
    resultEl.style.display = 'none';
    errorEl.style.display = 'block';
    errorEl.textContent = response.error;
  } else {
    if (loadingEl) loadingEl.style.display = 'none';
    resultEl.style.display = 'block';
    errorEl.style.display = 'none';
    resultEl.innerHTML = formatAnalysis(response.analysis);
  }
}

/**
 * Format analysis result for display with improved design
 */
function formatAnalysis(analysis) {
  const html = `
    <div style="color: #000000; font-size: 13px; line-height: 1.6;">
      ${analysis.summary ? `
        <div style="margin-bottom: 16px; padding: 12px; background: #e0f7ff; border-left: 4px solid #00d9ff; border-radius: 4px;">
          <strong style="color: #000000; display: block; margin-bottom: 6px;">📝 Summary</strong>
          <p style="margin: 0; color: #000000;">${escapeHtml(analysis.summary)}</p>
        </div>
      ` : ''}

      ${analysis.key_actions && analysis.key_actions.length > 0 ? `
        <div style="margin-bottom: 16px;">
          <h3 style="margin: 0 0 8px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #000000;">📋 Key Actions</h3>
          <ul style="margin: 0; padding-left: 20px; color: #000000;">
            ${analysis.key_actions.map(action => `<li style="margin: 6px 0; font-size: 13px; color: #000000;">${escapeHtml(action)}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      ${analysis.risks && analysis.risks.length > 0 ? `
        <div style="margin-bottom: 16px; padding: 12px; background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px;">
          <h3 style="margin: 0 0 8px 0; font-size: 12px; font-weight: 700; color: #991b1b; text-transform: uppercase; letter-spacing: 0.5px;">⚠️ Security Alerts</h3>
          <ul style="margin: 0; padding-left: 20px; color: #000000;">
            ${analysis.risks.map(risk => `<li style="margin: 6px 0; font-size: 13px; color: #000000;">${escapeHtml(risk)}</li>`).join('')}
          </ul>
        </div>
      ` : `
        <div style="margin-bottom: 16px; padding: 12px; background: #f0fdf4; border-left: 4px solid #10b981; border-radius: 4px; color: #000000;">
          <strong>✅ No security concerns detected</strong>
        </div>
      `}

      ${analysis.details ? `
        <div style="padding: 12px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; font-size: 12px; color: #000000; line-height: 1.7;">
          <strong style="color: #000000; display: block; margin-bottom: 8px;">📊 Details</strong>
          <p style="margin: 0; color: #000000;">${escapeHtml(analysis.details)}</p>
        </div>
      ` : ''}
    </div>
  `;
  return html;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Handle follow-up questions
 */
function handleFollowUp(question) {
  const resultEl = document.getElementById('synthx-result');
  if (!resultEl) return;

  // Show loading
  resultEl.innerHTML = `
    <div style="text-align: center; padding: 30px 20px;">
      <div style="
        display: inline-block;
        width: 30px;
        height: 30px;
        border: 2px solid #e0f7ff;
        border-top: 2px solid #00d9ff;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      "></div>
      <p style="margin-top: 12px; color: #0099cc; font-size: 12px;">Thinking...</p>
    </div>
  `;

  // Request follow-up
  chrome.runtime.sendMessage(
    {
      action: 'askFollowUp',
      pageData: currentPageData,
      question
    },
    (response) => {
      if (response.error) {
        resultEl.innerHTML = `<div style="color: #d32f2f; padding: 12px; background: #fee; border-radius: 4px; font-size: 13px;">${escapeHtml(response.error)}</div>`;
      } else {
        resultEl.innerHTML = formatAnalysis(response.analysis);
      }
    }
  );
}

/**
 * Initialize on page load
 */
function initializeSynthX() {
  const pageData = detectPageData();

  if (pageData) {
    console.log('[SynthX] Detected page:', pageData);
    injectOverlay(pageData);
  } else {
    console.log('[SynthX] Not a Blockscout page we recognize');
  }
}

// Try both DOMContentLoaded and immediate execution
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSynthX);
} else {
  initializeSynthX();
}

console.log('[SynthX] Ready');

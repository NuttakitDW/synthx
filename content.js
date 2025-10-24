/**
 * SynthX Content Script
 *
 * - Detects Blockscout page type (address, tx, token)
 * - Extracts relevant data (hash, address, etc)
 * - Injects overlay UI
 * - Handles user interactions
 */

console.log('[SynthX] Content script loaded');

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
 * Inject overlay UI into the page
 */
function injectOverlay(pageData) {
  // Create overlay container
  const overlay = document.createElement('div');
  overlay.id = 'synthx-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    right: 0;
    width: 400px;
    height: 100vh;
    background: white;
    border-left: 1px solid #e5e7eb;
    box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
    z-index: 10000;
    display: flex;
    flex-direction: column;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  // Header
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 16px;
    border-bottom: 1px solid #e5e7eb;
    background: #f9fafb;
  `;
  header.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <h2 style="margin: 0; font-size: 18px; font-weight: 600;">🧠 SynthX</h2>
      <button id="synthx-close" style="background: none; border: none; cursor: pointer; font-size: 20px;">✕</button>
    </div>
    <p style="margin: 8px 0 0 0; color: #666; font-size: 12px;">AI-powered explanation</p>
  `;

  // Content area
  const content = document.createElement('div');
  content.style.cssText = `
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  `;
  content.innerHTML = `
    <div id="synthx-loading" style="text-align: center; padding: 40px 0;">
      <div style="
        display: inline-block;
        width: 30px;
        height: 30px;
        border: 3px solid #e5e7eb;
        border-top: 3px solid #3b82f6;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      " style="animation: spin 1s linear infinite;"></div>
      <p style="margin-top: 12px; color: #666;">Analyzing ${pageData.type}...</p>
    </div>
    <div id="synthx-result" style="display: none;"></div>
    <div id="synthx-error" style="display: none; padding: 12px; background: #fee; border-radius: 6px; color: #d32f2f;"></div>
  `;

  // Q&A section
  const qa = document.createElement('div');
  qa.style.cssText = `
    padding: 16px;
    border-top: 1px solid #e5e7eb;
    background: #f9fafb;
  `;
  qa.innerHTML = `
    <input
      type="text"
      id="synthx-question"
      placeholder="Ask a follow-up question..."
      style="
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        font-size: 13px;
        box-sizing: border-box;
      "
    />
  `;

  // Add styles for animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    #synthx-overlay * {
      box-sizing: border-box;
    }
  `;
  document.head.appendChild(style);

  // Assemble overlay
  overlay.appendChild(header);
  overlay.appendChild(content);
  overlay.appendChild(qa);
  document.body.appendChild(overlay);

  // Close button handler
  document.getElementById('synthx-close').addEventListener('click', () => {
    overlay.remove();
  });

  // Request analysis from background script
  chrome.runtime.sendMessage(
    { action: 'analyzePage', pageData },
    handleAnalysisResponse
  );

  // Handle Q&A
  const questionInput = document.getElementById('synthx-question');
  questionInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && questionInput.value.trim()) {
      handleFollowUp(questionInput.value, pageData);
      questionInput.value = '';
    }
  });

  return overlay;
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
    loadingEl.style.display = 'none';
    errorEl.style.display = 'block';
    errorEl.textContent = response.error;
  } else {
    loadingEl.style.display = 'none';
    resultEl.style.display = 'block';
    resultEl.innerHTML = formatAnalysis(response.analysis);
  }
}

/**
 * Format analysis result for display
 */
function formatAnalysis(analysis) {
  const html = `
    <div style="color: #1f2937;">
      ${analysis.summary ? `
        <div style="margin-bottom: 16px; line-height: 1.6; color: #374151;">
          ${escapeHtml(analysis.summary)}
        </div>
      ` : ''}

      ${analysis.key_actions ? `
        <div style="margin-bottom: 16px;">
          <h3 style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #1f2937;">Key Actions</h3>
          <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 13px;">
            ${analysis.key_actions.map(action => `<li style="margin: 4px 0;">${escapeHtml(action)}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      ${analysis.risks && analysis.risks.length > 0 ? `
        <div style="margin-bottom: 16px;">
          <h3 style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #d32f2f;">⚠️ Risks Detected</h3>
          <ul style="margin: 0; padding-left: 20px; color: #d32f2f; font-size: 13px;">
            ${analysis.risks.map(risk => `<li style="margin: 4px 0;">${escapeHtml(risk)}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      ${analysis.details ? `
        <div style="padding: 12px; background: #f0f9ff; border-left: 3px solid #3b82f6; border-radius: 4px; font-size: 13px; color: #1e40af;">
          <strong>Details:</strong><br/>
          ${escapeHtml(analysis.details)}
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
function handleFollowUp(question, pageData) {
  const resultEl = document.getElementById('synthx-result');
  if (!resultEl) return;

  // Show loading state
  resultEl.innerHTML = `
    <div style="text-align: center; padding: 20px 0;">
      <div style="
        display: inline-block;
        width: 20px;
        height: 20px;
        border: 2px solid #e5e7eb;
        border-top: 2px solid #3b82f6;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      "></div>
    </div>
  `;

  // Request follow-up from background
  chrome.runtime.sendMessage(
    {
      action: 'askFollowUp',
      pageData,
      question
    },
    (response) => {
      if (response.error) {
        resultEl.innerHTML = `<div style="color: #d32f2f; padding: 12px; background: #fee; border-radius: 4px;">${escapeHtml(response.error)}</div>`;
      } else {
        resultEl.innerHTML = formatAnalysis(response.analysis);
      }
    }
  );
}

/**
 * Initialize on page load
 */
document.addEventListener('DOMContentLoaded', () => {
  const pageData = detectPageData();

  if (pageData) {
    console.log('[SynthX] Detected page:', pageData);
    injectOverlay(pageData);
  } else {
    console.log('[SynthX] Not a Blockscout page we recognize');
  }
});

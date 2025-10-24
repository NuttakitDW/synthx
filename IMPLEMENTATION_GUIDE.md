# 🚀 Implementation Guide - Building the DeFi Advisor Extension

## Overview
We're building a 4-feature DeFi advisor extension in 8 hours.

**Features:**
1. MetaMask Connection
2. Portfolio Analysis
3. Website Context Detection
4. Claude DeFi Advisor Guidance

**Success Criteria:**
- ✅ User connects MetaMask
- ✅ Extension shows their holdings
- ✅ Detects what DEX they're on
- ✅ Analyzes tokens for safety
- ✅ Shows smart guidance
- ✅ Works without crashes

---

## Phase 1: MetaMask Connection (Hour 1)

### Goal
User clicks "Connect Wallet" → MetaMask popup → Extension shows their address

### Files to Modify
- `manifest.json` - Add host permission for MetaMask
- `sidebar.html` - Add connect button
- `sidebar.js` - Add MetaMask connection logic

### Implementation

**1. Update manifest.json:**
```json
{
  "permissions": [
    "storage",
    "activeTab",
    "scripting",
    "tabs"
  ],
  "host_permissions": [
    "https://*.uniswap.org/*",
    "https://*.sushiswap.fi/*",
    "https://*.curve.fi/*",
    "https://api.anthropic.com/*",
    "https://eth.blockscout.com/*",
    "https://sepolia.blockscout.com/*"
  ]
}
```

**2. Add to sidebar.html:**
```html
<div id="walletSection">
  <div id="walletStatus">
    <span id="walletStatusDot" class="status-dot"></span>
    <span id="walletStatusText">Not connected</span>
  </div>

  <button id="connectWalletBtn" class="btn btn-primary">
    🦊 Connect MetaMask
  </button>

  <div id="walletInfo" style="display: none;">
    <div class="wallet-address">
      Connected: <span id="connectedAddress"></span>
    </div>
    <button id="disconnectWalletBtn" class="btn btn-secondary">
      Disconnect
    </button>
  </div>
</div>
```

**3. Add to sidebar.js:**
```javascript
// MetaMask connection
const connectWalletBtn = document.getElementById('connectWalletBtn');
const walletSection = document.getElementById('walletSection');
const connectedAddress = document.getElementById('connectedAddress');

connectWalletBtn.addEventListener('click', connectMetaMask);

async function connectMetaMask() {
  console.log('[MetaMask] Connecting...');

  // Check if MetaMask is installed
  if (!window.ethereum) {
    alert('MetaMask not installed. Please install it first.');
    return;
  }

  try {
    // Request account access
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts'
    });

    const userAddress = accounts[0];
    console.log('[MetaMask] Connected:', userAddress);

    // Store in Chrome storage
    await chrome.storage.local.set({
      connectedWallet: userAddress,
      walletConnected: true
    });

    // Update UI
    displayWalletInfo(userAddress);

    // Load portfolio
    analyzePortfolio(userAddress);

  } catch (error) {
    console.error('[MetaMask] Connection failed:', error);
    alert('Failed to connect MetaMask: ' + error.message);
  }
}

function displayWalletInfo(address) {
  document.getElementById('connectWalletBtn').style.display = 'none';
  document.getElementById('walletInfo').style.display = 'block';
  document.getElementById('connectedAddress').textContent =
    address.substring(0, 6) + '...' + address.substring(address.length - 4);
  document.getElementById('walletStatusDot').classList.add('connected');
  document.getElementById('walletStatusText').textContent = 'Connected';
}

// Restore connection on page load
document.addEventListener('DOMContentLoaded', async () => {
  const { connectedWallet, walletConnected } =
    await chrome.storage.local.get(['connectedWallet', 'walletConnected']);

  if (walletConnected && connectedWallet) {
    displayWalletInfo(connectedWallet);
  }
});
```

### Test Checklist
- [ ] MetaMask installed
- [ ] Click "Connect MetaMask"
- [ ] MetaMask popup appears
- [ ] Connection succeeds
- [ ] Address shows in extension
- [ ] Connection persists on reload

---

## Phase 2: Portfolio Analysis (Hours 2-3)

### Goal
Show connected wallet's tokens with risk analysis

### Files to Modify
- `sidebar.html` - Add portfolio display section
- `sidebar.js` - Add portfolio fetching and analysis
- `background.js` - Add portfolio analysis handler

### Implementation

**1. Add to sidebar.html:**
```html
<div id="portfolioSection" style="display: none;">
  <h3>💼 Your Portfolio</h3>

  <div id="portfolioLoading" style="display: none;">
    Loading portfolio...
  </div>

  <div id="portfolioStats">
    <div class="stat">
      <span class="label">Total Value</span>
      <span id="totalValue" class="value">$0</span>
    </div>
    <div class="stat">
      <span class="label">Portfolio Risk</span>
      <span id="portfolioRisk" class="value">--</span>
    </div>
  </div>

  <div id="tokensList" class="tokens-list">
    <!-- Auto-populated -->
  </div>
</div>
```

**2. Add to sidebar.js:**
```javascript
async function analyzePortfolio(walletAddress) {
  console.log('[Portfolio] Analyzing:', walletAddress);

  const portfolioSection = document.getElementById('portfolioSection');
  const portfolioLoading = document.getElementById('portfolioLoading');
  const tokensList = document.getElementById('tokensList');

  portfolioLoading.style.display = 'block';
  portfolioSection.style.display = 'block';

  try {
    // Send to background script for analysis
    const result = await chrome.runtime.sendMessage({
      action: 'analyzePortfolio',
      data: { walletAddress }
    });

    if (result.success) {
      displayPortfolio(result.data);
    } else {
      throw new Error(result.error);
    }

  } catch (error) {
    console.error('[Portfolio] Error:', error);
    tokensList.innerHTML = `<div class="error">Failed to load portfolio: ${error.message}</div>`;
  } finally {
    portfolioLoading.style.display = 'none';
  }
}

function displayPortfolio(portfolioData) {
  const tokensList = document.getElementById('tokensList');
  const totalValue = document.getElementById('totalValue');
  const portfolioRisk = document.getElementById('portfolioRisk');

  // Update stats
  totalValue.textContent = '$' + portfolioData.totalValue.toFixed(2);
  portfolioRisk.textContent = portfolioData.portfolioRisk > 70 ?
    '🟢 Low Risk' :
    portfolioData.portfolioRisk > 40 ?
    '🟡 Medium Risk' :
    '🔴 High Risk';

  // Display tokens
  tokensList.innerHTML = '';
  portfolioData.tokens.forEach(token => {
    const tokenEl = document.createElement('div');
    tokenEl.className = 'token-item';
    tokenEl.innerHTML = `
      <div class="token-header">
        <span class="token-name">${token.symbol}</span>
        <span class="token-verdict ${token.risk.toLowerCase()}">${token.risk}</span>
      </div>
      <div class="token-balance">
        Balance: ${token.balance.toFixed(4)} ${token.symbol}
      </div>
      <div class="token-value">
        Value: $${token.value.toFixed(2)}
      </div>
      <div class="token-analysis">
        ${token.analysis}
      </div>
    `;
    tokensList.appendChild(tokenEl);
  });
}
```

**3. Add to background.js:**
```javascript
// Handle portfolio analysis
async function handleAnalyzePortfolio(data) {
  const { walletAddress } = data;

  console.log('[Background] Analyzing portfolio:', walletAddress);

  try {
    // Get tokens from Blockscout
    const tokensResponse = await blockscoutClient.getTokensByAddress(walletAddress);
    const tokens = tokensResponse.slice(0, 10); // Limit to 10 for speed

    // Analyze each token
    const analysis = await Promise.all(
      tokens.map(async (token) => {
        const tokenAnalysis = await claudeClient.analyzeToken({
          symbol: token.symbol,
          address: token.contractAddress,
          balance: token.balance,
          exchangeRate: token.exchangeRate
        });

        return {
          symbol: token.symbol,
          address: token.contractAddress,
          balance: parseFloat(token.balance) / Math.pow(10, token.decimals || 18),
          value: parseFloat(token.balance) / Math.pow(10, token.decimals || 18) * (token.exchangeRate || 0),
          risk: tokenAnalysis.verdict,
          analysis: tokenAnalysis.reason
        };
      })
    );

    // Calculate total value and portfolio risk
    const totalValue = analysis.reduce((sum, t) => sum + t.value, 0);
    const portfolioRisk = calculatePortfolioRisk(analysis, totalValue);

    return {
      tokens: analysis,
      totalValue: totalValue,
      portfolioRisk: portfolioRisk
    };

  } catch (error) {
    console.error('[Background] Portfolio analysis error:', error);
    throw error;
  }
}

function calculatePortfolioRisk(tokens, totalValue) {
  if (totalValue === 0) return 100;

  const riskScores = {
    'SAFE': 0,
    'RISKY': 50,
    'SCAM': 100
  };

  let weightedRisk = 0;
  tokens.forEach(token => {
    const weight = token.value / totalValue;
    const riskScore = riskScores[token.risk] || 50;
    weightedRisk += riskScore * weight;
  });

  return Math.round(100 - weightedRisk);
}
```

### Test Checklist
- [ ] Connect wallet first
- [ ] Portfolio section appears
- [ ] Tokens load from Blockscout
- [ ] Risk analysis shows
- [ ] Total value calculates correctly
- [ ] Each token shows analysis

---

## Phase 3: Website Context Detection (Hour 3-4)

### Goal
Detect what DEX user is on and extract token addresses from URL

### Files to Modify
- `sidebar.js` - Add context detection

### Implementation

**1. Add to sidebar.js:**
```javascript
// Website context detection
let currentContext = null;

async function updateWebsiteContext() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tabs || !tabs[0]) {
      console.log('[Context] No active tab');
      return;
    }

    const url = tabs[0].url;
    console.log('[Context] Current URL:', url);

    currentContext = {
      url: url,
      platform: detectPlatform(url),
      fromToken: getTokenFromUrl(url, 'inputCurrency', 'fromTokenId'),
      toToken: getTokenFromUrl(url, 'outputCurrency', 'toTokenId')
    };

    console.log('[Context] Detected:', currentContext);

    // Display context if on DEX
    if (currentContext.platform !== 'Unknown') {
      displayWebsiteContext(currentContext);
    } else {
      hideWebsiteContext();
    }

  } catch (error) {
    console.error('[Context] Error:', error);
  }
}

function detectPlatform(url) {
  if (url.includes('uniswap.org')) return 'Uniswap';
  if (url.includes('sushiswap.fi')) return 'SushiSwap';
  if (url.includes('curve.fi')) return 'Curve';
  if (url.includes('1inch.io')) return '1inch';
  return 'Unknown';
}

function getTokenFromUrl(url, ...paramNames) {
  try {
    const parsedUrl = new URL(url);
    for (const paramName of paramNames) {
      const value = parsedUrl.searchParams.get(paramName);
      if (value) return value;
    }
  } catch (error) {
    console.error('[Context] URL parse error:', error);
  }
  return null;
}

function displayWebsiteContext(context) {
  let contextHTML = `
    <div id="websiteContext" class="context-panel">
      <h3>🔗 ${context.platform}</h3>
  `;

  if (context.fromToken || context.toToken) {
    contextHTML += `
      <div class="swap-info">
        <div>From: ${context.fromToken || 'Not specified'}</div>
        <div>To: ${context.toToken || 'Not specified'}</div>
      </div>
    `;
  }

  contextHTML += '</div>';

  // Remove old context if exists
  const oldContext = document.getElementById('websiteContext');
  if (oldContext) oldContext.remove();

  // Insert into sidebar
  const portfolioSection = document.getElementById('portfolioSection');
  portfolioSection.insertAdjacentHTML('beforeend', contextHTML);
}

function hideWebsiteContext() {
  const contextEl = document.getElementById('websiteContext');
  if (contextEl) contextEl.remove();
}

// Update context when sidebar opens and when tabs change
document.addEventListener('DOMContentLoaded', () => {
  updateWebsiteContext();
});

// Update when user switches tabs
chrome.tabs.onActivated.addListener(() => {
  setTimeout(updateWebsiteContext, 500);
});

// Update when tab URL changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    updateWebsiteContext();
  }
});
```

### Test Checklist
- [ ] Open extension on Uniswap
- [ ] Platform detected (shows "Uniswap")
- [ ] Token addresses extracted from URL
- [ ] Works on SushiSwap/Curve
- [ ] Context updates when switching tabs

---

## Phase 4: Claude DeFi Advisor Prompts (Hour 4-5)

### Goal
Create smart Claude prompts that provide DeFi guidance

### Files to Modify
- `background.js` - Add advisor handler

### Implementation

**1. Add to background.js:**
```javascript
// Handle DeFi advisor queries
async function handleDeFiAdvisor(data) {
  const { question, tokens, walletAddress, context } = data;

  console.log('[Advisor] Question:', question);

  try {
    const systemPrompt = `You are an expert DeFi advisor. Your role is to:
1. Analyze token safety and risks
2. Provide clear, actionable guidance
3. Warn about scams and honeypots
4. Explain swap procedures step-by-step
5. Help users make informed decisions

Always prioritize user safety over profit.
Be concise and direct.
Use emojis for clarity.`;

    const userMessage = `
User Question: ${question}

${tokens ? `Token Analysis:
${JSON.stringify(tokens, null, 2)}` : ''}

${walletAddress ? `User's Wallet: ${walletAddress}` : ''}

${context ? `Context:
Platform: ${context.platform}
${context.fromToken ? `From Token: ${context.fromToken}` : ''}
${context.toToken ? `To Token: ${context.toToken}` : ''}` : ''}

Provide clear, actionable guidance.`;

    const response = await claudeClient._chat(userMessage, systemPrompt);

    return {
      advice: response.message || response,
      tokens: tokens,
      context: context
    };

  } catch (error) {
    console.error('[Advisor] Error:', error);
    throw error;
  }
}

// Specific advisor scenarios
async function getSwapGuidance(fromToken, toToken, amount) {
  const prompt = `User wants to swap:
Amount: ${amount}
From: ${fromToken.symbol} (${fromToken.address})
To: ${toToken.symbol} (${toToken.address})

Analysis:
${fromToken.analysis}
${toToken.analysis}

Provide step-by-step swap guidance.
Include risks and gas cost estimate.
Be very brief (5-7 lines).`;

  return await handleDeFiAdvisor({
    question: prompt,
    tokens: [fromToken, toToken]
  });
}

async function getPortfolioRecommendation(portfolio) {
  const riskySummary = portfolio.tokens
    .filter(t => t.risk !== 'SAFE')
    .map(t => `${t.symbol}: ${t.risk}`)
    .join(', ');

  const prompt = `User's portfolio analysis:
Total Value: $${portfolio.totalValue}
Risky holdings: ${riskySummary || 'None'}

${portfolio.tokens.map(t =>
  `${t.symbol}: ${t.risk} (${t.analysis})`
).join('\n')}

Provide portfolio recommendations.
What should they do?
Be brief and actionable.`;

  return await handleDeFiAdvisor({
    question: prompt,
    tokens: portfolio.tokens
  });
}
```

### Test Checklist
- [ ] Claude responds to advisor questions
- [ ] Responses are helpful and clear
- [ ] Includes risk warnings
- [ ] Provides step-by-step guidance
- [ ] No timeout on Blockscout/Claude calls

---

## Phase 5: Guidance UI Integration (Hour 5-6)

### Goal
Build UI for asking questions and showing guidance

### Files to Modify
- `sidebar.html` - Add advisor section
- `sidebar.js` - Add advisor UI handlers

### Implementation

**1. Add to sidebar.html:**
```html
<div id="advisorSection" style="display: none;">
  <h3>💡 DeFi Advisor</h3>

  <div class="advisor-input-group">
    <input id="advisorQuestion"
           type="text"
           placeholder="Ask anything about swaps, risks, or portfolio...">
    <button id="advisorAskBtn" class="btn btn-primary">Ask</button>
  </div>

  <div id="advisorLoading" style="display: none;">
    Thinking...
  </div>

  <div id="advisorResponse" class="advisor-response">
    <!-- Auto-populated -->
  </div>

  <div id="quickActions">
    <button class="quick-action" data-action="portfolio-review">
      📊 Review My Portfolio
    </button>
    <button class="quick-action" data-action="is-swap-safe">
      ✅ Is This Swap Safe?
    </button>
    <button class="quick-action" data-action="how-to-swap">
      🔄 How Do I Swap?
    </button>
  </div>
</div>
```

**2. Add to sidebar.js:**
```javascript
// Advisor UI handlers
const advisorQuestion = document.getElementById('advisorQuestion');
const advisorAskBtn = document.getElementById('advisorAskBtn');
const advisorResponse = document.getElementById('advisorResponse');
const advisorLoading = document.getElementById('advisorLoading');

advisorAskBtn.addEventListener('click', askAdvisor);
advisorQuestion.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') askAdvisor();
});

// Quick action buttons
document.querySelectorAll('.quick-action').forEach(btn => {
  btn.addEventListener('click', handleQuickAction);
});

async function askAdvisor() {
  const question = advisorQuestion.value.trim();

  if (!question) {
    alert('Please ask a question');
    return;
  }

  console.log('[Advisor UI] Asking:', question);

  advisorLoading.style.display = 'block';
  advisorResponse.innerHTML = '';
  advisorAskBtn.disabled = true;

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'defiAdvisor',
      data: {
        question: question,
        context: currentContext,
        tokens: null // TODO: get relevant tokens
      }
    });

    if (response.success) {
      displayAdvisorResponse(response.data.advice);
      advisorQuestion.value = '';
    } else {
      throw new Error(response.error);
    }

  } catch (error) {
    console.error('[Advisor UI] Error:', error);
    advisorResponse.innerHTML = `<div class="error">Error: ${error.message}</div>`;
  } finally {
    advisorLoading.style.display = 'none';
    advisorAskBtn.disabled = false;
  }
}

function displayAdvisorResponse(response) {
  advisorResponse.innerHTML = `
    <div class="response-text">
      ${response}
    </div>
  `;
}

async function handleQuickAction(e) {
  const action = e.target.dataset.action;

  let question = '';
  switch(action) {
    case 'portfolio-review':
      question = 'What should I do with my portfolio? Are there any risks?';
      break;
    case 'is-swap-safe':
      question = `Is it safe to swap ${currentContext.fromToken || 'this token'} for ${currentContext.toToken || 'that token'}?`;
      break;
    case 'how-to-swap':
      question = `How do I safely swap on ${currentContext.platform}?`;
      break;
  }

  advisorQuestion.value = question;
  await askAdvisor();
}

// Show advisor section when connected
function showAdvisor() {
  document.getElementById('advisorSection').style.display = 'block';
}
```

### Test Checklist
- [ ] Can type questions
- [ ] Ask button sends to Claude
- [ ] Response displays in sidebar
- [ ] Quick action buttons work
- [ ] Loading indicator shows/hides
- [ ] Errors display gracefully

---

## Phase 6: Integration & Testing (Hour 6-7)

### Goal
Make all features work together seamlessly

### Implementation Checklist

**1. Update background.js message handler:**
```javascript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Background] Message:', request.action);

  switch (request.action) {
    case 'analyzeAddress':
      handleAnalyzeAddress(request.data)
        .then((result) => sendResponse({ success: true, data: result }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true;

    case 'analyzePortfolio':
      handleAnalyzePortfolio(request.data)
        .then((result) => sendResponse({ success: true, data: result }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true;

    case 'defiAdvisor':
      handleDeFiAdvisor(request.data)
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
```

**2. Test scenarios:**
- [ ] Load extension on Chrome
- [ ] Connect MetaMask
- [ ] Portfolio loads correctly
- [ ] Open Uniswap → Context detected
- [ ] Ask advisor questions
- [ ] Get helpful responses
- [ ] No console errors
- [ ] Sidebar doesn't crash

---

## Phase 7: Polish & Demo (Hour 7-8)

### Files to Modify
- `sidebar.css` - Improve styling
- `sidebar.html` - Final touches

### Implementation

**Add CSS improvements:**
```css
.context-panel {
  background: rgba(255, 255, 255, 0.05);
  border-left: 3px solid #fbbf24;
  padding: 12px;
  margin: 12px 0;
  border-radius: 4px;
}

.advisor-response {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  padding: 12px;
  border-radius: 4px;
  margin-top: 12px;
  min-height: 60px;
  font-size: 0.9em;
  line-height: 1.5;
}

.quick-action {
  width: 100%;
  padding: 8px;
  margin-top: 6px;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85em;
  transition: all 0.2s;
}

.quick-action:hover {
  background: rgba(59, 130, 246, 0.2);
}
```

### Demo Preparation
- [ ] Test on Uniswap live
- [ ] Take screenshots
- [ ] Write demo script
- [ ] Record 2-minute video (optional)
- [ ] Prepare talking points for judges

---

## Success Criteria Checklist

- [ ] MetaMask connects successfully
- [ ] Portfolio shows user's tokens
- [ ] Website context detects DEX platform
- [ ] Claude advisor responds to questions
- [ ] Guidance is helpful and clear
- [ ] No crashes or errors
- [ ] UI looks polished
- [ ] Demo runs smoothly

---

## Timeline Summary

```
Hour 1: MetaMask connection ✓
Hour 2-3: Portfolio analysis ✓
Hour 3-4: Website context ✓
Hour 4-5: Advisor prompts ✓
Hour 5-6: Guidance UI ✓
Hour 6-7: Integration & testing ✓
Hour 7-8: Polish & demo ✓

TOTAL: 8 hours
RESULT: Winning DeFi advisor extension
```

Ready to start? Let's build! 🚀

# 🔍 How Extensions Get Context From Current Website

## The Simple Answer

Your extension can see:
- ✅ The URL of the page user is on
- ✅ The HTML/DOM of the page
- ✅ Parameters in the URL
- ✅ Text on the page
- ✅ Links and buttons

Your extension CANNOT see:
- ❌ JavaScript variables (page state)
- ❌ React component state
- ❌ Private data from the website
- ❌ User interactions happening in real-time

---

## How It Works: Step by Step

### Step 1: Detect Current Website

**In your sidebar.js:**
```javascript
// Get the currently active tab
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const currentTab = tabs[0];
  const url = currentTab.url;

  console.log('User is on:', url);
  // Output: "https://uniswap.org/swap?inputCurrency=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&outputCurrency=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
});
```

### Step 2: Parse the URL

```javascript
// Extract important info from URL
function parseSwapUrl(url) {
  const parsedUrl = new URL(url);

  // Get token addresses from URL params
  const inputToken = parsedUrl.searchParams.get('inputCurrency');
  const outputToken = parsedUrl.searchParams.get('outputCurrency');
  const amount = parsedUrl.searchParams.get('exactAmount');

  // Detect platform
  let platform = 'unknown';
  if (url.includes('uniswap.org')) platform = 'Uniswap';
  if (url.includes('sushiswap.fi')) platform = 'SushiSwap';
  if (url.includes('curve.fi')) platform = 'Curve';

  return {
    platform: platform,
    fromToken: inputToken,
    toToken: outputToken,
    amount: amount
  };
}

// Usage
const context = parseSwapUrl(currentUrl);
console.log(context);
// Output: {
//   platform: "Uniswap",
//   fromToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
//   toToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
//   amount: null
// }
```

### Step 3: Show This Context in Extension

```javascript
// In sidebar.js
async function showWebsiteContext() {
  const context = await getWebsiteContext();

  // Display in sidebar
  document.getElementById('contextPanel').innerHTML = `
    <div class="context-info">
      <h3>🔗 Current Website Context</h3>
      <p>Platform: <strong>${context.platform}</strong></p>
      <p>From Token: <strong>${context.fromToken || 'None'}</strong></p>
      <p>To Token: <strong>${context.toToken || 'None'}</strong></p>
      <p>Amount: <strong>${context.amount || 'Not specified'}</strong></p>
    </div>
  `;
}
```

---

## Real-World Example

### Scenario 1: User on Uniswap

**URL:**
```
https://uniswap.org/swap?inputCurrency=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&outputCurrency=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
```

**Your extension shows:**
```
🔗 Current Website Context
Platform: Uniswap
From Token: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 (USDC)
To Token: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2 (WETH)
Amount: Not specified

[Analyze USDC] [Analyze WETH] [Show Swap Guidance]
```

---

### Scenario 2: User on SushiSwap

**URL:**
```
https://app.sushiswap.fi/swap?fromChainId=1&toChainId=1&fromTokenId=NATIVE&toTokenId=0x6B175474E89094C44Da98b954EedeAC495271d0F
```

**Your extension shows:**
```
🔗 Current Website Context
Platform: SushiSwap
From Token: ETH (NATIVE)
To Token: 0x6B175474E89094C44Da98b954EedeAC495271d0F (DAI)
Amount: Not specified
```

---

## What You CAN Get (Easy)

### ✅ Platform Detection
```javascript
function detectPlatform(url) {
  if (url.includes('uniswap.org')) return 'Uniswap';
  if (url.includes('sushiswap.fi')) return 'SushiSwap';
  if (url.includes('curve.fi')) return 'Curve';
  if (url.includes('1inch.io')) return '1inch';
  return 'Unknown DeFi Platform';
}
```

### ✅ Extract Token Addresses from URL
```javascript
function getTokensFromUrl(url) {
  const parsedUrl = new URL(url);

  // Different platforms use different parameter names
  const params = {
    // Uniswap
    inputCurrency: parsedUrl.searchParams.get('inputCurrency'),
    outputCurrency: parsedUrl.searchParams.get('outputCurrency'),

    // 1inch
    fromTokenAddress: parsedUrl.searchParams.get('fromTokenAddress'),
    toTokenAddress: parsedUrl.searchParams.get('toTokenAddress'),

    // Curve
    fromToken: parsedUrl.searchParams.get('fromToken'),
    toToken: parsedUrl.searchParams.get('toToken')
  };

  return params;
}
```

### ✅ Get the Page Title and Meta Info
```javascript
// This you can get via content script
chrome.tabs.executeScript(tabId, {
  code: `
    document.title + " | " + document.querySelector('meta[name="description"]')?.content
  `
}, (results) => {
  console.log('Page info:', results[0]);
});
```

---

## What You CAN'T Get (Blocked by Sandbox)

### ❌ Live React Component State
```javascript
// This doesn't work - you can't access Uniswap's state
const uniswapState = window.uniswapV3State;
const selectedAmount = window.selectedAmount;
// These are undefined - blocked by sandbox

// Result: You can't know what the user is typing in Uniswap
```

### ❌ Real-Time User Input
```javascript
// Can't see what user is typing
const inputValue = document.querySelector('input[type="text"]').value;
// This might work for simple pages, but Uniswap hides this

// Real reason: React doesn't use native input elements
// It uses controlled components you can't access
```

### ❌ Current Gas Prices on the Page
```javascript
// Can't reliably get the gas price Uniswap is showing
// Uniswap calculates this in JavaScript/React
// By the time you read the DOM, it might be outdated
```

---

## The Practical Implementation

### Here's What You CAN Actually Do

```javascript
// 1. Detect what platform user is on
async function getWebsiteContext() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tabs[0].url;

  // Parse the context
  const context = {
    url: url,
    platform: detectPlatform(url),
    tokens: extractTokensFromUrl(url),
    timestamp: new Date()
  };

  return context;
}

// 2. Use Claude to give guidance
async function getSwapGuidance(context) {
  const guidance = await claude.chat(`
    User is on ${context.platform}.
    They want to swap:
    From: ${context.tokens.fromToken}
    To: ${context.tokens.toToken}

    Analyze these tokens and provide swap guidance.
    Include:
    1. Safety analysis of both tokens
    2. Current gas price estimate
    3. Step-by-step swap instructions
    4. Risk warnings
  `);

  return guidance;
}

// 3. Display in sidebar
async function displaySwapGuidance() {
  const context = await getWebsiteContext();
  const guidance = await getSwapGuidance(context);

  document.getElementById('guidance').innerHTML = `
    <h3>💡 Swap Guidance for ${context.platform}</h3>
    <div class="tokens">
      <strong>From:</strong> ${context.tokens.fromToken}<br/>
      <strong>To:</strong> ${context.tokens.toToken}
    </div>
    <div class="analysis">
      ${guidance}
    </div>
  `;
}
```

---

## The Actual Code for Your Extension

### manifest.json (Add this permission)
```json
{
  "permissions": [
    "activeTab",
    "scripting",
    "tabs"
  ],
  "host_permissions": [
    "https://*.uniswap.org/*",
    "https://*.sushiswap.fi/*",
    "https://*.curve.fi/*"
  ]
}
```

### sidebar.js (Add this function)
```javascript
// Monitor current website
async function updateWebsiteContext() {
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    if (!tabs[0]) return;

    const url = tabs[0].url;

    // Parse context
    const context = {
      platform: detectPlatform(url),
      fromToken: getTokenFromUrl(url, 'inputCurrency'),
      toToken: getTokenFromUrl(url, 'outputCurrency')
    };

    // Show in sidebar
    if (context.platform !== 'Unknown DeFi Platform') {
      document.getElementById('contextPanel').style.display = 'block';
      document.getElementById('contextPlatform').textContent = context.platform;

      if (context.fromToken) {
        // Analyze the tokens
        const fromAnalysis = await analyzeAddress(context.fromToken);
        const toAnalysis = await analyzeAddress(context.toToken);

        document.getElementById('contextAnalysis').innerHTML = `
          <h4>${context.platform} Context</h4>
          <div>From: ${context.fromToken}</div>
          <div>${fromAnalysis.verdict}</div>
          <div>To: ${context.toToken}</div>
          <div>${toAnalysis.verdict}</div>
        `;
      }
    } else {
      document.getElementById('contextPanel').style.display = 'none';
    }
  });
}

// Run when sidebar opens
document.addEventListener('DOMContentLoaded', () => {
  updateWebsiteContext();

  // Update context when user switches tabs
  chrome.tabs.onActivated.addListener(() => {
    updateWebsiteContext();
  });
});

// Helper functions
function detectPlatform(url) {
  if (url.includes('uniswap.org')) return 'Uniswap';
  if (url.includes('sushiswap')) return 'SushiSwap';
  if (url.includes('curve.fi')) return 'Curve';
  return 'Unknown DeFi Platform';
}

function getTokenFromUrl(url, paramName) {
  const parsedUrl = new URL(url);
  return parsedUrl.searchParams.get(paramName);
}
```

---

## Real Demo: What the User Sees

### Scenario: User Opens Extension on Uniswap

**User is here:**
```
https://uniswap.org/swap?inputCurrency=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&outputCurrency=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
```

**User clicks extension icon, sidebar shows:**

```
═══════════════════════════════════════════════════════════════
                       SYNTHX ADVISOR
═══════════════════════════════════════════════════════════════

🦄 Uniswap Detected!

💡 Current Context:
├─ Platform: Uniswap
├─ From Token: USDC (0xA0b86...)
├─ To Token: WETH (0xC02aa...)
└─ Swap Type: Stablecoin → ETH

📊 Token Analysis:
USDC:
  Status: ✅ SAFE (Centralized stablecoin)
  Holder: Circle
  Verified: Yes
  Risk Score: 5/100

WETH:
  Status: ✅ SAFE (Wrapped Ethereum)
  Verified: Yes
  Risk Score: 0/100

💰 Swap Guidance:
1. Enter amount of USDC on Uniswap
2. Review the exchange rate
3. Check slippage (should be <1%)
4. Click "Swap" on Uniswap
5. Confirm transaction in MetaMask
6. Done!

⚠️ Warnings: None - This is a safe swap

═══════════════════════════════════════════════════════════════
```

**User thinks:** "Wow, my extension knows exactly what I'm doing and is helping me!"

---

## The Key Insight

**Your extension doesn't need to control the swap.**

It just needs to:
1. Know what the user is doing (platform + tokens)
2. Analyze if it's safe
3. Guide them through it
4. Warn if it's a scam

**That's way more valuable** because:
- ✅ No fragile message passing
- ✅ No sandbox issues
- ✅ Actually prevents losses
- ✅ User maintains control

---

## Summary: How Context Works

| Method | Works? | Example |
|--------|--------|---------|
| Get current URL | ✅ YES | `uniswap.org/swap?from=X&to=Y` |
| Parse URL params | ✅ YES | Extract token addresses |
| Detect platform | ✅ YES | "User is on Uniswap" |
| Get page title | ✅ YES | "Uniswap - Decentralized Protocol" |
| Get text content | ✅ PARTIAL | Works but outdated |
| Get form inputs | ❌ NO | React hides them |
| Get React state | ❌ NO | Sandbox blocks access |
| Get real-time data | ❌ NO | You need to fetch from APIs |

---

## What To Build

**Start with this:**
```javascript
1. Get current tab URL
2. Detect which DEX (Uniswap/Sushiswap/etc)
3. Extract token addresses from URL
4. Analyze both tokens with Claude + Blockscout
5. Show analysis in sidebar
6. Add "Swap Guidance" button
7. When clicked, show step-by-step guide

Time: 3-4 hours
Works: 100%
Value: Users see risk BEFORE they swap
```

This is actually better than auto-execution because it prevents mistakes instead of executing them.

---

## The Real Answer to Your Question

**"How does extension get context from current website?"**

**Answer:**
1. Get the URL of the page the user is on
2. Parse the URL to extract information (platform, tokens, etc)
3. Use that to provide analysis + guidance
4. Show it in sidebar

**That's it.** No magic. Just URL parsing + analysis.

And it's actually more useful than trying to execute, because users stay in control.

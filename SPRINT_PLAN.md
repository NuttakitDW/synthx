# ⚡ SynthX Sprint Plan - Building the Real Product

## Overview: 3 Sprints to Product-Market Fit

This is a realistic sprint plan for getting to a **Chrome Web Store-ready product** that people actually want to use.

---

## 🟢 Sprint 1: Context Awareness & Frictionless Access (4-6 hours)

**Goal:** Make SynthX the *natural* way to analyze addresses anywhere on the web.

### Features to Build:

#### 1.1 Right-Click Context Menu
**What it does:**
```
User right-clicks on any Ethereum address anywhere:
- Twitter: right-click address → "Analyze with SynthX"
- Discord: right-click address → "Analyze with SynthX"
- Email: right-click address → "Analyze with SynthX"
- Etherscan: right-click address → "Analyze with SynthX"

Result: Sidebar opens with analysis immediately
```

**Implementation:**
```javascript
// In manifest.json
"permissions": ["contextMenus"],

// In background.js
chrome.contextMenus.create({
  id: "analyze-address",
  title: "Analyze with SynthX",
  contexts: ["selection"],
  patterns: ["<all_urls>"]
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === "analyze-address") {
    const address = info.selectionText.trim();
    if (isValidEthereumAddress(address)) {
      chrome.runtime.openSidePanel({ windowId: chrome.windows.WINDOW_ID_CURRENT });
      // Send address to analyze
      chrome.runtime.sendMessage({
        action: "analyzeAddress",
        data: { address }
      });
    }
  }
});
```

**Effort:** 30 minutes
**Impact:** High (users never have to leave their page)

#### 1.2 Auto-Detect Addresses on Current Page
**What it does:**
```
User opens SynthX while on any page:
- Auto-detect all Ethereum addresses on page
- Show quick suggestions to analyze
- One-click analysis
```

**Implementation:**
```javascript
// In sidebar.js - on load
async function autoDetectAddresses() {
  const addresses = await chrome.tabs.sendMessage(
    tab.id,
    { action: "getPageAddresses" }
  );

  if (addresses.length > 0) {
    showSuggestions(addresses);
  }
}

// In content.js (runs in page context)
function getPageAddresses() {
  const addresses = [];
  const regex = /0x[a-fA-F0-9]{40}/g;

  // Find in page text
  const matches = document.body.innerText.match(regex);
  addresses.push(...(matches || []));

  // Find in links
  document.querySelectorAll('a[href*="0x"]').forEach(link => {
    const addr = link.href.match(/0x[a-fA-F0-9]{40}/);
    if (addr) addresses.push(addr[0]);
  });

  return [...new Set(addresses)]; // Remove duplicates
}
```

**Effort:** 30 minutes
**Impact:** High (magic moment when user sees suggestions)

#### 1.3 Quick-Scan Mode (1-Second Results)
**What it does:**
```
Instead of:
1. Get address info from Blockscout
2. Send to Claude for analysis
3. Wait 2-3 seconds

User gets:
1. Initial score in 1 second (basic checks)
2. Full analysis streams in (detailed checks)
```

**Implementation:**
```javascript
// Return quick verdict immediately
async function quickAnalyzeAddress(address) {
  // Fast checks (no API calls):
  const checks = {
    isContract: await isContractAddress(address),
    isVerified: await checkIfVerified(address),
    isKnownScam: await checkScamList(address), // Local list
  };

  // Show quick verdict
  return {
    safety_score: computeQuickScore(checks),
    verdict: "LOADING...",
    confidence: "LOW"
  };

  // Then do full analysis in background
  const fullAnalysis = await fullAnalyzeAddress(address);
  updateResults(fullAnalysis);
}
```

**Effort:** 1 hour
**Impact:** Very High (makes extension feel instant)

#### 1.4 Better UI - Sidebar Quick Actions
**What it does:**
```
Current: User has to type/paste address

New:
- Paste button (clipboard auto-fill)
- Recent addresses (quick access)
- Suggested addresses from page (one-click)
- History (what did you check yesterday?)
```

**HTML Changes:**
```html
<div id="scanSection">
  <div class="input-group">
    <input id="addressInput" placeholder="0x... or paste here" />
    <button id="pasteBtn">📋 Paste</button>
    <button id="scanBtn">🔍 Scan</button>
  </div>

  <div id="suggestionsPanel">
    <h4>Found on page:</h4>
    <div id="pageAddressesList"></div>
  </div>

  <div id="recentAddresses">
    <h4>Recent:</h4>
    <div id="recentList"></div>
  </div>
</div>
```

**Effort:** 1 hour
**Impact:** High (UX polish makes it feel professional)

### Sprint 1 Summary:
| Feature | Time | Impact | Dependency |
|---------|------|--------|------------|
| Context menu | 30m | Very High | content.js |
| Auto-detect | 30m | High | content.js |
| Quick-scan | 1h | Very High | Background |
| UI Polish | 1h | High | UI |
| **Total** | **3h** | **Killer** | **None** |

**Outcome:** Extension feels native to browser, zero friction to use.

---

## 🟡 Sprint 2: Background Monitoring & Alerts (5-7 hours)

**Goal:** Make SynthX your 24/7 security guard.

### Features to Build:

#### 2.1 Watch List
**What it does:**
```
User clicks "Watch this address":
- Address added to watch list
- Extension monitors it 24/7
- Stores in Chrome storage (synced across devices)
- Customizable alerts
```

**Implementation:**
```javascript
// In sidebar.js
async function addToWatchList(address) {
  const watchList = await chrome.storage.local.get('watchList');
  const addresses = watchList.watchList || [];

  if (!addresses.includes(address)) {
    addresses.push(address);
    await chrome.storage.local.set({
      watchList: addresses,
      [`metadata_${address}`]: {
        addedAt: new Date(),
        alerts: {
          scamDetected: true,
          largeTransfer: true,
          holderDump: true,
        }
      }
    });
  }
}
```

**Effort:** 1 hour
**Impact:** High (users feel protected)

#### 2.2 Background Monitoring Script
**What it does:**
```
Every hour:
1. Check each watched address
2. Re-analyze with Claude
3. Compare to previous state
4. If something changed: alert user
```

**Implementation:**
```javascript
// In background.js
chrome.alarms.create('monitorWatchList', { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'monitorWatchList') {
    const { watchList } = await chrome.storage.local.get('watchList');

    for (const address of watchList) {
      const previous = await chrome.storage.local.get(`analysis_${address}`);
      const current = await analyzeAddress(address);

      // Check if something changed
      if (hasRiskIncreased(previous, current)) {
        notifyUser(address, current);
      }

      // Store for comparison
      await chrome.storage.local.set({
        [`analysis_${address}`]: current
      });
    }
  }
});
```

**Effort:** 2 hours
**Impact:** Very High (this is what makes extension special)

#### 2.3 Smart Notifications
**What it does:**
```
Extension sends browser notifications for:
- 🔴 New scam pattern detected
- ⚠️ Holder concentration increased 20%+
- 💀 Address linked to known scam
- 📉 Token in your watch list dropped 50%+
- 🐋 Whale holder just transferred large amount
```

**Implementation:**
```javascript
// Detect what changed and notify
function shouldNotify(previous, current) {
  const alerts = [];

  // Verdict changed?
  if (previous.verdict !== current.verdict && current.verdict !== 'SAFE') {
    alerts.push(`⚠️ Status changed to ${current.verdict}`);
  }

  // Risk increased?
  if (current.safety_score < previous.safety_score - 10) {
    alerts.push(`📉 Risk increased (${previous.safety_score} → ${current.safety_score})`);
  }

  // New risks detected?
  const newRisks = current.risks.filter(
    r => !previous.risks.includes(r)
  );
  if (newRisks.length > 0) {
    alerts.push(`🚨 ${newRisks[0]}`);
  }

  return alerts;
}

// Send notification
function notifyUser(address, analysis, alerts) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: getIcon(analysis.verdict),
    title: `${analysis.verdict} - ${shortenAddress(address)}`,
    message: alerts[0], // Show first alert
    priority: 2,
    buttons: [
      { title: 'View Details' },
      { title: 'Remove from Watch' }
    ]
  });
}
```

**Effort:** 1.5 hours
**Impact:** Very High (notifications keep users engaged)

#### 2.4 Watch List UI
**What it does:**
```
New tab in sidebar: "⏰ Monitoring"

Shows:
- All watched addresses
- Last check time
- Current verdict
- Change since last check
- Remove button
- Alert settings (custom per address)
```

**HTML:**
```html
<div id="monitoringTab">
  <h3>⏰ Monitoring</h3>

  <div id="watchList">
    <!-- Auto-populated -->
  </div>

  <template id="watchListItem">
    <div class="watch-item">
      <div class="address-header">
        <span class="verdict-icon">🟢</span>
        <span class="address">0x...</span>
        <span class="last-check">2m ago</span>
      </div>
      <div class="status">
        Safe (87/100)
      </div>
      <div class="change">
        No change since last check
      </div>
      <div class="actions">
        <button class="settings">⚙️</button>
        <button class="remove">✕</button>
      </div>
    </div>
  </template>
</div>
```

**Effort:** 1.5 hours
**Impact:** High (makes feature visible and manageable)

### Sprint 2 Summary:
| Feature | Time | Impact | Dependency |
|---------|------|--------|------------|
| Watch List | 1h | High | Storage |
| Background Monitor | 2h | Very High | Alarms API |
| Notifications | 1.5h | Very High | Blockscout |
| Watch UI | 1.5h | High | UI |
| **Total** | **6h** | **Game-Changer** | **None** |

**Outcome:** Extension now works 24/7, feels like personal security guard.

---

## 🔴 Sprint 3: Portfolio Guardian (6-8 hours)

**Goal:** Make SynthX the dashboard users check every morning.

### Features to Build:

#### 3.1 MetaMask Wallet Detection
**What it does:**
```
When user has MetaMask installed:
- Auto-detect their wallet address
- Ask permission: "Monitor your portfolio?"
- Show all holdings in one place
```

**Implementation:**
```javascript
// In content.js
window.addEventListener('ethereum', () => {
  const provider = window.ethereum;
  provider.request({ method: 'eth_accounts' })
    .then(accounts => {
      chrome.runtime.sendMessage({
        action: 'walletDetected',
        wallet: accounts[0]
      });
    });
});

// In sidebar.js
async function checkForWallet() {
  const accounts = await chrome.tabs.sendMessage(
    tab.id,
    { action: 'getMetaMaskAccounts' }
  );

  if (accounts && accounts.length > 0) {
    showWalletOption(accounts[0]);
  }
}
```

**Effort:** 1 hour
**Impact:** High (magic moment - extension knows user's wallet)

#### 3.2 Holdings Dashboard
**What it does:**
```
Shows:
- All tokens user owns
- Current value (if available)
- Risk score for EACH token
- Total portfolio risk
- Holdings timeline (when did you buy?)
```

**Using Blockscout APIs:**
```
getTokensByAddress() → List of tokens
get_address_info() → Balance info
get_token_transfers_by_address() → Buy/sell history
```

**Implementation:**
```javascript
async function getPortfolioData(walletAddress) {
  // Get all tokens
  const tokens = await blockscoutClient.getTokensByAddress(walletAddress);

  // Analyze each token
  const portfolio = [];
  for (const token of tokens) {
    const analysis = await analyzeAddress(token.contractAddress);

    portfolio.push({
      symbol: token.symbol,
      balance: token.balance,
      value: token.balance * token.exchangeRate, // If available
      risk: analysis.safety_score,
      verdict: analysis.verdict,
    });
  }

  // Calculate total risk
  const totalRisk = calculatePortfolioRisk(portfolio);

  return { portfolio, totalRisk };
}
```

**Effort:** 2 hours
**Impact:** Very High (becomes essential daily use)

#### 3.3 Portfolio Risk Scoring
**What it does:**
```
Overall portfolio verdict:
- Green portfolio: All holdings are safe
- Yellow portfolio: Some risky holdings, be careful
- Red portfolio: You're holding honeypots, get out
```

**Algorithm:**
```javascript
function calculatePortfolioRisk(holdings) {
  const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);
  const riskWeighted = holdings.reduce((sum, h) => {
    return sum + (h.risk * h.value / totalValue);
  }, 0);

  // Risk score is weighted average
  return {
    portfolio_score: Math.round(riskWeighted),
    verdict: riskWeighted > 70 ? 'SAFE' :
             riskWeighted > 40 ? 'RISKY' : 'SCAM',
    risky_holdings: holdings.filter(h => h.verdict !== 'SAFE'),
    estimated_loss: holdings
      .filter(h => h.verdict === 'SCAM')
      .reduce((sum, h) => sum + h.value, 0)
  };
}
```

**Effort:** 1 hour
**Impact:** High (tells user exactly what they need to know)

#### 3.4 Portfolio Dashboard UI
**What it does:**
```
New "💼 Portfolio" tab showing:
- Overall risk meter
- Holdings list (token → amount → risk score)
- Red flags (honeypots detected, whale concentration, etc)
- Recommended actions ("Consider selling [token]")
```

**HTML:**
```html
<div id="portfolioTab">
  <div class="portfolio-header">
    <h3>💼 Your Portfolio</h3>
    <span class="last-update">Updated 2m ago</span>
  </div>

  <div class="portfolio-overview">
    <div class="risk-meter">
      <div class="meter" style="--risk: 45%">
        <span class="label">Moderate Risk</span>
      </div>
    </div>
    <div class="stats">
      <div class="stat">
        <span class="label">Safe Holdings</span>
        <span class="value">12 tokens</span>
      </div>
      <div class="stat">
        <span class="label">Risky Holdings</span>
        <span class="value">3 tokens</span>
      </div>
      <div class="stat">
        <span class="label">Total Value</span>
        <span class="value">$2,450</span>
      </div>
    </div>
  </div>

  <div class="holdings-list">
    <h4>Your Holdings</h4>
    <!-- Auto-populated -->
  </div>

  <div class="alerts">
    <h4>⚠️ Red Flags</h4>
    <!-- Auto-populated -->
  </div>
</div>
```

**Effort:** 2 hours
**Impact:** Very High (becomes reason to open extension daily)

#### 3.5 Smart Recommendations
**What it does:**
```
AI-powered suggestions:
- "You hold $500 of [HONEYPOT]. This is a high-risk scam. Consider exiting."
- "[TOKEN] has whale concentration (top holder owns 40%). High rug risk."
- "3 of your tokens disappeared from Blockscout. They may be delisted (scams)."
```

**Implementation:**
```javascript
async function generateRecommendations(portfolio) {
  const recommendations = [];

  for (const holding of portfolio) {
    if (holding.verdict === 'SCAM') {
      recommendations.push({
        type: 'sell',
        token: holding.symbol,
        reason: 'Confirmed scam pattern',
        urgency: 'high',
        amount: holding.value
      });
    }

    if (holding.analysis.risks.includes('whale_concentration')) {
      recommendations.push({
        type: 'reduce',
        token: holding.symbol,
        reason: 'High rug pull risk',
        urgency: 'medium',
      });
    }
  }

  return recommendations;
}
```

**Effort:** 1.5 hours
**Impact:** Very High (actionable advice, prevents losses)

### Sprint 3 Summary:
| Feature | Time | Impact | Dependency |
|---------|------|--------|------------|
| Wallet Detection | 1h | High | MetaMask |
| Holdings Dashboard | 2h | Very High | Blockscout |
| Risk Scoring | 1h | High | Analysis |
| Portfolio UI | 2h | Very High | UI |
| Recommendations | 1.5h | Very High | Claude |
| **Total** | **7.5h** | **Killer** | **None** |

**Outcome:** Extension becomes essential daily tool.

---

## 📊 Complete Sprint Timeline

```
Week 1 - Sprint 1 (3 hours implementation + 1 hour testing)
├── Right-click context menu ✅
├── Auto-detect addresses ✅
├── Quick-scan mode ✅
└── UI polish ✅
Result: "Click anywhere, get instant analysis"

Week 2 - Sprint 2 (6 hours implementation + 1 hour testing)
├── Watch list ✅
├── Background monitoring ✅
├── Smart notifications ✅
└── Watch list UI ✅
Result: "24/7 security guard"

Week 3 - Sprint 3 (7.5 hours implementation + 1.5 hours testing)
├── Wallet detection ✅
├── Holdings dashboard ✅
├── Portfolio risk scoring ✅
├── Portfolio UI ✅
└── Recommendations ✅
Result: "Daily-use essential tool"

Total: ~20 hours implementation + 3.5 hours testing = 23.5 hours
Reality: ~30-40 hours with debugging, polish, and edge cases
```

---

## 🎯 What This Achieves

### After Sprint 1:
- ✅ Zero-friction address analysis anywhere
- ✅ Feels native to browser
- ✅ Fast enough (1-second quick results)
- **User:** "This is how Etherscan should work"

### After Sprint 2:
- ✅ 24/7 protection against scams
- ✅ Proactive alerts (doesn't require user action)
- ✅ Personalized (knows what user cares about)
- **User:** "This saved me from getting scammed"

### After Sprint 3:
- ✅ Daily essential tool
- ✅ Comprehensive portfolio view
- ✅ Actionable intelligence
- ✅ Prevents emotional mistakes
- **User:** "I won't trade without SynthX"

---

## 🚀 Chrome Web Store Ready

After all 3 sprints, you have:

```
✅ Useful (solves real problem)
✅ Unique (nobody else does this)
✅ Reliable (Blockscout API is stable)
✅ Beautiful (polished UI)
✅ Safe (read-only, no signing)
✅ Fast (quick analysis)
✅ Smart (AI-powered)
```

**Chrome Web Store Listing:**
```
Title: SynthX - Web3 Scam Detector

Description:
Never get scammed in crypto again. SynthX analyzes tokens,
wallets, and contracts in real-time with AI-powered safety
scoring. Right-click any address for instant analysis.
Monitor your portfolio 24/7 and get alerts before you lose money.

Category: Productivity
Rating: 4.7+ stars
Downloads: 10,000+ (realistic goal)
```

---

## 💰 Post-Launch Monetization Ideas

After you have 10,000+ users:

### Free Tier:
- Basic token safety scanning
- 3 watched addresses
- Daily notifications only

### Pro Tier ($4.99/month):
- Unlimited watched addresses
- Hourly monitoring instead of daily
- Advanced portfolio analytics
- Custom alerts
- Multi-chain support

### Enterprise (For projects):
- API access to SynthX scoring
- White-label solution
- Custom integration

---

## TL;DR

This is the plan to turn SynthX from "cool demo" into "essential product."

**The key insight:** The extension format isn't a limitation - it's the whole product.

**Sprint 1:** Makes it frictionless (right-click anywhere)
**Sprint 2:** Makes it protective (24/7 monitoring)
**Sprint 3:** Makes it essential (daily portfolio tool)

**By end:** You have a real product that solves real problems.

Ready to build? 🚀

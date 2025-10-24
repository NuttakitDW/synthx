# SynthX - Web3 Intelligence Extension

AI-powered blockchain intelligence powered by Blockscout MCP.

## What is SynthX?

SynthX is a Chrome extension that provides intelligent blockchain analysis using:
- **Claude AI** for smart analysis and insights
- **Blockscout MCP** for reliable, real blockchain data
- **Your browser** for everything (secure, private, no servers)

## Features (Current: v1.0.0)

### 🔍 Address Scanner
Analyze any Ethereum address (token, wallet, or contract) for safety:
- AI-powered risk assessment
- Safety scoring (0-100)
- Specific risk identification
- **Result:** 🟢 SAFE / 🟡 RISKY / 🔴 SCAM with confidence levels

**What we scan:**
- Smart contracts and tokens
- Wallets and addresses
- Holder distribution
- Transaction history
- Verification status

---

## Removed Features

**Trade/Swap Execution (Removed - v1.0.0)**
- Reason: Unreliable browser extension architecture
- Better alternative: Use Uniswap.org directly
- Focus: Shifted to analysis and intelligence (what we're good at)

## Installation & Setup

### 1. Prerequisites
- Chrome browser (Manifest V3)
- Claude API key (get at https://console.anthropic.com)
- MetaMask (optional, for wallet analysis)

### 2. Install Extension

```bash
# Clone or download SynthX
cd synthx

# Copy environment template
cp .env.example .env

# Edit .env and add your Claude API key
# CLAUDE_API_KEY=sk-ant-YOUR_KEY_HERE
```

### 3. Load in Chrome

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `synthx` folder
5. Extension should appear in your toolbar

### 4. Configure API Key

1. Click SynthX icon
2. Click ⚙️ Settings
3. Enter your Claude API key (starts with `sk-ant-`)
4. Select blockchain (Ethereum Mainnet or Sepolia)
5. Click **Save Settings**

## How to Use

### Address Scanner

1. Click SynthX icon
2. In the **🔍 Scan** tab, paste any Ethereum address
3. Click **Scan**
4. View risk assessment: Safety score, verdict, specific risks

**Example addresses to test:**
- USDC: `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` (should be SAFE)
- Vitalik: `0xd8dA6BF26964aF9D7eEd9e03E53415D37AA96045` (should be SAFE)


## Testing Checklist

### ✅ Phase 1: Extension Loads

- [ ] Extension appears in `chrome://extensions/`
- [ ] No errors in extension details
- [ ] Click extension icon → Sidebar opens
- [ ] UI displays correctly (dark theme)
- [ ] Status bar shows "SynthX Ready" ✓

### ✅ Phase 2: Configuration

- [ ] Click Settings (⚙️ button)
- [ ] Enter Claude API key
- [ ] Select blockchain
- [ ] Click Save Settings
- [ ] Settings saved and retrieved correctly

### ✅ Phase 3: Address Scanner

- [ ] Click "🔍 Scan" tab
- [ ] Enter USDC token address
- [ ] Click Scan
- [ ] Loading spinner appears (2-3 seconds)
- [ ] Result displays with verdict (should be SAFE), score, risks
- [ ] Confidence level displayed

### ✅ Phase 4: Error Handling

- [ ] Invalid address → shows error message
- [ ] No API key → shows helpful error
- [ ] No active tab → shows helpful error
- [ ] Network error → graceful handling

## Testing with Real Data

### Test Token Addresses (Ethereum Mainnet)

**Safe Tokens:**
```
USDC:    0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
WETH:    0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
DAI:     0x6B175474E89094C44Da98b954EedeAC495271d0F
USDT:    0xdAC17F958D2ee523a2206206994597C13D831ec7
```

**Test Wallets:**
```
Vitalik:  0xd8dA6BF26964aF9D7eEd9e03E53415D37AA96045
Uniswap:  0x1111111254fb6c44bac0bed2854e76f90643097d
```

## Debugging

### View Extension Logs

1. Right-click SynthX → **Inspect popup**
2. Or: `chrome://extensions/` → Extension Details → Inspect service worker
3. Check **Console** for logs starting with `[Background]`, `[UI]`

### Common Issues

| Issue | Solution |
|-------|----------|
| Extension not running | Reload: chrome://extensions/ → Refresh |
| API key error | Check key starts with `sk-ant-` |
| No data from Blockscout | Try another address, verify chain |
| Blank sidebar | Hard refresh: Right-click → Reload |

## Project Structure

```
synthx/
├── manifest.json                 # Extension config (Manifest V3)
├── background.js                 # Service worker (message handler)
├── sidebar.html                  # UI structure
├── sidebar.css                   # Styling
├── sidebar.js                    # UI logic
├── utils/
│   ├── blockscout-client.js     # Blockscout API client
│   └── claude-client.js          # Claude AI client
├── components/
│   ├── token-safety.js           # Token safety analyzer
│   └── wallet-analyzer.js        # Wallet analyzer
├── .env.example                  # Environment template
├── BLOCKSCOUT_ROADMAP.md         # 5-phase feature plan
└── README.md                     # This file
```

## Next Steps (Blockscout MCP Roadmap)

For detailed feature roadmap with effort estimates, see **BLOCKSCOUT_ROADMAP.md**

### Phase 1: Enhanced Scanner (2-3 hours)
- Better token contract details display
- Holder distribution analysis
- Recent transaction activity
- Contract verification status

### Phase 2: Portfolio Dashboard (4-5 hours)
- Wallet address analysis
- Token holdings with values
- NFT detection
- Transaction history

### Phase 3: Transaction Analyzer (3-4 hours)
- Analyze transaction hashes
- Decode contract interactions
- Show token transfers
- Plain English explanation of what happened

### Phase 4: Scam Detector (6-8 hours)
- Honeypot detection
- Rug pull risk assessment
- Whale concentration analysis
- Contract code review

### Phase 5: Market Analyzer (6-8 hours)
- Historical holder trends
- Trading volume analysis
- Activity spike detection
- Timeline visualization

## Security

✅ **API keys** stored locally only (Chrome storage)
✅ **Read-only analysis** - Blockscout data only, no blockchain writes
✅ **No wallet access** - Extension only reads blockchain data
✅ **No transaction signing** - Cannot execute any transactions
✅ **Open source** - All code transparent and auditable

## Testing Workflow

1. **Fresh Install**
   - Delete old extension
   - Clear Chrome storage
   - Reload unpacked

2. **Configuration**
   - Add Claude API key
   - Select chain

3. **Test Analysis**
   - Token Safety: Try USDC address
   - Wallet Analysis: Try Vitalik's address

4. **Check Console**
   - F12 → Console → Look for errors
   - Background worker: chrome://extensions/ → Inspect service worker

## Support

For issues or feedback:
- Check CLAUDE.md for project context
- Review console logs
- Verify API key validity
- Test with known-good addresses first

---

**Status:** v1.0.0 - Analysis-Focused, Blockscout MCP-Powered
**Last Updated:** 2025-10-24
**Next Phase:** Enhanced Scanner (Phase 1 of BLOCKSCOUT_ROADMAP.md)

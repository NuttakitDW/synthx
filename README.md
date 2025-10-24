# SynthX - Web3 Intelligence Extension

AI-powered blockchain intelligence and safety analysis for DeFi users.

## What is SynthX?

SynthX is a Chrome extension that provides real-time insights about tokens and wallets using:
- **Claude AI** for intelligent analysis
- **Blockscout** for blockchain data
- **Your browser** for everything else (secure, private, no servers)

## Features (MVP v0.1)

### 🔍 Token Safety Score
Analyze any Ethereum token for scam/honeypot risks:
- Contract verification status
- Holder concentration
- Transaction activity
- AI-powered risk assessment
- **Result:** 🟢 SAFE / 🟡 RISKY / 🔴 SCAM

### 💼 Wallet Analyzer
Understand your trading performance:
- Win/loss ratio
- Most profitable token pairs
- Trading patterns and risks
- Personalized recommendations

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

### Token Safety Score

1. Click SynthX icon
2. Paste any Ethereum token address
3. Click **Analyze**
4. View risk assessment: Safety score, verdict, specific risks

**Example tokens to test:**
- USDC: `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` (should be SAFE)
- WETH: `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2` (should be SAFE)

### Wallet Analyzer

1. Click SynthX icon
2. Select **Wallet Analyzer** tab
3. Paste your wallet address
4. Click **Analyze**
5. View trading statistics and recommendations

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

### ✅ Phase 3: Token Safety Analysis

- [ ] Enter valid token address
- [ ] Click Analyze
- [ ] Loading spinner appears (2-3 seconds)
- [ ] Result displays with verdict, score, risks
- [ ] Different results for safe vs scam tokens

### ✅ Phase 4: Wallet Analysis

- [ ] Enter valid wallet address
- [ ] Click Analyze
- [ ] Result displays win rate, trades, recommendations
- [ ] Console shows no critical errors

### ✅ Phase 5: Error Handling

- [ ] Invalid address → shows error message
- [ ] No API key → shows helpful error
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
├── manifest.json                 # Extension config
├── config.js                     # Settings
├── background.js                 # Service worker
├── sidebar.html                  # UI
├── sidebar.css                   # Styling
├── sidebar.js                    # Logic
├── content.js                    # Content script
├── utils/
│   ├── blockscout-client.js     # Blockscout API
│   └── claude-client.js          # Claude API
├── components/
│   ├── token-safety.js           # Token analyzer
│   └── wallet-analyzer.js        # Wallet analyzer
├── .env.example                  # Environment template
└── README.md                     # This file
```

## Next Steps (Roadmap)

### v0.2
- [ ] MEV/Sandwich detection
- [ ] Trading Coach
- [ ] Token holder tracking

### v0.3
- [ ] Multi-chain support
- [ ] Portfolio tracking
- [ ] Notifications

### v1.0
- [ ] Security audit
- [ ] Chrome Web Store
- [ ] Advanced analytics

## Security

✅ **API keys** stored locally only (Chrome storage)
✅ **No wallet access** - MetaMask manages transactions
✅ **Read-only** - cannot sign transactions
✅ **Open source** - all code transparent

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

**Status:** MVP v0.1 - Ready for Testing
**Last Updated:** 2025-10-24

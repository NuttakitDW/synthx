# SynthX - Web3 Intelligence Extension

AI-powered blockchain intelligence and safety analysis for DeFi users.

## What is SynthX?

SynthX is a Chrome extension that provides real-time insights about tokens and wallets using:
- **Claude AI** for intelligent analysis
- **Blockscout** for blockchain data
- **Your browser** for everything else (secure, private, no servers)

## Features (MVP v0.1)

### 🔍 Address Scanner
Analyze any Ethereum address (token, wallet, or contract) for safety:
- Contract verification status
- AI-powered risk assessment
- Detailed risk explanations
- **Result:** 🟢 SAFE / 🟡 RISKY / 🔴 SCAM with confidence levels

### 💱 Trade (Uniswap V3 on Sepolia Testnet)
Execute token swaps directly from the extension:
- Get real-time swap quotes
- Preview transaction details (gas cost, slippage, price impact)
- Execute swaps via MetaMask
- View transactions on Sepolia Etherscan
- **Testnet only** - Safe for testing

**Note:** Trade feature is in MVP stage with mock quotes for testing. Real swap execution requires:
- MetaMask installed and configured for Sepolia
- Test ETH from a faucet
- Active browser tab during swap execution

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

### Trade Tokens (Sepolia Testnet)

1. Click SynthX icon
2. In the **💱 Trade** tab, enter:
   - From Token: Token address to swap from
   - Amount: How much to swap
   - To Token: Token address to swap to
   - Platform: Uniswap V3 (default)

3. Click **Get Quote** to see estimated output
4. Review swap preview (gas cost, slippage, price impact)
5. Click **Execute Swap**
6. MetaMask popup appears → Click **Confirm**
7. View transaction on Sepolia Etherscan

**Test tokens on Sepolia:**
- WETH: `0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14`
- USDC: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`

For detailed testing instructions, see **TRADE_TESTING.md**

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

### ✅ Phase 4: Trade Feature (MVP)

- [ ] Click "💱 Trade" tab
- [ ] Tab navigation works smoothly
- [ ] Fill in From Token, Amount, To Token
- [ ] Click "Get Quote"
- [ ] Loading spinner appears
- [ ] Swap preview displays with mock values
- [ ] "Execute Swap" button becomes enabled

### ✅ Phase 5: MetaMask Integration

- [ ] Have MetaMask installed
- [ ] MetaMask set to Sepolia testnet
- [ ] Have test ETH available
- [ ] Try to execute swap with active browser tab open
- [ ] MetaMask popup should appear
- [ ] Can see transaction details

### ✅ Phase 6: Error Handling

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

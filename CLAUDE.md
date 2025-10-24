# SynthX - Blockscout-Powered Web3 Intelligence Extension

## Project Overview
**Name:** SynthX - AI-Powered Web3 Safety & Intelligence Extension
**Goal:** Build a Chrome extension that uses Claude AI + Blockscout MCP to provide real-time blockchain intelligence and safety analysis for DeFi users
**Timeline:** 2-4 weeks to MVP
**Status:** Fresh start - Architecture defined
**Platform:** Chrome Extension (Manifest V3)

---

## Core Vision

SynthX is **not a swap executor** - it's a **blockchain intelligence layer** that works on top of existing DeFi platforms (Uniswap, OpenSea, etc.).

User opens any Web3 dapp → SynthX sidebar analyzes the blockchain data → Claude AI provides actionable insights

---

## Killer Features (MVP Priority Order)

### 🔥 Feature 1: Token Safety Score (WEEK 1)
**Solves:** Users get rugged on scam tokens daily

**What it does:**
- User pastes token address (or visits token on Uniswap)
- Extension queries Blockscout MCP for:
  - Contract verification status
  - Holder distribution (is it a honeypot? One wallet owns 95%?)
  - Transaction history (active users, volume patterns)
  - Renounced ownership status
- Claude AI analyzes and returns:
  ```
  🔴 SCAM ALERT - 98% supply owned by 1 wallet
  🟡 RISKY - New contract (3 days old), low volume
  🟢 SAFE - Verified contract, distributed holders, active trading
  ```

**Blockscout MCP Used:**
- `get_address_info()` - contract details
- `get_tokens_by_address()` - top token holders
- `get_transactions_by_address()` - activity patterns

**Implementation:** 4-6 hours

---

### 🔥 Feature 2: Wallet Analyzer (WEEK 1-2)
**Solves:** Users don't know if they're trading profitably

**What it does:**
- User clicks "Analyze My Wallet" in sidebar
- Extension gets user's wallet from MetaMask
- Queries Blockscout MCP for:
  - Full transaction history (last 3 months)
  - All token transfers (what they bought/sold)
  - Current holdings
- Claude AI analyzes:
  ```
  📊 Your Trading Analysis:
  • Total trades: 47
  • Profitable trades: 12 (25%)
  • Biggest loss: -$1,200 (sandwiched)
  • Best performer: ETH/USDC
  • Risk pattern: You trade at market peaks

  🎯 Recommendation: Wait for gas to drop below $30 gwei before trading
  ```

**Blockscout MCP Used:**
- `get_transactions_by_address()` - all txs
- `get_token_transfers_by_address()` - all token movements
- `get_tokens_by_address()` - current holdings

**Implementation:** 6-8 hours

---

### 🔥 Feature 3: MEV & Sandwich Detection (WEEK 2)
**Solves:** Users lose 0.5-5% to MEV attacks constantly

**What it does:**
- As user prepares to swap on Uniswap
- Extension analyzes the mempool/recent blocks via Blockscout
- Detects if transaction is likely to be sandwich attacked:
  ```
  ⚠️ MEV RISK DETECTED
  Current gas: $45 (HIGH)
  Slippage: 0.5% may not be enough
  Recommendation: Increase to 1.5% or wait for gas < $20
  ```

**Blockscout MCP Used:**
- `get_block_info()` - recent block transactions
- `get_transactions_by_address()` - monitoring pending swaps

**Implementation:** 6-8 hours

---

### 🔥 Feature 4: Trading Coach (WEEK 2-3)
**Solves:** Users make emotional trading decisions and lose money

**What it does:**
- Analyzes user's actual trading history (via Blockscout)
- Provides personalized AI coaching:
  ```
  📈 Your Patterns:
  • You're most profitable with ETH/USDC pairs (+8% avg)
  • You lose money on altcoins (-15% avg)
  • You trade 5x more when Bitcoin pumps
  • You hold winners only 2 days, losers 30 days

  💡 Smart Move: Focus on ETH/USDC, reduce alts, hold winners longer
  ```

**Blockscout MCP Used:**
- `get_transactions_by_address()` - historical trades
- `get_token_transfers_by_address()` - entry/exit analysis

**Implementation:** 4-6 hours

---

## Architecture

```
Chrome Browser
      ↓
┌─────────────────────────────────────┐
│    SynthX Extension Sidebar         │
│  ┌──────────────────────────────┐   │
│  │  UI Components:              │   │
│  │  - Token Safety Score        │   │
│  │  - Wallet Analyzer           │   │
│  │  - MEV Detector              │   │
│  │  - Trading Coach             │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
         ↓              ↓
   Background.js    Content.js
   (AI Logic)       (Page Detection)
         ↓              ↓
  ┌──────────────────────────┐
  │   Claude API (Sonnet)    │
  │   (Analysis + Insights)  │
  └──────────────────────────┘
         ↓
  ┌──────────────────────────┐
  │   Blockscout MCP         │
  │   (Blockchain Data)      │
  └──────────────────────────┘
```

---

## File Structure

```
synthx-extension/
├── manifest.json                  # Extension config (Manifest V3)
├── config.js                      # API keys, settings
├── background.js                  # Service worker (AI + orchestration)
├── content.js                     # Content script (page detection)
├── sidebar.html                   # Main UI
├── sidebar.js                     # UI logic + event handlers
├── sidebar.css                    # Styling
├── utils/
│   ├── blockscout-client.js      # Blockscout MCP wrapper
│   ├── claude-client.js           # Claude API wrapper
│   └── wallet-detector.js         # MetaMask detection
├── components/
│   ├── token-safety.js            # Token safety scorer
│   ├── wallet-analyzer.js         # Wallet analysis logic
│   ├── mev-detector.js            # MEV detection
│   └── trading-coach.js           # Trading recommendations
├── .env.example                   # Environment template
├── .gitignore                     # Git ignore rules
└── README.md                      # User documentation
```

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript |
| **AI** | Anthropic Claude API (claude-3-5-sonnet-20241022) |
| **Blockchain Data** | Blockscout MCP (official Anthropic tool) |
| **Wallet** | MetaMask (read-only for MVP) |
| **Networks** | Ethereum Mainnet (default), Sepolia (testing) |
| **Extension** | Chrome Manifest V3 |

---

## Development Roadmap

### Phase 1: MVP (Weeks 1-2) ✅
- [ ] Token Safety Score (Feature 1)
- [ ] Wallet Analyzer (Feature 2)
- [ ] Basic sidebar UI
- [ ] Blockscout MCP integration
- [ ] Claude API integration

### Phase 2: Enhancement (Week 3)
- [ ] MEV Detector (Feature 3)
- [ ] Trading Coach (Feature 4)
- [ ] Settings/preferences UI
- [ ] Token caching for performance

### Phase 3: Polish & Launch (Week 4)
- [ ] Error handling & edge cases
- [ ] Performance optimization
- [ ] User testing & feedback
- [ ] Chrome Web Store preparation

---

## Blockscout MCP Integration

### Key MCP Tools Used

```javascript
// Token Safety Analysis
get_address_info(chain_id, token_address)        // Contract details
get_tokens_by_address(chain_id, token_address)   // Top holders
get_transactions_by_address(chain_id, token)     // Activity history

// Wallet Analysis
get_transactions_by_address(chain_id, wallet)    // All transactions
get_token_transfers_by_address(chain_id, wallet) // Token movements
get_tokens_by_address(chain_id, wallet)          // Holdings

// MEV Detection
get_block_info(chain_id, block_number)           // Block contents
get_transaction_info(chain_id, tx_hash)          // TX details
get_transaction_logs(chain_id, tx_hash)          // Event logs
```

### Claude AI Prompts

**Token Safety Analysis:**
```
Analyze this Ethereum token for safety. Return ONLY a JSON object:
{
  "safety_score": 0-100,
  "verdict": "SCAM" | "RISKY" | "SAFE",
  "risks": ["list of red flags"],
  "reason": "concise explanation"
}

Token Data:
- Contract verified: [true/false]
- Top holder % of supply: [percent]
- Days since creation: [number]
- Active users in 30d: [number]
- Transaction volume: [amount]
```

**Wallet Trading Analysis:**
```
Analyze this trader's transaction history and return actionable insights:
{
  "win_rate": "25%",
  "most_profitable_pair": "ETH/USDC",
  "biggest_loss": "$1,200",
  "risk_patterns": ["list of observations"],
  "recommendation": "actionable advice"
}

Trading History: [list of trades with amounts, tokens, timestamps]
```

---

## How to Use (User Perspective)

1. **Install extension** → Load unpacked from chrome://extensions/
2. **Click SynthX icon** → Sidebar opens
3. **Paste token address** → See safety score instantly
4. **Click "Analyze My Wallet"** → View trading analysis
5. **Browse Uniswap** → MEV alerts appear automatically
6. **Check recommendations** → Follow trading coach suggestions

---

## MVP Success Criteria

- [ ] Token Safety Score works for any token
- [ ] Wallet Analyzer shows accurate trade analysis
- [ ] Claude API calls complete in < 2 seconds
- [ ] Blockscout MCP queries return reliable data
- [ ] Sidebar loads without errors
- [ ] No console errors in extension logs

---

## Security & Privacy

- ✅ **Read-only operations** - Extension never signs transactions
- ✅ **No private keys handled** - MetaMask manages wallets
- ✅ **No data collection** - All analysis happens client-side
- ✅ **API keys in .env** - Never committed to git
- ⚠️ **Testnet first** - Sepolia before mainnet support

---

## Environment Variables

```bash
# .env (add to .gitignore)
CLAUDE_API_KEY=sk-ant-...
BLOCKSCOUT_CHAIN_ID=1              # 1=Mainnet, 11155111=Sepolia
BLOCKSCOUT_API_BASE=https://blockscout.com/api/v2
```

---

## Git Workflow

```bash
# Fresh start
git init
git add .
git commit -m "feat: Initial SynthX architecture with Blockscout MCP integration"

# During development
git add feature-name.js
git commit -m "feat: Add token safety score analyzer"

# NO commits without permission from user
```

---

## Performance Targets

- Sidebar load: < 1 second
- Token analysis: < 2 seconds
- Wallet analysis: < 3 seconds (parallel Blockscout queries)
- MEV detection: < 1 second

---

## Next Steps

1. ✅ Define architecture (DONE)
2. ⏭️ Set up project structure
3. ⏭️ Implement Blockscout MCP wrapper
4. ⏭️ Build token safety scorer
5. ⏭️ Build wallet analyzer
6. ⏭️ Test with real data

---

**Last Updated:** 2025-10-24
**Status:** Ready for implementation
**Priority:** Token Safety Score (Feature 1) - Start here

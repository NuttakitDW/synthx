# SynthX Trade Feature - Testing Guide

## Overview

This guide walks through testing the new Trade/Swap feature added to SynthX. The feature allows users to:
- Enter token swap parameters (from token, amount, to token)
- Get a quote for the swap
- Execute the swap via MetaMask on Sepolia testnet

## Prerequisites

### 1. MetaMask Setup
- Install [MetaMask](https://metamask.io/) extension
- Create or import a wallet
- Switch to **Sepolia Testnet**
  - Click network selector → Show test networks (if not visible)
  - Select "Sepolia"

### 2. Test ETH on Sepolia
Get test ETH from a faucet:
- [Sepolia Faucet](https://sepoliafaucet.com/) - Get 0.05 ETH daily
- [Alchemy Faucet](https://www.alchemy.com/faucets/ethereum-sepolia) - Get 0.25 ETH
- [QuickNode Faucet](https://faucet.quicknode.com/ethereum/sepolia) - Get 0.1 ETH

### 3. Test USDC on Sepolia (Optional)
- Contract: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
- If you need test USDC, contact Sepolia faucet support or use a bridge

## Testing Steps

### Phase 1: Extension Setup
1. Load the extension in Chrome:
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `/Users/nuttakit/project/synthx/` folder

2. Verify the extension loads:
   - Extension icon appears in toolbar
   - Click icon → popup opens
   - Status bar shows "SynthX Ready"

3. Configure settings:
   - Click ⚙️ Settings button
   - Paste your Claude API key (sk-ant-...)
   - Keep blockchain as "Sepolia Testnet"
   - Click "Save Settings"

### Phase 2: Tab Navigation
1. Click the "💱 Trade" tab in the extension
2. Verify the trade form displays with:
   - "From Token" input
   - "Amount" input
   - "To Token" input
   - "DEX Platform" dropdown (should show "Uniswap V3")
   - "Get Quote" button

3. Click the "🔍 Scan" tab to verify it switches back
4. Click "💱 Trade" again to verify persistent state

### Phase 3: Quote Fetching
1. In the Trade tab, fill in:
   - From Token: `0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14` (WETH)
   - Amount: `0.01`
   - To Token: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` (USDC)

2. Click "Get Quote"
   - Loading spinner should appear
   - After 1-2 seconds, preview should show:
     - Expected Output: (mock value, e.g., 0.015)
     - Min Received: (with 0.5% slippage)
     - Gas Cost: ~0.01 ETH
     - Price Impact: 0.1%
   - "Execute Swap" button becomes visible

3. Try invalid inputs:
   - Leave "From Token" empty → Click Get Quote → Should error: "Please fill in all fields"
   - Enter amount as "abc" → Click Get Quote → Should error: "Please enter a valid amount"
   - Enter negative amount → Click Get Quote → Should error: "Please enter a valid amount"

### Phase 4: MetaMask Integration (WITH ACTIVE TAB)

**IMPORTANT**: The extension requires an active browser tab to execute swaps. Here's how:

1. Open any webpage (e.g., google.com) in a new tab
2. Keep that tab active (don't focus the extension)
3. Go back to extension tab and try to execute swap

This ensures the content script can communicate with MetaMask.

### Phase 5: Swap Execution (REQUIRES SEPOLIA TESTNET + TEST ETH)

**WARNING**: Only proceed if you have test ETH on Sepolia testnet and are comfortable with test transactions.

1. Ensure MetaMask is on Sepolia network with at least 0.1 ETH
2. In extension Trade tab, fill in:
   - From Token: `0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14` (WETH)
   - Amount: `0.01`
   - To Token: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` (USDC)

3. Click "Get Quote"
4. When preview shows, click "Execute Swap"
5. MetaMask should popup with transaction details
6. Click "Confirm" in MetaMask
7. In extension, you should see:
   - Loading message: "Preparing swap transaction..."
   - Success message: "✅ Swap submitted!"
   - Link to view on Sepolia Etherscan

8. Click the Etherscan link to verify the transaction

### Phase 6: Error Scenarios

#### No Active Tab
1. Close all browser tabs except the extension popup
2. Try to execute a swap
3. Should error: "No active tab found. Please open any webpage..."

#### No MetaMask
1. Disable MetaMask extension
2. Try to execute a swap
3. Should error: "MetaMask not detected"

#### Wrong Network
1. In MetaMask, switch to Ethereum Mainnet
2. Try to execute a swap
3. Should error: "Please switch to Sepolia testnet in MetaMask"

#### API Key Missing
1. Clear API key from settings
2. Try to use any feature
3. Should error: "Claude API key not configured..."

## Debugging

### Check Browser Console
The extension logs detailed information:

**Background Script Logs:**
- Right-click extension icon → Click "Inspect popup"
- Or: `chrome://extensions/` → Click "Inspect views" → "service worker"
- Look for `[Background]` logs

**Content Script Logs:**
- Open any webpage
- Press F12 to open Developer Tools
- Go to Console tab
- Look for `[Content]` and `[Injected]` logs

**UI Logs:**
- Right-click extension popup → Click "Inspect"
- Console tab shows `[UI]` logs

### Example Debug Output

```
[UI] SynthX sidebar loaded
[UI] Switched to tab: tradeTab
[UI] Getting swap quote: {from: "0xfFf...", amount: "0.01", to: "0x1c7..."}
[Background] Received message: getSwapQuote
[Background] Getting swap quote: 0.01 0xfFf... -> 0x1c7...
[UI] Swap preview displayed
```

## Test Cases Summary

| Feature | Status | Notes |
|---------|--------|-------|
| Tab navigation | ✅ Works | Switch between Scan and Trade tabs |
| Quote fetching | ✅ Works | Mock quotes display correctly |
| Input validation | ✅ Works | Errors on empty/invalid inputs |
| MetaMask detection | ✅ Works | Requires active tab + MetaMask extension |
| Wallet connection | ✅ Works | Prompts for account access |
| Network check | ✅ Works | Verifies Sepolia network |
| Swap execution | ⏳ Ready | Requires real transaction signing |
| Error handling | ✅ Works | Clear error messages |
| Etherscan linking | ✅ Ready | Link format correct |

## Known Limitations (MVP)

1. **Mock Quotes**: Currently returns mock values (1.5x conversion)
   - Real implementation needs Uniswap SDK or quoter contract

2. **No Real Swaps Yet**: Returns mock transaction hash
   - Real implementation needs:
     - ERC20 approval handling
     - Uniswap V3 swap calldata building
     - Actual transaction signing via MetaMask

3. **Token Shorthand**: Doesn't support "WETH"/"USDC" shortcuts yet
   - Must use full contract addresses

4. **Single DEX**: Only Uniswap V3 placeholder
   - Could expand to SushiSwap, Curve, etc.

## Next Steps for Production

1. **Integrate Uniswap SDK**:
   ```javascript
   import { Quoter } from '@uniswap/v3-sdk';
   // Get real prices from Uniswap
   ```

2. **Build Real Swap Calldata**:
   ```javascript
   import { SwapRouter } from '@uniswap/v3-sdk';
   // Build swap transaction
   ```

3. **Handle ERC20 Approvals**:
   ```javascript
   // Check allowance
   // Request approval if needed
   // Proceed with swap
   ```

4. **Error Recovery**:
   - Handle failed approvals
   - Handle insufficient gas
   - Handle slippage exceeded

## Questions?

If you encounter issues:
1. Check console logs (see Debugging section)
2. Verify MetaMask is on Sepolia testnet
3. Ensure you have test ETH
4. Check that extension is properly loaded

For more details, see:
- `CLAUDE.md` - Architecture and project structure
- `README.md` - Installation and usage
- `TESTING.md` - General testing guide

# SynthX Testing Guide

## Setup

1. **Get Claude API Key**
   - Go to https://console.anthropic.com/
   - Create API key (starts with `sk-ant-`)
   - Copy the full key

2. **Load Extension**
   - Open `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `synthx/` folder
   - Extension should appear in your toolbar

3. **Configure API Key**
   - Click SynthX icon in toolbar
   - Paste Claude API key into "API Key" field
   - Click "Save API Key"
   - Should see green "Extension ready" status

## Test Addresses

Use these real addresses/transactions on Ethereum Mainnet:

### Transaction (Token Swap)
```
https://eth.blockscout.com/tx/0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```
*Note: Replace with an actual recent transaction hash*

### Token (USDC)
```
https://eth.blockscout.com/token/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48
```

### Address (Vitalik)
```
https://eth.blockscout.com/address/0xd8dA6BF26964aF9D7eEd9e03E53415D37AA96045
```

## Testing Steps

### 1. Test Transaction Page
1. Go to a transaction page (e.g., a token swap on Uniswap)
2. Should see overlay appear on right side with:
   - 🧠 SynthX header
   - Loading spinner
   - "Analyzing transaction..."
3. After ~5 seconds, should see:
   - Summary of what happened
   - Key actions (token transfers, contract calls)
   - Any risks detected
   - Additional details (gas cost, etc)

### 2. Test Address Page
1. Go to any address page
2. Overlay should appear
3. Should show:
   - Summary (is it a wallet or contract?)
   - Activity patterns
   - Risk flags if any
   - Details about the address

### 3. Test Token Page
1. Go to a token page (e.g., USDC, WETH, DAI)
2. Overlay should show:
   - What the token is
   - Type (ERC-20, etc)
   - Holder count and supply
   - Any red flags

### 4. Test Q&A
1. After initial analysis loads
2. Type a question in the input box at bottom (e.g., "Is this safe?")
3. Press Enter
4. Should see loading spinner
5. After ~5 seconds, should see answer

### 5. Test Multi-chain
1. Try Sepolia testnet:
   ```
   https://sepolia.blockscout.com/address/0x...
   ```
2. Extension should detect chain automatically
3. Should fetch data from correct chain API

## Expected Behavior

✅ **Should Work**
- Overlay appears and doesn't cover important content
- Close (✕) button removes overlay
- Explanations are understandable
- Q&A responds with relevant answers
- No console errors

⚠️ **If Something's Wrong**
- Check Claude API key is valid (starts with `sk-ant-`)
- Check browser console (F12 → Console)
- Check extension background script logs:
  - Go to `chrome://extensions/`
  - Find SynthX
  - Click "Service Worker" under "Inspect"
  - Check the console

## Error Messages

| Error | Fix |
|-------|-----|
| "Claude API key not configured" | Paste API key in popup and click Save |
| "Blockscout API error 404" | Transaction/address may not exist |
| "Failed to fetch transaction" | Check Blockscout URL is correct |
| "Could not parse Claude response as JSON" | Claude API may be rate limited; try again |

## Performance

- First analysis: ~5 seconds (Claude API call)
- Follow-up Q&A: ~5 seconds each
- Overlay injection: <100ms

## What's NOT Tested Yet

- 🟡 Multi-chain detection edge cases
- 🟡 Very long transaction histories
- 🟡 Rate limiting (Claude free tier limit)
- 🟡 Offline mode
- 🟡 Extension persistence across restarts

## Troubleshooting

**Overlay not appearing:**
```javascript
// Check console
[SynthX] Content script loaded
[SynthX] Detected page: { type: 'transaction', value: '0x...', url: '...' }
```

**Overlay appears but no analysis:**
- Check background script logs
- Verify Claude API key is saved
- Check network tab for failed requests

**Q&A not working:**
- Make sure initial analysis completed
- Check that input field is visible
- Try pressing Enter after typing

## Next Steps

1. Test with 5+ different pages
2. Report any errors to console
3. Try follow-up questions on different topics
4. Test on Sepolia testnet
5. Test with slow internet (throttle to 3G)

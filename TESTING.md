# SynthX Testing Guide

Complete guide for testing the SynthX extension. Follow these steps to verify everything works.

## Pre-Testing Setup

### 1. Get Claude API Key

1. Go to https://console.anthropic.com
2. Login with your Anthropic account
3. Click **API keys** → **Create key**
4. Copy the key (starts with `sk-ant-`)
5. Keep it safe - you'll need it in step 5

### 2. Prepare Browser

```bash
# On Windows/Linux/Mac, open a fresh Chrome profile for testing
# This avoids conflicts with other extensions
```

---

## Installation & Configuration

### Step 1: Load Extension

1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top right)
4. Click **Load unpacked**
5. Navigate to `/Users/nuttakit/project/synthx/` folder
6. Click **Select Folder**

**Expected Result:**
- ✅ Extension appears in chrome://extensions/
- ✅ Shows "SynthX - Web3 Intelligence" in the list
- ✅ Icon appears in Chrome toolbar
- ✅ No error messages in extension details

**If you see errors:**
- Check manifest.json is valid JSON
- Verify all file paths exist
- Look at detailed error message in extension details

### Step 2: Open Extension

1. Click SynthX icon in toolbar
2. Sidebar popup should appear (400x600px)
3. Dark theme with blue header

**Expected:**
- ✅ Popup opens without blank screen
- ✅ Status bar shows "Checking..." then "SynthX Ready" ✓
- ✅ Two tabs visible: "Token Safety Score" and "Wallet Analyzer"
- ✅ Settings button (⚙️) visible in top right

### Step 3: Configure API Key

1. Click ⚙️ Settings button
2. Modal opens
3. Enter Claude API key (paste from step 1)
4. Keep blockchain as "Ethereum Mainnet" for now
5. Click **Save Settings**

**Expected:**
- ✅ "Settings saved!" alert appears
- ✅ Modal closes
- ✅ No errors in console (F12 → Console)

**Test API Key Validation:**
- Try empty key → Should show error
- Try wrong format (not `sk-ant-...`) → Should show error
- Try valid key → Should save successfully

---

## Feature Testing

## Phase 1: Token Safety Score

### Test 1.1: Analyze Safe Token (USDC)

**Steps:**
1. Click on **Token Safety Score** tab (should already be active)
2. Copy-paste this address: `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`
3. Click **Analyze** button
4. Wait 2-3 seconds (you'll see loading spinner)

**Expected Result:**
```
🟢 SAFE
Score: 80-100
Confidence: HIGH
Reason: "Widely used stablecoin with verified contract..."
Risks: (empty or minimal)
```

**If Analysis Fails:**
- Check API key is configured (Settings → API key field)
- Check internet connection
- Look at console for error messages
- Try again in 5 seconds

### Test 1.2: Analyze Risky/Scam Token

**Steps:**
1. Try analyzing an unknown token address
2. Example: `0x1111111254fb6c44bac0bed2854e76f90643097d`
3. Click **Analyze**

**Expected Result:**
```
🟡 RISKY or 🔴 SCAM
Score: 0-50
Risks: List of detected issues
Reason: Explanation of why it's risky
```

### Test 1.3: Invalid Address Error

**Steps:**
1. Enter: `0xnottokenaddress`
2. Click **Analyze**

**Expected Result:**
- ❌ Error message appears
- **Error text:** "Invalid Ethereum address" or similar

### Test 1.4: Caching (Optional)

**Steps:**
1. Analyze USDC again (same address as Test 1.1)
2. Notice it loads instantly (no 2-3 second wait)

**Expected Result:**
- ✅ Second analysis is instant (cached)

---

## Phase 2: Wallet Analyzer

### Test 2.1: Analyze Known Wallet (Vitalik)

**Steps:**
1. Click **Wallet Analyzer** tab
2. Paste: `0xd8dA6BF26964aF9D7eEd9e03E53415D37AA96045`
3. Click **Analyze**
4. Wait 3-5 seconds (more data to fetch)

**Expected Result:**
```
Win Rate: [percentage]
Total Trades: [number]
Profitable Pair: ETH/USDC or similar
Biggest Loss: [amount]
Recommendation: "Your trading pattern shows..."
```

### Test 2.2: Different Wallet

**Steps:**
1. Try Uniswap's address: `0x1111111254fb6c44bac0bed2854e76f90643097d`
2. Click **Analyze**

**Expected Result:**
- ✅ Different statistics than Vitalik's wallet
- ✅ Results should be reasonable for a protocol address

### Test 2.3: Invalid Wallet Address

**Steps:**
1. Enter: `0xinvalidaddress`
2. Click **Analyze**

**Expected Result:**
- ❌ Error message shown
- Text: "Invalid Ethereum address"

---

## Phase 3: Console Logging (For Developers)

### Check Background Logs

**Steps:**
1. Go to `chrome://extensions/`
2. Find SynthX extension
3. Click **Inspect service worker** (under "Service worker")
4. New window opens with Developer Tools
5. Click **Console** tab
6. Perform a token analysis
7. Watch for logs

**Expected Logs:**
```
[Background] Received message: analyzeToken
[Background] Analyzing token: 0xA0b...
[Background] API call successful
```

### Check Sidebar Logs

**Steps:**
1. Right-click SynthX popup
2. Click **Inspect**
3. Developer Tools opens
4. Click **Console** tab
5. Perform analysis
6. Watch for logs

**Expected Logs:**
```
[UI] SynthX sidebar loaded
[UI] Analyzing token: 0xA0b...
[Background] Received message: analyzeToken
```

---

## Phase 4: Performance Checks

### Test 4.1: Load Time

- **Expected:** Extension icon click → popup visible ≤ 1 second

### Test 4.2: Analysis Time

- **Token Safety:** 2-3 seconds ✅
- **Wallet Analysis:** 3-5 seconds ✅
- **Subsequent analyses (cached):** < 500ms ✅

### Test 4.3: No Console Errors

**Steps:**
1. Open both console tabs (sidebar + service worker)
2. Perform all tests
3. Search console for "Error" keyword

**Expected:** No error messages (warnings are OK)

---

## Phase 5: Edge Cases & Error Handling

### Test 5.1: No API Key

**Steps:**
1. Clear API key from settings
2. Try to analyze token

**Expected:**
- Error message appears
- Text: "Claude API key not configured"
- Settings button highlights

### Test 5.2: Network Timeout

**Steps:**
1. Turn off internet
2. Try to analyze token
3. Turn internet back on

**Expected:**
- Error message after 3-5 seconds
- Text mentions network or timeout
- Can recover by retrying

### Test 5.3: Rapid Clicking

**Steps:**
1. Analyze token
2. While loading, click Analyze multiple times

**Expected:**
- Only one request fires (button disabled during analysis)
- Clicking ignored until response arrives

### Test 5.4: Very Long Address

**Steps:**
1. Paste token address with extra characters
2. Click **Analyze**

**Expected:**
- Error: "Invalid address format"

---

## Test Data Reference

### Safe Tokens (Mainnet)
```
USDC:    0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
WETH:    0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
DAI:     0x6B175474E89094C44Da98b954EedeAC495271d0F
USDT:    0xdAC17F958D2ee523a2206206994597C13D831ec7
AAVE:    0x7Fc66500c84A76Ad7e9c93437E434122A1f3B22c
```

### Test Wallets
```
Vitalik:           0xd8dA6BF26964aF9D7eEd9e03E53415D37AA96045
Uniswap:           0x1111111254fb6c44bac0bed2854e76f90643097d
OpenSea:           0x8de9c5a032463c561423387a1546faad3d21d449
Aave Treasury:     0x464C71f6c2F760DdA6093dCB91C24c39e5d6e18c
```

---

## Debugging Checklist

If something doesn't work, check:

- [ ] API key configured? (Settings → API Key input filled)
- [ ] API key valid? (Starts with `sk-ant-` and works on console.anthropic.com)
- [ ] Extension loaded? (Appears in chrome://extensions/)
- [ ] Internet connection working? (Try opening Google)
- [ ] Console for errors? (F12 → Console → search "error")
- [ ] Valid address format? (0x followed by 40 hex characters)
- [ ] Enough API quota? (Check console.anthropic.com/account)

---

## Reporting Issues

If you find a bug:

1. **Reproduce:** Can you do it again consistently?
2. **Logs:** What do console logs show? (`[Background]`, `[UI]`)
3. **Data:** What address/wallet were you testing?
4. **Environment:** Chrome version, OS
5. **Expected vs Actual:** What should happen vs what happened?

Example bug report:
```
**Issue:** Token analysis shows blank result
**Steps:** 1. Paste USDC address 2. Click Analyze 3. Result is empty
**Expected:** Safety score should display
**Logs:** [Background] API call failed: 401 Unauthorized
**Environment:** Chrome 131, Mac
```

---

## Testing Summary Checklist

### ✅ Core Functionality
- [ ] Extension loads and appears in toolbar
- [ ] Settings button works and saves API key
- [ ] Token Safety Score analyzes tokens correctly
- [ ] Wallet Analyzer shows trading statistics
- [ ] Error messages appear for invalid inputs
- [ ] Loading states display during analysis

### ✅ Performance
- [ ] Popup opens < 1 second
- [ ] Token analysis completes in 2-3 seconds
- [ ] Wallet analysis completes in 3-5 seconds
- [ ] Second analysis on same address is instant (cache)

### ✅ Error Handling
- [ ] Missing API key shows helpful error
- [ ] Invalid address shows validation error
- [ ] Network errors handled gracefully
- [ ] No console errors appear

### ✅ User Experience
- [ ] Dark theme displays correctly
- [ ] All text is readable
- [ ] Buttons are clickable
- [ ] Modal opens and closes smoothly
- [ ] Status bar updates correctly

---

**Status:** Ready for Testing
**Last Updated:** 2025-10-24
**All features implemented and ready for user validation**

/**
 * SynthX Content Script
 *
 * Runs in the context of web pages
 * Detects blockchain data on pages and communicates with sidebar
 */

console.log('[Content] SynthX content script loaded');

// Listen for messages from sidebar
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Content] Message from sidebar:', request.action);
  // Content script acts as a bridge if needed
  // For now, most communication goes directly to background.js
  sendResponse({ received: true });
});

// Example: Detect token addresses on Uniswap
function detectTokenAddresses() {
  // This would scan the page for token addresses and notify the sidebar
  // For MVP, this is optional
  console.log('[Content] Page detection ready');
}

// Initialize
detectTokenAddresses();

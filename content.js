/**
 * SynthX Content Script
 *
 * Runs in the context of web pages
 * Bridge between background.js and injected.js
 * Handles swap execution via MetaMask
 */

console.log('[Content] SynthX content script loaded on page:', window.location.href);

/**
 * Inject dependencies and injected.js into page context
 */
function injectScripts() {
  console.log('[Content] Starting script injection...');

  // Load ethers.js first
  const ethersScript = document.createElement('script');
  ethersScript.src = 'https://cdn.ethers.io/lib/ethers-5.7.2.umd.min.js';
  ethersScript.onerror = function () {
    console.error('[Content] Failed to load ethers.js from CDN');
  };
  ethersScript.onload = function () {
    console.log('[Content] ethers.js loaded successfully');

    // Load Uniswap helper
    const helperScript = document.createElement('script');
    helperScript.src = chrome.runtime.getURL('uniswap-helper.js');
    helperScript.onerror = function () {
      console.error('[Content] Failed to load uniswap-helper.js');
    };
    helperScript.onload = function () {
      console.log('[Content] Uniswap helper loaded successfully');
      console.log('[Content] Window.UniswapHelper available:', typeof window.UniswapHelper !== 'undefined');

      // Finally load injected script
      const injectedScript = document.createElement('script');
      injectedScript.src = chrome.runtime.getURL('injected.js');
      injectedScript.onerror = function () {
        console.error('[Content] Failed to load injected.js');
      };
      injectedScript.onload = function () {
        this.remove();
        console.log('[Content] Injected script loaded into page context');
      };
      (document.head || document.documentElement).appendChild(injectedScript);
    };
    (document.head || document.documentElement).appendChild(helperScript);
  };
  (document.head || document.documentElement).appendChild(ethersScript);
}

// Inject scripts immediately
injectScripts();

// Listen for messages from background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Content] Message from background:', request.action);

  if (request.action === 'executeSwapViaMetaMask') {
    // Forward swap execution to injected script
    window.postMessage(
      {
        type: 'SYNTHX_EXECUTE_SWAP',
        payload: request.data,
      },
      '*'
    );

    // Listen for result from injected script
    const handleMessage = (event) => {
      if (event.source !== window) return;

      if (event.data.type === 'SYNTHX_SWAP_RESULT') {
        window.removeEventListener('message', handleMessage);
        sendResponse({ success: true, data: event.data.result });
      } else if (event.data.type === 'SYNTHX_SWAP_ERROR') {
        window.removeEventListener('message', handleMessage);
        sendResponse({ success: false, error: event.data.error });
      }
    };

    window.addEventListener('message', handleMessage);
    return true; // Keep channel open for async response
  }

  if (request.action === 'checkWalletStatus') {
    // Check if MetaMask is available and wallet is connected
    window.postMessage(
      {
        type: 'SYNTHX_CHECK_WALLET',
      },
      '*'
    );

    const handleMessage = (event) => {
      if (event.source !== window) return;

      if (event.data.type === 'SYNTHX_WALLET_INFO') {
        window.removeEventListener('message', handleMessage);
        sendResponse({
          success: true,
          data: { walletAddress: event.data.walletAddress },
        });
      } else if (event.data.type === 'SYNTHX_WALLET_ERROR') {
        window.removeEventListener('message', handleMessage);
        sendResponse({ success: false, error: event.data.error });
      }
    };

    window.addEventListener('message', handleMessage);
    return true;
  }

  sendResponse({ received: true });
});

console.log('[Content] SynthX content script ready');

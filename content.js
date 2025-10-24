/**
 * SynthX Content Script
 *
 * Runs in the context of web pages
 * Bridge between background.js and injected.js
 * Handles swap execution via MetaMask
 */

console.log('[Content] SynthX content script loaded');

/**
 * Inject injected.js into page context
 */
function injectScript() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('injected.js');
  script.onload = function () {
    this.remove();
  };
  (document.head || document.documentElement).appendChild(script);
  console.log('[Content] Injected script loaded into page context');
}

// Inject script immediately
injectScript();

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

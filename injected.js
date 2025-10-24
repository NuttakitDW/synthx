/**
 * SynthX Injected Script
 *
 * Runs in the web page context with access to window.ethereum
 * Handles Uniswap V3 swap execution and MetaMask interaction
 */

// Sepolia Testnet Configuration
const SEPOLIA_CONFIG = {
  chainId: '0xaa36a7', // 11155111 in hex
  chainIdDecimal: 11155111,
  rpcUrl: 'https://rpc.sepolia.org',
  uniswapRouter: '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E',
  weth: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
  usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
};

// Token ABI for ERC20 approval and transfer
const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { name: '_spender', type: 'address' },
      { name: '_value', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function',
  },
];

// Listen for messages from background.js
window.addEventListener('message', async (event) => {
  if (event.source !== window) return;

  const { type, payload } = event.data;

  if (type === 'SYNTHX_EXECUTE_SWAP') {
    try {
      console.log('[Injected] Executing swap:', payload);
      const result = await executeSwap(payload);
      window.postMessage({ type: 'SYNTHX_SWAP_RESULT', result }, '*');
    } catch (error) {
      console.error('[Injected] Swap error:', error);
      window.postMessage(
        { type: 'SYNTHX_SWAP_ERROR', error: error.message },
        '*'
      );
    }
  }

  if (type === 'SYNTHX_CHECK_WALLET') {
    try {
      const walletAddress = await checkWallet();
      window.postMessage(
        { type: 'SYNTHX_WALLET_INFO', walletAddress },
        '*'
      );
    } catch (error) {
      console.error('[Injected] Wallet check error:', error);
      window.postMessage(
        { type: 'SYNTHX_WALLET_ERROR', error: error.message },
        '*'
      );
    }
  }
});

/**
 * Check if wallet is connected and return address
 */
async function checkWallet() {
  if (!window.ethereum) {
    throw new Error('MetaMask not detected');
  }

  // Request accounts
  const accounts = await window.ethereum.request({
    method: 'eth_requestAccounts',
  });

  if (!accounts || accounts.length === 0) {
    throw new Error('No account found');
  }

  // Check if on Sepolia
  const chainId = await window.ethereum.request({ method: 'eth_chainId' });
  if (chainId !== SEPOLIA_CONFIG.chainId) {
    throw new Error(
      'Please switch to Sepolia testnet in MetaMask'
    );
  }

  return accounts[0];
}

/**
 * Execute swap transaction
 */
async function executeSwap(payload) {
  const { fromToken, toToken, amount } = payload;

  console.log('[Injected] Starting swap execution');

  // Check wallet and get address
  const walletAddress = await checkWallet();
  console.log('[Injected] Wallet address:', walletAddress);

  // Get real quote from Uniswap
  console.log('[Injected] Getting real quote from Uniswap V3...');
  const quote = await window.UniswapHelper.getUniswapQuote(fromToken, toToken, amount);
  console.log('[Injected] Quote received:', quote);

  // Build swap transaction
  const txData = await window.UniswapHelper.buildSwapTransaction(walletAddress, quote);
  console.log('[Injected] Transaction data built:', txData);

  // Send transaction via MetaMask
  const txHash = await sendSwapTransaction(walletAddress, txData);
  console.log('[Injected] Transaction hash:', txHash);

  return {
    txHash,
    walletAddress,
    quote,
  };
}

/**
 * Send real swap transaction via MetaMask
 */
async function sendSwapTransaction(walletAddress, txData) {
  if (!window.ethereum) {
    throw new Error('MetaMask not detected');
  }

  try {
    console.log('[Injected] Sending transaction to MetaMask');

    // Request account access
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });

    if (accounts[0] !== walletAddress) {
      throw new Error('Wallet address mismatch');
    }

    // Send transaction
    const txHash = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [
        {
          from: txData.from,
          to: txData.to,
          data: txData.data,
          value: txData.value || '0x0',
          gas: txData.gasLimit ? '0x' + txData.gasLimit.toString(16) : undefined,
        },
      ],
    });

    console.log('[Injected] Transaction sent, hash:', txHash);
    return txHash;
  } catch (error) {
    console.error('[Injected] Transaction error:', error);
    throw new Error(`Transaction failed: ${error.message}`);
  }
}

/**
 * Real swap execution (for future implementation)
 */
async function buildSwapTransaction(walletAddress, fromToken, toToken, amount) {
  // This would be implemented with ethers.js or Web3.js
  // 1. Parse token addresses (handle WETH/USDC shortcuts)
  // 2. Get token decimals
  // 3. Build Uniswap swap calldata
  // 4. Handle approvals for ERC20 tokens
  // 5. Send transaction to wallet

  console.log('[Injected] Building swap transaction');
  console.log('Wallet:', walletAddress);
  console.log('From:', fromToken, 'To:', toToken, 'Amount:', amount);

  return {
    to: SEPOLIA_CONFIG.uniswapRouter,
    from: walletAddress,
    value: '0x0',
    data: '0x', // Would contain actual swap calldata
    gas: '0x' + (300000).toString(16),
    gasPrice: undefined, // Let wallet estimate
  };
}

console.log('[Injected] SynthX injected script ready');

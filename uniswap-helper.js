/**
 * Uniswap V3 Helper for SynthX
 * Handles real quotes and swap execution via ethers.js
 */

// Uniswap V3 Quoter ABI (minimal - only needed functions)
const QUOTER_ABI = [
  {
    inputs: [
      { name: 'path', type: 'bytes' },
      { name: 'amountIn', type: 'uint256' },
    ],
    name: 'quoteExactInput',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

// Uniswap V3 Router ABI (minimal - only needed functions)
const ROUTER_ABI = [
  {
    inputs: [
      { name: 'params', type: 'tuple', components: [
        { name: 'path', type: 'bytes' },
        { name: 'recipient', type: 'address' },
        { name: 'deadline', type: 'uint256' },
        { name: 'amountIn', type: 'uint256' },
        { name: 'amountOutMinimum', type: 'uint256' },
      ]},
    ],
    name: 'exactInput',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function',
  },
];

const SEPOLIA_CONFIG = {
  chainId: 11155111,
  rpcUrl: 'https://rpc.sepolia.org',
  quoter: '0xEd1f6473345F45b75F1DFF1dd1086Cf047DB5465', // Uniswap V3 Quoter on Sepolia
  router: '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E', // Uniswap V3 Router on Sepolia
  weth: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
  usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
};

// ERC20 Transfer ABI
const ERC20_TRANSFER_ABI = [
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

// ERC20 Approve ABI
const ERC20_APPROVE_ABI = [
  {
    constant: false,
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

// ERC20 Allowance ABI
const ERC20_ALLOWANCE_ABI = [
  {
    constant: true,
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
];

// Token database (can expand)
const TOKEN_DB = {
  'ETH': { address: SEPOLIA_CONFIG.weth, decimals: 18, symbol: 'WETH' },
  'WETH': { address: SEPOLIA_CONFIG.weth, decimals: 18, symbol: 'WETH' },
  'USDC': { address: SEPOLIA_CONFIG.usdc, decimals: 6, symbol: 'USDC' },
};

/**
 * Get real quote from Uniswap V3 Quoter
 * @param {string} fromToken - Token symbol (ETH, USDC, etc)
 * @param {string} toToken - Token symbol
 * @param {string} amount - Amount in human-readable format (e.g., "0.01")
 * @returns {Promise<Object>} Quote with output amount
 */
async function getUniswapQuote(fromToken, toToken, amount) {
  try {
    console.log('[UniswapHelper] Getting quote for:', { fromToken, toToken, amount });

    // Get token info
    const fromTokenInfo = TOKEN_DB[fromToken.toUpperCase()];
    const toTokenInfo = TOKEN_DB[toToken.toUpperCase()];

    if (!fromTokenInfo || !toTokenInfo) {
      throw new Error(`Token not supported: ${fromToken} or ${toToken}`);
    }

    // Convert amount to smallest unit
    const amountInWei = ethers.utils.parseUnits(amount, fromTokenInfo.decimals);

    // Create provider
    const provider = new ethers.providers.JsonRpcProvider(SEPOLIA_CONFIG.rpcUrl);

    // Create quoter contract instance
    const quoter = new ethers.Contract(
      SEPOLIA_CONFIG.quoter,
      QUOTER_ABI,
      provider
    );

    // Build path: tokenA (fee) tokenB for direct pair
    // Using 3000 (0.3%) pool fee as default
    const path = ethers.utils.solidityPack(
      ['address', 'uint24', 'address'],
      [fromTokenInfo.address, 3000, toTokenInfo.address]
    );

    console.log('[UniswapHelper] Calling quoter with path:', path);

    // Get quote
    const amountOut = await quoter.quoteExactInput(path, amountInWei);
    const amountOutFormatted = ethers.utils.formatUnits(amountOut, toTokenInfo.decimals);

    console.log('[UniswapHelper] Got quote:', amountOutFormatted);

    // Calculate slippage (0.5% default)
    const slippagePercent = 0.5;
    const minAmountOut = amountOut.mul(100 - slippagePercent).div(100);
    const minAmountOutFormatted = ethers.utils.formatUnits(minAmountOut, toTokenInfo.decimals);

    // Calculate price impact (simplified - actual impact depends on pool state)
    const priceImpact = ((1 - parseFloat(amountOutFormatted) / (parseFloat(amount) * 1.0)) * 100).toFixed(2);

    return {
      fromToken,
      toToken,
      amount,
      expectedOutput: amountOutFormatted,
      minReceived: minAmountOutFormatted,
      slippagePercent,
      priceImpact: `${priceImpact}%`,
      path,
      success: true,
    };
  } catch (error) {
    console.error('[UniswapHelper] Quote error:', error);
    throw new Error(`Failed to get quote: ${error.message}`);
  }
}

/**
 * Estimate gas cost in ETH
 * @param {string} estimatedGasUnits - Estimated gas units (default 200000 for swap)
 * @returns {Promise<string>} Gas cost in ETH
 */
async function estimateGasCost(estimatedGasUnits = '200000') {
  try {
    const provider = new ethers.providers.JsonRpcProvider(SEPOLIA_CONFIG.rpcUrl);
    const gasPrice = await provider.getGasPrice();

    const gasCostWei = ethers.BigNumber.from(estimatedGasUnits).mul(gasPrice);
    const gasCostEth = ethers.utils.formatEther(gasCostWei);

    console.log('[UniswapHelper] Estimated gas cost:', gasCostEth, 'ETH');
    return gasCostEth;
  } catch (error) {
    console.error('[UniswapHelper] Gas estimate error:', error);
    return '~0.01'; // Fallback estimate
  }
}

/**
 * Check and request ERC20 approval if needed
 * @param {string} walletAddress - User's wallet address
 * @param {string} tokenSymbol - Token being spent (e.g., 'USDC')
 * @param {string} amount - Amount in human-readable format
 * @returns {Promise<Object>} Approval status and tx hash if needed
 */
async function requestTokenApprovalIfNeeded(walletAddress, tokenSymbol, amount) {
  try {
    const tokenSymbolUpper = tokenSymbol.toUpperCase();

    // ETH doesn't need approval
    if (tokenSymbolUpper === 'ETH' || tokenSymbolUpper === 'WETH') {
      return { approved: true, message: 'ETH does not require approval' };
    }

    const tokenInfo = TOKEN_DB[tokenSymbolUpper];
    if (!tokenInfo) {
      throw new Error(`Token ${tokenSymbol} not found`);
    }

    const provider = new ethers.providers.JsonRpcProvider(SEPOLIA_CONFIG.rpcUrl);
    const tokenContract = new ethers.Contract(
      tokenInfo.address,
      ERC20_ALLOWANCE_ABI,
      provider
    );

    // Check current allowance
    const amountInWei = ethers.utils.parseUnits(amount, tokenInfo.decimals);
    const currentAllowance = await tokenContract.allowance(walletAddress, SEPOLIA_CONFIG.router);

    console.log('[UniswapHelper] Current allowance:', currentAllowance.toString());
    console.log('[UniswapHelper] Amount needed:', amountInWei.toString());

    // If allowance is sufficient, no approval needed
    if (currentAllowance.gte(amountInWei)) {
      return {
        approved: true,
        message: `Already approved for ${amount} ${tokenSymbol}`,
      };
    }

    // Need approval - return approval transaction data
    const approvalABI = new ethers.utils.Interface(ERC20_APPROVE_ABI);
    const approvalData = approvalABI.encodeFunctionData('approve', [
      SEPOLIA_CONFIG.router,
      ethers.constants.MaxUint256, // Approve max amount for convenience
    ]);

    return {
      approved: false,
      requiresApproval: true,
      approvalTx: {
        to: tokenInfo.address,
        from: walletAddress,
        data: approvalData,
        gasLimit: ethers.BigNumber.from('100000'),
      },
      message: `Approval required for ${tokenSymbol}. Will request in MetaMask.`,
    };
  } catch (error) {
    console.error('[UniswapHelper] Approval check error:', error);
    throw new Error(`Failed to check approval: ${error.message}`);
  }
}

/**
 * Build swap transaction (without sending)
 * @param {string} walletAddress - User's wallet address
 * @param {Object} swapData - Swap details from quote
 * @returns {Promise<Object>} Transaction object ready to send
 */
async function buildSwapTransaction(walletAddress, swapData) {
  try {
    const { fromToken, toToken, amount, path, expectedOutput, minReceived } = swapData;

    console.log('[UniswapHelper] Building swap transaction');

    const fromTokenInfo = TOKEN_DB[fromToken.toUpperCase()];
    const toTokenInfo = TOKEN_DB[toToken.toUpperCase()];

    // Convert amounts to wei
    const amountInWei = ethers.utils.parseUnits(amount, fromTokenInfo.decimals);
    const minAmountOutWei = ethers.utils.parseUnits(minReceived, toTokenInfo.decimals);

    // Deadline: 10 minutes from now
    const deadline = Math.floor(Date.now() / 1000) + 600;

    // Create router contract
    const provider = new ethers.providers.JsonRpcProvider(SEPOLIA_CONFIG.rpcUrl);

    // Build transaction data
    const routerInterface = new ethers.utils.Interface(ROUTER_ABI);
    const functionData = routerInterface.encodeFunctionData('exactInput', [
      {
        path: path,
        recipient: walletAddress,
        deadline: deadline,
        amountIn: amountInWei,
        amountOutMinimum: minAmountOutWei,
      },
    ]);

    return {
      to: SEPOLIA_CONFIG.router,
      from: walletAddress,
      data: functionData,
      value: '0x0', // No ETH value needed (unless swapping FROM ETH)
      gasLimit: ethers.BigNumber.from('200000'),
      // gasPrice will be estimated by wallet
    };
  } catch (error) {
    console.error('[UniswapHelper] Build tx error:', error);
    throw new Error(`Failed to build transaction: ${error.message}`);
  }
}

// Export for use in injected.js
if (typeof window !== 'undefined') {
  window.UniswapHelper = {
    getUniswapQuote,
    estimateGasCost,
    requestTokenApprovalIfNeeded,
    buildSwapTransaction,
  };
}

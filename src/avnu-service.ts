// src/avnu-service.ts

// AVNU DEX Aggregator - Best swap rates on Starknet

import { Call } from 'starknet';

const AVNU_API_BASE = 'https://starknet.api.avnu.fi';

// Token addresses on Mainnet
export const MAINNET_TOKENS = {
  STRK: '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
  USDC: '0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8',
  ETH: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
};

export interface SwapQuote {
  quoteId: string;
  sellTokenAddress: string;
  buyTokenAddress: string;
  sellAmount: string;
  buyAmount: string;
  buyAmountWithoutFees: string;
  feesInUsd: number;
  routes: any[];
  gasEstimate: string;
  priceRatioUsd: number;
}

export interface SwapBuildResult {
  calls: Call[];
}

/**
 * Get swap quote from AVNU (best rate across all Starknet DEXs)
 */
export async function getSwapQuote(
  sellTokenAddress: string,
  buyTokenAddress: string,
  sellAmount: bigint,
  takerAddress: string
): Promise<SwapQuote> {
  const params = new URLSearchParams({
    sellTokenAddress,
    buyTokenAddress,
    sellAmount: sellAmount.toString(),
    takerAddress,
    size: '3', // Get top 3 routes
    integratorName: 'tongo-ukraine', // Track source
  });

  console.log('[AVNU] Fetching quote:', {
    sell: sellTokenAddress.slice(0, 10) + '...',
    buy: buyTokenAddress.slice(0, 10) + '...',
    amount: sellAmount.toString(),
  });

  const response = await fetch(`${AVNU_API_BASE}/swap/v2/quotes?${params}`);
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AVNU quote failed: ${response.status} - ${error}`);
  }

  const quotes = await response.json();
  
  if (!quotes || quotes.length === 0) {
    throw new Error('No swap routes available from AVNU');
  }

  const bestQuote = quotes[0];
  
  console.log('[AVNU] Best quote:', {
    sellAmount: bestQuote.sellAmount,
    buyAmount: bestQuote.buyAmount,
    routes: bestQuote.routes?.length || 0,
    feesUsd: bestQuote.feesInUsd,
  });

  return bestQuote;
}

/**
 * Build swap transaction calls from quote
 */
export async function buildSwapTransaction(
  quoteId: string,
  takerAddress: string,
  slippage: number = 0.01 // 1% default
): Promise<SwapBuildResult> {
  console.log('[AVNU] Building swap transaction:', { quoteId, slippage });

  const response = await fetch(`${AVNU_API_BASE}/swap/v2/build`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quoteId,
      takerAddress,
      slippage,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AVNU build failed: ${response.status} - ${error}`);
  }

  const result = await response.json();
  
  console.log('[AVNU] Swap transaction built:', {
    callsCount: result.calls?.length || 0,
  });

  return result;
}

/**
 * Get STRK → USDC quote for Lightning flow
 */
export async function getStrkToUsdcQuote(
  strkAmount: bigint,
  takerAddress: string
): Promise<{ usdcAmount: bigint; quote: SwapQuote }> {
  const quote = await getSwapQuote(
    MAINNET_TOKENS.STRK,
    MAINNET_TOKENS.USDC,
    strkAmount,
    takerAddress
  );

  return {
    usdcAmount: BigInt(quote.buyAmount),
    quote,
  };
}

/**
 * Execute STRK → USDC swap (returns Call[] for wallet.execute)
 */
export async function buildStrkToUsdcSwap(
  strkAmount: bigint,
  takerAddress: string,
  slippage: number = 0.01
): Promise<Call[]> {
  // Get quote
  const { quote } = await getStrkToUsdcQuote(strkAmount, takerAddress);
  
  // Build transaction
  const { calls } = await buildSwapTransaction(quote.quoteId, takerAddress, slippage);
  
  return calls;
}

/**
 * Format amounts for display
 */
export function formatStrkAmount(amount: bigint): string {
  return (Number(amount) / 1e18).toFixed(6);
}

export function formatUsdcAmount(amount: bigint): string {
  return (Number(amount) / 1e6).toFixed(2);
}





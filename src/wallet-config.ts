import { RpcProvider, Account } from 'starknet';
import type { StarknetWindowObject } from 'get-starknet';

/**
 * Network configuration for Starknet
 */
export type Network = 'sepolia' | 'mainnet';

export interface NetworkConfig {
  name: string;
  rpcUrl: string;
  tongoContractAddress: string;
  strkAddress: string;
  chainId: string;
}

/**
 * Network configurations
 */
export const NETWORKS: Record<Network, NetworkConfig> = {
  sepolia: {
    name: 'Sepolia Testnet',
    rpcUrl: 'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_9/cf52O0RwFy1mEB0uoYsel',
    // STRK wrapper (1:1 rate for testing)
    tongoContractAddress: '0x408163bfcfc2d76f34b444cb55e09dace5905cf84c0884e4637c2c0f06ab6ed',
    strkAddress: '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
    chainId: 'SN_SEPOLIA'
  },
  mainnet: {
    name: 'Starknet Mainnet',
    rpcUrl: 'https://starknet-mainnet.g.alchemy.com/starknet/version/rpc/v0_10/cf52O0RwFy1mEB0uoYsel',
    // Tongo contract (Nov 14, 2024 - compatible with SDK v1.3.0)
    tongoContractAddress: '0x72098b84989a45cc00697431dfba300f1f5d144ae916e98287418af4e548d96',
    // USDC mainnet address (NOT STRK!)
    strkAddress: '0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8',
    chainId: 'SN_MAIN'
  }
};

/**
 * Get network configuration
 */
export function getNetworkConfig(network: Network = 'mainnet'): NetworkConfig {
  return NETWORKS[network];
}

/**
 * Create RPC provider for a network
 */
export function createProvider(network: Network = 'mainnet'): RpcProvider {
  const config = getNetworkConfig(network);
  return new RpcProvider({
    nodeUrl: config.rpcUrl
    // specVersion is auto-detected from RPC URL
  });
}

/**
 * Browser-only: Connect to Starknet wallet
 * Returns Account if connected, null if cancelled
 */
const WALLET_CONNECTION_TIMEOUT = 30000; // 30 seconds

// Cache get-starknet module to avoid re-imports (faster)
let cachedConnect: any = null;
let cachedDisconnect: any = null;
let moduleInitialized = false;

// Pre-initialize get-starknet module on page load (faster wallet detection)
async function initializeGetStarknet() {
  if (!cachedConnect || !cachedDisconnect) {
    console.log('[wallet-config] Initializing get-starknet module...');
    const startTime = Date.now();
    const module = await import('get-starknet');
    cachedConnect = module.connect;
    cachedDisconnect = module.disconnect;
    const loadTime = Date.now() - startTime;
    console.log(`[wallet-config] get-starknet module cached (took ${loadTime}ms)`);
    moduleInitialized = true;
  }
  return { connect: cachedConnect, disconnect: cachedDisconnect };
}

// Pre-load module when this file is imported (in browser)
if (typeof window !== 'undefined') {
  // Initialize in background, don't wait for it
  initializeGetStarknet().catch(err => {
    console.warn('[wallet-config] Failed to pre-initialize get-starknet:', err);
  });
}

export async function connectWallet(): Promise<Account | null> {
  if (typeof window === 'undefined') {
    throw new Error('Wallet connection is only available in browser environment');
  }

  try {
    console.log('[wallet-config] Starting wallet connection...');
    
    // Show loading indication early
    const statusEl = document.getElementById('status');
    if (statusEl) {
      statusEl.textContent = 'Connecting to wallet...';
      statusEl.className = 'status loading';
    }
    
    // ✅ FIX: Try Braavos FIRST (directly), then fall back to get-starknet modal
    const braavos = (window as any).starknet_braavos;
    
    if (braavos) {
      console.log('[wallet-config] Found Braavos, connecting directly...');
      try {
        await braavos.enable();
        
        if (braavos.isConnected && braavos.account) {
          console.log('[wallet-config] ✅ Braavos connected:', braavos.account.address);
          console.log('[wallet-config] Using Braavos account as Starknet Account', {
            address: braavos.account.address,
            providerType: typeof braavos.account.provider,
          });
          
          if (statusEl) {
            statusEl.textContent = 'Braavos connected';
            statusEl.className = 'status success';
          }
          
          return braavos.account as Account;
        }
      } catch (braavosError) {
        console.warn('[wallet-config] Braavos connection failed:', braavosError);
        // Continue to try other wallets
      }
    }
    
    // Fallback: Try argentX
    const argentX = (window as any).starknet_argentX;
    if (argentX) {
      console.log('[wallet-config] Trying ArgentX...');
      try {
        await argentX.enable();
        
        if (argentX.isConnected && argentX.account) {
          console.log('[wallet-config] ✅ ArgentX connected:', argentX.account.address);
          
          if (statusEl) {
            statusEl.textContent = 'ArgentX connected';
            statusEl.className = 'status success';
          }
          
          return argentX.account as Account;
        }
      } catch (argentXError) {
        console.warn('[wallet-config] ArgentX connection failed:', argentXError);
        // Continue to modal fallback
      }
    }
    
    // Last resort: Use get-starknet modal
    console.log('[wallet-config] Using get-starknet modal (no direct wallet found)...');
    
    if (statusEl) {
      statusEl.textContent = 'Opening wallet modal...';
      statusEl.className = 'status loading';
    }
    
    const { connect } = await initializeGetStarknet();
    if (!connect || typeof connect !== 'function') {
      throw new Error('get-starknet connect function not found. Make sure get-starknet is installed: bun add get-starknet');
    }
    
    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Wallet connection timed out after 30 seconds. Ready wallet is slow - try Braavos instead.'));
      }, WALLET_CONNECTION_TIMEOUT);
    });

    // Only show Braavos and Argent X
    const connectOptions: any = {
      include: ['braavos', 'argentX'],
      modalMode: 'alwaysAsk' as const,
      modalTheme: 'dark' as const
    };
    
    // Try to add exclude if supported
    try {
      connectOptions.exclude = ['keplr', 'okx', 'xdefi', 'ready'];
    } catch (e) {
      // exclude not supported, that's okay
    }
    
    console.log('[wallet-config] Calling connect with options:', connectOptions);
    
    // Race between actual connection and timeout
    const connectStartTime = Date.now();
    const wallet = await Promise.race([
      connect(connectOptions),
      timeoutPromise
    ]);
    const connectTime = Date.now() - connectStartTime;
    console.log(`[wallet-config] Connect completed in ${connectTime}ms`);
    
    console.log('[wallet-config] Connect result:', wallet ? 'Wallet selected' : 'User cancelled');

    if (!wallet) {
      console.log('[wallet-config] User cancelled wallet connection');
      if (statusEl) {
        statusEl.textContent = 'Connection cancelled';
        statusEl.className = 'status';
      }
      return null; // User cancelled
    }

    if (!wallet.isConnected) {
      console.log('[wallet-config] Wallet not connected, enabling...');
      await wallet.enable();
    }

    // Extra debug detail
    console.log('[wallet-config] Wallet connected details:', {
      walletId: wallet.id,
      name: wallet.name,
      icon: wallet.icon,
      isConnected: wallet.isConnected,
      address: wallet.account?.address,
    });

    if (!wallet.account) {
      throw new Error('Wallet account not available after connection');
    }

    console.log('[wallet-config] Using wallet.account as Starknet Account', {
      address: wallet.account.address,
      providerType: typeof (wallet.account as any).provider,
      providerHasNodeUrl: !!(wallet.account as any).provider?.nodeUrl,
    });

    console.log('[wallet-config] ✅ Wallet connected successfully via modal:', wallet.account.address);
    
    if (statusEl) {
      statusEl.textContent = `${wallet.name} connected`;
      statusEl.className = 'status success';
    }
    
    // wallet.account is already an Account type from starknet.js
    return wallet.account as Account;
  } catch (error) {
    console.error('[wallet-config] Wallet connection error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('[wallet-config] Error stack:', errorStack);
    
    const statusEl = document.getElementById('status');
    if (statusEl) {
      statusEl.textContent = `Connection failed: ${errorMessage}`;
      statusEl.className = 'status error';
    }
    
    throw new Error(`Failed to connect wallet: ${errorMessage}`);
  }
}

/**
 * Browser-only: Disconnect wallet
 */
export async function disconnectWallet(): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const { disconnect } = await initializeGetStarknet();
    if (disconnect) {
      await disconnect();
    }
  } catch (error) {
    console.error('[wallet-config] Wallet disconnection error:', error);
  }
}

/**
 * Browser-only: Get connected wallet account
 */
export async function getConnectedAccount(): Promise<Account | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    // Check window.starknet first (faster - directly injected by wallet)
    const starknet = (window as any).starknet;
    if (starknet?.isConnected && starknet?.account) {
      console.log('[wallet-config] Found existing connection via window.starknet');
      return starknet.account as Account;
    }

    // Otherwise try get-starknet (slower but more reliable)
    const { connect } = await initializeGetStarknet();
    const wallet = await connect({ modalMode: 'silent' });
    
    if (wallet?.isConnected && wallet?.account) {
      console.log('[wallet-config] Found existing connection via get-starknet');
      return wallet.account as Account;
    }

    console.log('[wallet-config] No existing wallet connection found');
    return null;
  } catch (error) {
    console.log('[wallet-config] No existing wallet connection (this is normal if not connected)');
    return null;
  }
}


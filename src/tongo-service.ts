import { Account as TongoAccount } from '@fatsolutions/tongo-sdk';
import { Account, Call, RpcProvider } from 'starknet';
import { TongoDonationState, TongoOperation } from './types';

// Import pubKeyBase58ToAffine from the dist folder
// Note: This is a workaround since the package doesn't export it from the main entry
// Vite will resolve this with proper configuration
import { pubKeyBase58ToAffine } from '@fatsolutions/tongo-sdk/dist/types.js';

/**
 * Pads a Starknet address to 66 characters (0x + 64 hex digits).
 * Required for consistent ZK proof validation in Tongo SDK.
 * 
 * @param address - The address to pad (e.g., 0x6a6826b1...)
 * @returns Padded address (0x06a6826b1...)
 * 
 * @example
 * padAddress('0x6a6826b1...') // '0x06a6826b1...'
 */
function padAddress(address: string): string {
  if (!address) return address;
  if (!address.startsWith('0x')) {
    address = '0x' + address;
  }
  return '0x' + address.slice(2).padStart(64, '0');
}

// Get tongoPrivateKey only in Node.js environment (for CLI demo)
// Browser code should always pass tongoPrivateKeyOverride
function getDefaultTongoPrivateKey(): string {
  if (typeof window === 'undefined') {
    // Node.js - dynamically import config
    try {
      const config = require('./config');
      return config.tongoPrivateKey;
    } catch (error) {
      throw new Error('Failed to load config.ts. Make sure you are running in Node.js environment or pass tongoPrivateKeyOverride.');
    }
  }
  // Browser - return empty, must be provided via parameter
  return '';
}

/**
 * Validate if a key is a valid Stark curve scalar
 * Valid range: 1 <= key < curve_order
 */
function isValidTongoPrivateKey(key: string): boolean {
  if (!key || typeof key !== 'string') {
    console.warn('[TONGO] Invalid key - must be a string');
    return false;
  }

  if (!key.startsWith('0x')) {
    console.warn('[TONGO] Invalid key format - must start with 0x');
    return false;
  }

  try {
    const keyBigInt = BigInt(key);
    const starkCurveOrder = BigInt('3618502788666131213697322783095070105526743751716087489154079457884512865583');

    // Key must be in range [1, n)
    if (keyBigInt < 1n) {
      console.warn('[TONGO] Key is too small - must be >= 1');
      return false;
    }

    if (keyBigInt >= starkCurveOrder) {
      console.warn('[TONGO] Key is outside valid range for Stark curve');
      console.warn('[TONGO] Valid range: 1 to', starkCurveOrder.toString());
      console.warn('[TONGO] Your key:', keyBigInt.toString());
      return false;
    }

    return true;
  } catch (error) {
    console.warn('[TONGO] Failed to parse key as hex:', error);
    return false;
  }
}

export class TongoService {
  private tongoAccount: TongoAccount;
  private starknetAddress: string;
  private starknetAccount: Account;
  private provider: RpcProvider;
  private tongoContractAddress: string;
  private strkAddress: string;
  private state: TongoDonationState;

  constructor(
    starknetAddress: string,
    starknetAccount: Account,
    provider: RpcProvider,
    tongoContractAddress: string,
    strkAddress: string,
    tongoPrivateKeyOverride?: string
  ) {
    // ✅ Pad address on initialization for consistent ZK proof validation
    this.starknetAddress = padAddress(starknetAddress);
    this.starknetAccount = starknetAccount;
    this.provider = provider;
    // CRITICAL: Pad Tongo contract address to ensure SDK uses correct format in approve calls
    // The SDK converts addresses to numbers for calldata, and unpadded addresses lose leading zeros
    this.tongoContractAddress = padAddress(tongoContractAddress);
    this.strkAddress = strkAddress;

    // Use provided key or fallback to getter (Node.js only)
    const key = tongoPrivateKeyOverride || getDefaultTongoPrivateKey();
    if (!key || key === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      throw new Error('Tongo private key is required. In browser, pass it as tongoPrivateKeyOverride parameter.');
    }

    // ✅ VALIDATE KEY BEFORE USING
    console.log('[TONGO] Validating Tongo private key...');
    if (!isValidTongoPrivateKey(key)) {
      const errorMsg =
        `Invalid Tongo private key. ` +
        `The key must be a valid scalar on the Stark curve. ` +
        `Generate a new one: node -e "console.log('0x' + require('crypto').randomBytes(32).toString('hex'))"`;
      console.error('[TONGO]', errorMsg);
      throw new Error(errorMsg);
    }
    console.log('[TONGO] Key validation passed');

    // Cast provider to match Tongo SDK's expected type
    try {
      console.log('[TONGO] Creating TongoAccount...');
      console.log('[TONGO] Tongo contract address (padded):', this.tongoContractAddress);
      this.tongoAccount = new TongoAccount(
        key,
        this.tongoContractAddress,  // Use padded address so SDK generates correct approve calls
        provider as any
      );
      console.log('[TONGO] TongoAccount created successfully');
    } catch (error) {
      console.error('[TONGO] Failed to create TongoAccount:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to initialize Tongo account: ${errorMessage}. ` +
        `Make sure your Tongo private key is valid.`
      );
    }

    // Get public key as string - handle different formats
    let publicKeyStr: string;
    try {
      const pk: any = this.tongoAccount.publicKey;

      // Check if it's already a string
      if (typeof pk === 'string') {
        publicKeyStr = pk;
      }
      // Check if it's an object with x and y properties (elliptic curve point)
      else if (pk && typeof pk === 'object' && 'x' in pk && 'y' in pk) {
        // Convert point to hex format: 0x<x64hex><y64hex>
        const x = pk.x;
        const y = pk.y;
        const xValue = typeof x === 'bigint' ? x : (typeof x === 'string' ? BigInt(x) : BigInt(String(x)));
        const yValue = typeof y === 'bigint' ? y : (typeof y === 'string' ? BigInt(y) : BigInt(String(y)));
        const xHex = xValue.toString(16).padStart(64, '0');
        const yHex = yValue.toString(16).padStart(64, '0');
        publicKeyStr = `0x${xHex}${yHex}`;
        console.log('[TONGO] Converted public key point to hex:', publicKeyStr.substring(0, 20) + '...');
      }
      // Try toString() method
      else if (pk && typeof pk === 'object' && 'toString' in pk && typeof pk.toString === 'function') {
        const str = pk.toString();
        // If toString() returns [object Object], try JSON.stringify
        if (str === '[object Object]') {
          const jsonStr = JSON.stringify(pk);
          console.warn('[TONGO] Public key toString() returned [object Object], JSON:', jsonStr);
          // Try to extract useful info from JSON
          publicKeyStr = jsonStr.length > 100 ? jsonStr.substring(0, 100) + '...' : jsonStr;
        } else {
          publicKeyStr = str;
        }
      }
      // Last resort: JSON stringify
      else {
        publicKeyStr = JSON.stringify(pk);
        console.warn('[TONGO] Public key is not string or point object:', publicKeyStr);
      }
    } catch (error) {
      console.error('[TONGO] Error getting public key:', error);
      publicKeyStr = 'Error: Could not serialize public key';
    }

    console.log('[TONGO] Public key stored as:', publicKeyStr.substring(0, 50) + (publicKeyStr.length > 50 ? '...' : ''));

    this.state = {
      tongoPublicKey: publicKeyStr,
      starknetAddress,
      currentBalance: 0n,
      pendingBalance: 0n,
      nonce: 0
    };
  }

  getPublicKey(): string {
    return this.state.tongoPublicKey;
  }

  /**
   * FUND: Convert STRK to encrypted Tongo balance
   * Flow:
   * 1. User approves STRK to Tongo contract
   * 2. Create Fund operation with amount
   * 3. Generate ZK proof of ownership
   * 4. Submit to contract (amount is PUBLIC)
   */
  async fundDonationAccount(amountInToken: bigint): Promise<string> {
    // Determine if we're on mainnet (USDC) or testnet (STRK)
    // USDC has 6 decimals, STRK has 18 decimals
    const isMainnet = this.strkAddress.toLowerCase() === '0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8';
    const tokenName = isMainnet ? 'USDC' : 'STRK';
    const tokenDecimals = isMainnet ? 6 : 18;

    if (amountInToken <= 0n) {
      throw new Error('Amount must be greater than 0');
    }

    let tokenAmount = amountInToken;

    // Safety: if user accidentally passes 18-decimals on mainnet, normalize to 6 decimals
    if (isMainnet && tokenAmount >= BigInt(1e15)) {
      console.warn('[FUND] Detected very large USDC amount (likely 18 decimals). Converting down to 6 decimals.');
      tokenAmount = tokenAmount / BigInt(1e12);
    }

    console.log(`[FUND] Funding account with ${(Number(tokenAmount) / Math.pow(10, tokenDecimals)).toFixed(tokenDecimals === 6 ? 2 : 6)} ${tokenName}`);
    console.log('[FUND] Token amount in base units:', tokenAmount.toString());

    // Convert ERC20 amount -> Tongo amount using on-chain rate
    const tongoAmount = await this.tongoAccount.erc20ToTongo(tokenAmount);
    console.log('[FUND] Converted token amount to Tongo amount:', {
      tokenAmount: tokenAmount.toString(),
      tongoAmount: tongoAmount.toString()
    });
    console.log('[FUND] Using Tongo amount for proofs:', tongoAmount.toString());

    // Tongo proofs expect Tongo amount to fit in 32 bits
    const MAX_32_BIT = BigInt(2147483647);
    if (tongoAmount > MAX_32_BIT) {
      throw new Error(`Amount ${tongoAmount} ${tokenName} exceeds maximum 32-bit limit of ${MAX_32_BIT}. Please use a smaller amount.`);
    }
    if (tongoAmount <= 0n) {
      throw new Error('Converted amount must be greater than 0');
    }

    try {
      // Step 1: Verify TongoAccount is properly initialized
      console.log('[FUND] Verifying TongoAccount initialization...');
      console.log('[FUND] TongoAccount public key:', this.tongoAccount.publicKey);
      console.log('[FUND] TongoAccount contract:', this.tongoContractAddress);
      console.log('[FUND] Executor address:', this.starknetAccount.address);

      // Step 2: Create Fund operation with Tongo SDK
      // The SDK handles ZK proof generation internally
      // KEY FIX: Use the Starknet account address as sender (must match executor)
      const isMainnet = this.strkAddress.toLowerCase() === '0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8';
      const tokenName = isMainnet ? 'USDC' : 'STRK';

      // NEW: Extra debug context before calling tongoAccount.fund
      // CRITICAL: Verify addresses match before proceeding
      const executorAddress = this.starknetAccount.address;
      const serviceAddress = this.starknetAddress;

      console.log('[FUND] Debug context before tongoAccount.fund:', {
        isMainnet,
        tokenName,
        tokenAddress: this.strkAddress,
        tongoContractAddress: this.tongoContractAddress,
        starknetExecutor: executorAddress,
        starknetServiceAddress: serviceAddress,
        addressesMatch: executorAddress.toLowerCase() === serviceAddress.toLowerCase(),
        tongoPublicKey: this.state.tongoPublicKey?.slice(0, 66) + '...',
        tongoAmount: tongoAmount.toString(),
        accountType: this.starknetAccount.constructor.name,
        accountHasExecute: typeof this.starknetAccount.execute === 'function',
      });

      // CRITICAL CHECK: Verify executor matches service address
      // Both must be padded for accurate comparison
      const paddedExecutor = padAddress(executorAddress);
      const paddedService = padAddress(serviceAddress);

      console.log('[FUND] Padded addresses for comparison:', {
        paddedExecutor,
        paddedService,
        match: paddedExecutor.toLowerCase() === paddedService.toLowerCase()
      });

      if (paddedExecutor.toLowerCase() !== paddedService.toLowerCase()) {
        const errorMsg = `Address mismatch: Executor (${paddedExecutor}) != Service (${paddedService}). This will cause "NotOwner" error.`;
        console.error('[FUND] ❌', errorMsg);
        throw new Error(errorMsg);
      }

      console.log('[FUND] ✅ Address verification passed - executor matches service address (padded)');
      console.log('[FUND] Creating fund operation with amount:', tongoAmount.toString(), tokenName);
      // CRITICAL: Use wallet's EXACT address format (no padding) so ZK proof matches transaction sender
      console.log('[FUND] Using wallet address (unpadded) for SDK:', this.starknetAccount.address);
      const fundOperation = await this.tongoAccount.fund({
        amount: tongoAmount,
        sender: this.starknetAccount.address  // Use wallet's exact address format (matches TX sender)
      });

      // ========== DEEP DEBUG ==========
      console.log('[FUND-DEBUG] === DEEP DEBUG ===');
      console.log('[FUND-DEBUG] Input to SDK:', {
        amount: tongoAmount.toString(),
        sender: this.starknetAccount.address,
        senderLength: this.starknetAccount.address.length,
        senderHex: this.starknetAccount.address,
        senderLowercase: this.starknetAccount.address.toLowerCase()
      });

      // Check fundOperation structure
      console.log('[FUND-DEBUG] fundOperation keys:', Object.keys(fundOperation));
      console.log('[FUND-DEBUG] fundOperation:', fundOperation);

      // Check approve call
      if (fundOperation.approve) {
        console.log('[FUND-DEBUG] approve.contractAddress:', fundOperation.approve.contractAddress);
        console.log('[FUND-DEBUG] approve.entrypoint:', fundOperation.approve.entrypoint);
        console.log('[FUND-DEBUG] approve.calldata:', fundOperation.approve.calldata);
      }

      // Check toCalldata result
      const calldataResult = fundOperation.toCalldata?.();
      console.log('[FUND-DEBUG] toCalldata() result:', calldataResult);

      if (calldataResult && 'calldata' in calldataResult && Array.isArray(calldataResult.calldata)) {
        const cd = calldataResult.calldata as any[];
        console.log('[FUND-DEBUG] calldata length:', cd.length);
        if (cd.length > 0) console.log('[FUND-DEBUG] calldata[0] (pubkey_x):', cd[0]);
        if (cd.length > 1) console.log('[FUND-DEBUG] calldata[1] (pubkey_y):', cd[1]);
        if (cd.length > 2) console.log('[FUND-DEBUG] calldata[2] (amount):', cd[2]);

        // Log first 15 elements
        const maxElements = Math.min(cd.length, 15);
        for (let i = 0; i < maxElements; i++) {
          console.log(`[FUND-DEBUG] calldata[${i}]:`, cd[i]);
        }
      } else if (Array.isArray(calldataResult)) {
        // If toCalldata returns array directly
        const cd = calldataResult as any[];
        console.log('[FUND-DEBUG] calldata (direct array) length:', cd.length);
        const maxElements = Math.min(cd.length, 15);
        for (let i = 0; i < maxElements; i++) {
          console.log(`[FUND-DEBUG] calldata[${i}]:`, cd[i]);
        }
      }
      // ========== END DEBUG ==========

      console.log('[FUND] Fund operation created, verifying structure...');

      console.log('[FUND] Fund operation created successfully');

      // Step 2: Get approve call from operation
      const approveCall = fundOperation.approve;
      if (!approveCall) {
        throw new Error('Approve call not generated by SDK');
      }

      console.log('[FUND] Approve call generated successfully');
      console.log('[FUND] Approve call structure:', {
        contractAddress: approveCall.contractAddress,
        entrypoint: approveCall.entrypoint,
        calldata: approveCall.calldata,
        calldataLength: approveCall.calldata?.length
      });

      // DEEP DEBUG: Check approve calldata
      if (approveCall.calldata && Array.isArray(approveCall.calldata)) {
        const spenderRaw = approveCall.calldata[0];
        const spenderValue = typeof spenderRaw === 'string' || typeof spenderRaw === 'number' || typeof spenderRaw === 'bigint'
          ? spenderRaw
          : String(spenderRaw);
        // CRITICAL: Pad hex to 66 chars (0x + 64 hex) to preserve leading zeros
        const spenderHexUnpadded = BigInt(spenderValue).toString(16);
        const spenderHex = '0x' + spenderHexUnpadded.padStart(64, '0');

        console.log('[FUND-DEBUG] Approve calldata details:', {
          spender: spenderValue,
          spenderHexUnpadded: '0x' + spenderHexUnpadded,
          spenderHexPadded: spenderHex,
          amount: approveCall.calldata[1],
          extra: approveCall.calldata[2]
        });

        // Verify spender address matches Tongo contract (both padded)
        const tongoContractLower = this.tongoContractAddress.toLowerCase();
        const spenderLower = spenderHex.toLowerCase();
        const match = spenderLower === tongoContractLower;
        console.log('[FUND-DEBUG] Spender address check:', {
          spenderFromCalldata: spenderLower,
          tongoContract: tongoContractLower,
          match: match,
          spenderLength: spenderLower.length,
          contractLength: tongoContractLower.length
        });

        if (!match) {
          console.error('[FUND-DEBUG] ❌ SPENDER ADDRESS MISMATCH! This will cause "NowOwner" error.');
          console.error('[FUND-DEBUG] The SDK generated approve call with wrong spender address format.');
        }
      }

      // CRITICAL FIX: Patch approve call calldata to use correct padded Tongo contract address
      // The SDK converts addresses to numbers, which loses leading zeros
      // We need to ensure the spender address in approve calldata matches the padded Tongo contract
      if (approveCall.calldata && Array.isArray(approveCall.calldata) && approveCall.calldata.length >= 1) {
        const spenderRaw = approveCall.calldata[0];
        const spenderValue = typeof spenderRaw === 'string' || typeof spenderRaw === 'number' || typeof spenderRaw === 'bigint'
          ? spenderRaw
          : String(spenderRaw);
        const spenderHexUnpadded = BigInt(spenderValue).toString(16);
        const spenderHex = '0x' + spenderHexUnpadded.padStart(64, '0');
        const tongoContractLower = this.tongoContractAddress.toLowerCase();

        // If addresses don't match (due to missing leading zero), fix the calldata
        if (spenderHex.toLowerCase() !== tongoContractLower) {
          console.warn('[FUND] ⚠️ Patching approve calldata: spender address mismatch detected');
          console.warn('[FUND] Original spender:', spenderHex);
          console.warn('[FUND] Expected spender:', tongoContractLower);

          // Convert padded Tongo contract address back to decimal for calldata
          const tongoContractDecimal = BigInt(this.tongoContractAddress).toString();
          approveCall.calldata[0] = tongoContractDecimal;

          console.log('[FUND] ✅ Patched approve calldata with correct spender:', {
            original: spenderHex,
            patched: this.tongoContractAddress,
            calldataValue: tongoContractDecimal
          });
        }
      }

      // Check wallet balance before transaction
      try {
        const balance = await this.getWalletBalance();
        console.log('[FUND-DEBUG] Wallet balance before transaction:', {
          balance: balance.toString(),
          balanceFormatted: isMainnet ? (Number(balance) / 1e6).toFixed(6) + ' USDC' : (Number(balance) / 1e18).toFixed(6) + ' STRK',
          requestedAmount: amountInToken.toString(),
          hasEnoughBalance: balance >= amountInToken
        });

        if (balance < amountInToken) {
          throw new Error(`Insufficient balance: ${isMainnet ? (Number(balance) / 1e6).toFixed(6) : (Number(balance) / 1e18).toFixed(6)} ${tokenName} < ${isMainnet ? (Number(amountInToken) / 1e6).toFixed(6) : (Number(amountInToken) / 1e18).toFixed(6)} ${tokenName}`);
        }
      } catch (balanceError) {
        if (balanceError instanceof Error && balanceError.message.includes('Insufficient balance')) {
          throw balanceError;
        }
        console.warn('[FUND-DEBUG] Could not check wallet balance:', balanceError);
      }

      // CRITICAL FIX: Patch approve call calldata to use correct padded Tongo contract address
      // The SDK converts addresses to numbers, which loses leading zeros
      // We need to ensure the spender address in approve calldata matches the padded Tongo contract
      if (approveCall.calldata && Array.isArray(approveCall.calldata) && approveCall.calldata.length >= 1) {
        const spenderRaw = approveCall.calldata[0];
        const spenderValue = typeof spenderRaw === 'string' || typeof spenderRaw === 'number' || typeof spenderRaw === 'bigint'
          ? spenderRaw
          : String(spenderRaw);
        const spenderHexUnpadded = BigInt(spenderValue).toString(16);
        const spenderHex = '0x' + spenderHexUnpadded.padStart(64, '0');
        const tongoContractLower = this.tongoContractAddress.toLowerCase();

        // If addresses don't match (due to missing leading zero), fix the calldata
        if (spenderHex.toLowerCase() !== tongoContractLower) {
          console.warn('[FUND] ⚠️ Patching approve calldata: spender address mismatch detected');
          console.warn('[FUND] Original spender:', spenderHex);
          console.warn('[FUND] Expected spender:', tongoContractLower);

          // Convert padded Tongo contract address back to decimal for calldata
          const tongoContractDecimal = BigInt(this.tongoContractAddress).toString();
          approveCall.calldata[0] = tongoContractDecimal;

          console.log('[FUND] ✅ Patched approve calldata with correct spender:', {
            original: spenderHex,
            patched: this.tongoContractAddress,
            calldataValue: tongoContractDecimal
          });
        }
      }

      console.log('[FUND] Executing approve + fund calls atomically...');

      // Step 3: Build fund call from operation
      // The approve call tells USDC/STRK contract: "Let Tongo contract spend my tokens"
      // The fund call tells Tongo contract: "Convert my tokens to encrypted balance"
      let fundCall: Call;

      if (typeof fundOperation.toCalldata === 'function') {
        try {
          const callResult = fundOperation.toCalldata();
          console.log('[FUND] toCalldata() returned:', callResult);

          if (callResult && typeof callResult === 'object' && 'contractAddress' in callResult && 'entrypoint' in callResult) {
            fundCall = callResult as Call;
            console.log('[FUND] Using Call object from toCalldata()');
          } else if (Array.isArray(callResult)) {
            fundCall = {
              contractAddress: this.tongoContractAddress,
              entrypoint: 'fund',
              calldata: callResult
            };
            console.log('[FUND] Built Call object from calldata array');
          } else {
            throw new Error('toCalldata() returned unexpected format');
          }
        } catch (e) {
          console.error('[FUND] Error calling toCalldata():', e);
          throw new Error(`Failed to get calldata from fund operation: ${e instanceof Error ? e.message : String(e)}`);
        }
      } else if ('contractAddress' in fundOperation && 'entrypoint' in fundOperation && 'calldata' in fundOperation) {
        fundCall = fundOperation as Call;
        console.log('[FUND] Using fundOperation directly as Call object');
      } else {
        // Fallback: use calldata if available
        const calldata = (fundOperation as any).calldata || [];
        fundCall = {
          contractAddress: this.tongoContractAddress,
          entrypoint: 'fund',
          calldata: Array.isArray(calldata) ? calldata : []
        };
        console.log('[FUND] Using fallback Call object');
      }

      console.log('[FUND] Constructed fundCall:', {
        contractAddress: fundCall.contractAddress,
        entrypoint: fundCall.entrypoint,
        calldataLength: fundCall.calldata?.length || 0
      });

      // Execute both calls atomically
      const tx = await this.starknetAccount.execute([
        approveCall,
        fundCall
      ]);

      console.log('[FUND] Transaction submitted:', tx.transaction_hash);
      const explorerUrl = isMainnet
        ? `https://starkscan.co/tx/${tx.transaction_hash}`
        : `https://sepolia.starkscan.co/tx/${tx.transaction_hash}`;
      console.log('[FUND] View on Starkscan:', explorerUrl);

      // Wait for tx to complete
      await new Promise(r => setTimeout(r, 3000));

      // Refresh state
      await this.refreshState();

      return tx.transaction_hash;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[FUND] Error:', error);

      // Parse Tongo SDK errors
      const isMainnet = this.strkAddress.toLowerCase() === '0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8';
      const tokenName = isMainnet ? 'USDC' : 'STRK';

      if (errorMessage.includes('NotOwner') || errorMessage.includes('NowOwner')) {
        console.error('[FUND] NotOwner error - token approval failed');
        console.error('[FUND] This means:');
        console.error('[FUND] 1. You don\'t have', tokenName, 'in your wallet, OR');
        console.error('[FUND] 2.', tokenName, 'approval step failed, OR');
        console.error('[FUND] 3. Contract address is wrong');
        throw new Error(
          `${tokenName} approval failed. Ensure you have ${tokenName} and using correct ${isMainnet ? 'mainnet' : 'testnet'} network. ` +
          'Try: 1) Check wallet balance, 2) Switch to correct network in dropdown, 3) Reload page'
        );
      }

      if (errorMessage.includes('Insufficient balance')) {
        throw new Error(`Insufficient ${tokenName} balance. You need more ${tokenName} in your wallet.`);
      }

      if (errorMessage.includes('PubKey is not an EcPoint') || errorMessage.includes('EcPoint')) {
        console.error('[FUND] Public key format error - Tongo SDK may have generated invalid public key');
        throw new Error(
          'Public key format error: The Tongo SDK generated an invalid public key format. ' +
          'Try: Clear localStorage (localStorage.clear()) and refresh the page to generate a new Tongo key.'
        );
      }

      if (errorMessage.includes('Proof Of Ownership failed') || errorMessage.includes('Proof') || errorMessage.includes('proof')) {
        console.error('[FUND] Proof error - likely Tongo SDK API issue or invalid key');
        throw new Error(
          'ZK proof generation failed. Try reloading page or checking Tongo key.'
        );
      }

      // Check for gas/resource bounds errors
      if (errorMessage.includes('resource_bounds') || errorMessage.includes('gas') || errorMessage.includes('fee')) {
        console.error('[FUND] Gas/resource bounds error - Tongo SDK may have returned invalid calldata');
        throw new Error(
          'Transaction failed due to invalid gas bounds. ' +
          'Try: Refresh the page and try again with a smaller amount.'
        );
      }

      // Check for DEPLOY_ACCOUNT errors
      if (errorMessage.includes('DEPLOY_ACCOUNT') || errorMessage.includes('deploy')) {
        console.error('[FUND] Account deployment error - your wallet account may not be deployed');
        throw new Error(
          'Account deployment error: Your Starknet account may not be deployed yet. ' +
          'Try: Make a small transaction first to deploy the account, or use a different wallet.'
        );
      }

      throw new Error(`Fund failed: ${errorMessage}`);
    }
  }

  /**
   * TRANSFER: Send private donation
   * Flow:
   * 1. Create Transfer operation to recipient
   * 2. SDK generates ZK proof that:
   *    - Sender owns the account
   *    - Both encryptions (recipient + change) are valid
   *    - Amount is positive
   *    - Sender has sufficient balance
   * 3. Submit to contract (amount is HIDDEN)
   */
  async sendPrivateDonation(
    recipientPublicKey: string,
    amountInToken: bigint  // ← CHANGE: Now receives token amount (USDC/STRK decimals)
  ): Promise<string> {
    // Determine if we're on mainnet (USDC) or testnet (STRK)
    const isMainnet = this.strkAddress.toLowerCase() ===
      '0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8';
    const tokenName = isMainnet ? 'USDC' : 'STRK';
    const tokenDecimals = isMainnet ? 6 : 18;

    // Convert token amount to Tongo internal units (just like fund does!)
    const amountInTongo = await this.tongoAccount.erc20ToTongo(amountInToken);

    console.log('[TRANSFER] Sending private donation:', {
      inputTokenAmount: amountInToken.toString(),
      tongoAmount: amountInTongo.toString(),
      tokenName,
      recipient: recipientPublicKey.slice(0, 30) + '...'
    });

    try {
      // Get current state to validate balance
      const accountState = await this.tongoAccount.state();

      console.log('[TRANSFER] Balance check:', {
        currentBalance: accountState.balance.toString(),
        amountToSend: amountInTongo.toString(),
        sufficient: accountState.balance >= amountInTongo
      });

      if (accountState.balance < amountInTongo) {
        // Convert back to human-readable for error message
        try {
          const balanceToken = await this.tongoAccount.tongoToErc20(accountState.balance);
          const amountToken = await this.tongoAccount.tongoToErc20(amountInTongo);
          const balanceHuman = (Number(balanceToken) / Math.pow(10, tokenDecimals)).toFixed(tokenDecimals <= 6 ? 2 : 6);
          const amountHuman = (Number(amountToken) / Math.pow(10, tokenDecimals)).toFixed(tokenDecimals <= 6 ? 2 : 6);
          throw new Error(
            `Insufficient balance: You have ${balanceHuman} ${tokenName} but tried to send ${amountHuman} ${tokenName}`
          );
        } catch (e) {
          throw new Error(
            `Insufficient balance: ${accountState.balance} < ${amountInTongo}`
          );
        }
      }

      // Convert recipient public key string to PubKey format
      const recipientPubKey = this.parsePublicKey(recipientPublicKey);

      // Create Transfer operation
      // SDK handles all ZK proof generation
      // CRITICAL: Use wallet's EXACT address format (no padding) so ZK proof matches transaction sender
      const transferOperation = await this.tongoAccount.transfer({
        to: recipientPubKey,
        amount: amountInTongo,
        sender: this.starknetAccount.address  // Use wallet's exact address format (matches TX sender)
      });

      console.log('[TRANSFER] Generated Transfer operation:', transferOperation);

      // Handle toCalldata() return value - may be Call object or calldata array
      const transferCallResult = transferOperation.toCalldata();
      let transferCall: Call;

      if (transferCallResult && typeof transferCallResult === 'object' && 'contractAddress' in transferCallResult) {
        transferCall = transferCallResult as Call;
      } else if (Array.isArray(transferCallResult)) {
        transferCall = {
          contractAddress: this.tongoContractAddress,
          entrypoint: 'transfer',
          calldata: transferCallResult
        };
      } else {
        throw new Error('Invalid transfer operation format');
      }

      const tx = await this.starknetAccount.execute([transferCall]);

      console.log(`[TRANSFER] Transaction hash: ${tx.transaction_hash}`);

      // Update state after transaction
      await this.refreshState();

      return tx.transaction_hash;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[TRANSFER] Error:', errorMessage);
      throw new Error(`Transfer operation failed: ${errorMessage}`);
    }
  }

  /**
   * ROLLOVER: Move pending balance to current balance
   * Flow:
   * 1. User has received donations (pending balance)
   * 2. To use them, must explicitly "rollover"
   * 3. Adds pending to current, clears pending
   */
  async rolloverBalance(): Promise<string> {
    console.log('[ROLLOVER] Rolling over pending to current balance');

    try {
      // CRITICAL: Use wallet's EXACT address format (no padding) so ZK proof matches transaction sender
      const rolloverOperation = await this.tongoAccount.rollover({
        sender: this.starknetAccount.address  // Use wallet's exact address format (matches TX sender)
      });

      console.log('[ROLLOVER] Generated Rollover operation:', rolloverOperation);

      // Handle toCalldata() return value - may be Call object or calldata array
      const rolloverCallResult = rolloverOperation.toCalldata();
      let rolloverCall: Call;

      if (rolloverCallResult && typeof rolloverCallResult === 'object' && 'contractAddress' in rolloverCallResult) {
        rolloverCall = rolloverCallResult as Call;
      } else if (Array.isArray(rolloverCallResult)) {
        rolloverCall = {
          contractAddress: this.tongoContractAddress,
          entrypoint: 'rollover',
          calldata: rolloverCallResult
        };
      } else {
        throw new Error('Invalid rollover operation format');
      }

      const tx = await this.starknetAccount.execute([rolloverCall]);

      console.log(`[ROLLOVER] Transaction hash: ${tx.transaction_hash}`);

      // Update state after transaction
      await this.refreshState();

      return tx.transaction_hash;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[ROLLOVER] Error:', errorMessage);
      throw new Error(`Rollover operation failed: ${errorMessage}`);
    }
  }

  /**
   * WITHDRAW: Convert encrypted Tongo to STRK
   * Flow:
   * 1. Create Withdraw operation for amount
   * 2. SDK generates ZK proof of ownership + balance
   * 3. Submit to contract (amount is PUBLIC in logs)
   */
  async withdrawDonations(amountInTongo: bigint): Promise<string> {
    console.log(`[WITHDRAW] Withdrawing ${amountInTongo} Tongo`);

    try {
      // Get current state to validate balance
      const accountState = await this.tongoAccount.state();
      if (accountState.balance < amountInTongo) {
        throw new Error(
          `Insufficient balance: ${accountState.balance} < ${amountInTongo}`
        );
      }

      // Create Withdraw operation
      // CRITICAL: Use wallet's EXACT address format (no padding) so ZK proof matches transaction sender
      const withdrawOperation = await this.tongoAccount.withdraw({
        amount: amountInTongo,
        to: this.starknetAccount.address,     // Use wallet's exact address format (matches TX sender)
        sender: this.starknetAccount.address  // Use wallet's exact address format (matches TX sender)
      });

      console.log('[WITHDRAW] Generated Withdraw operation:', withdrawOperation);

      // Handle toCalldata() return value - may be Call object or calldata array
      const withdrawCallResult = withdrawOperation.toCalldata();
      let withdrawCall: Call;

      if (withdrawCallResult && typeof withdrawCallResult === 'object' && 'contractAddress' in withdrawCallResult) {
        withdrawCall = withdrawCallResult as Call;
      } else if (Array.isArray(withdrawCallResult)) {
        withdrawCall = {
          contractAddress: this.tongoContractAddress,
          entrypoint: 'withdraw',
          calldata: withdrawCallResult
        };
      } else {
        throw new Error('Invalid withdraw operation format');
      }

      const tx = await this.starknetAccount.execute([withdrawCall]);

      console.log(`[WITHDRAW] Transaction hash: ${tx.transaction_hash}`);

      // Update state after transaction
      await this.refreshState();

      return tx.transaction_hash;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[WITHDRAW] Error:', errorMessage);
      throw new Error(`Withdraw operation failed: ${errorMessage}`);
    }
  }

  /**
   * Get current state (for UI display)
   */
  getState(): TongoDonationState {
    return { ...this.state };
  }

  /**
   * Get wallet balance (ERC20 token balance)
   * Returns the actual USDC/STRK balance in the connected wallet
   */
  async getWalletBalance(): Promise<bigint> {
    try {
      console.log('[WALLET-BALANCE] Fetching ERC20 balance...', {
        tokenAddress: this.strkAddress,
        walletAddress: this.starknetAccount.address,
      });

      // Call balanceOf using callContract directly
      const balanceResult = await this.provider.callContract({
        contractAddress: this.strkAddress,
        entrypoint: 'balanceOf',
        calldata: [this.starknetAccount.address],
      });

      // Parse the result - balanceOf returns Uint256 [low, high]
      // balanceResult can be string[] directly or an object with result property
      const result = (balanceResult as any).result || balanceResult;
      const balanceArray = Array.isArray(result) ? result : [result, '0x0'];
      const [low, high] = balanceArray;

      // Convert Uint256 to BigInt
      const balanceValue = BigInt(low) + (BigInt(high) << 128n);

      const isMainnet = this.strkAddress.toLowerCase() === '0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8';
      const tokenDecimals = isMainnet ? 6 : 18;
      const tokenName = isMainnet ? 'USDC' : 'STRK';

      console.log('[WALLET-BALANCE] Wallet balance:', {
        raw: balanceValue.toString(),
        decimals: tokenDecimals,
        humanReadable: (Number(balanceValue) / Math.pow(10, tokenDecimals)).toFixed(tokenDecimals === 6 ? 2 : 6),
        token: tokenName,
      });

      return balanceValue;
    } catch (error) {
      console.error('[WALLET-BALANCE] Failed to fetch wallet balance:', error);
      throw new Error(`Failed to get wallet balance: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Refresh state from blockchain
   */
  async refreshState(): Promise<void> {
    try {
      console.log('[REFRESH] Getting Tongo account state...');
      console.log('[REFRESH] Tongo account:', this.tongoAccount);
      console.log('[REFRESH] Tongo contract address:', this.tongoContractAddress);
      console.log('[REFRESH] Starknet address:', this.starknetAddress);

      // Get fresh account state from blockchain
      // Note: state() might be a method or property depending on SDK version
      let accountState: any;
      if (typeof this.tongoAccount.state === 'function') {
        accountState = await this.tongoAccount.state();
      } else {
        accountState = await (this.tongoAccount as any).getState?.() || this.tongoAccount.state;
      }

      console.log('[REFRESH] Raw account state object:', accountState);
      console.log('[REFRESH] Account state type:', typeof accountState);
      console.log('[REFRESH] Account state keys:', accountState ? Object.keys(accountState) : 'null');

      // Log all properties for debugging
      if (accountState) {
        for (const key in accountState) {
          const value = accountState[key];
          console.log(`[REFRESH] ${key}:`, value, typeof value, value?.toString?.());
        }
      }

      // Determine if we're on mainnet (USDC) or testnet (STRK)
      const isMainnet = this.strkAddress.toLowerCase() === '0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8';
      const tokenName = isMainnet ? 'USDC' : 'STRK';
      const tokenDecimals = isMainnet ? 6 : 18;

      // Handle balance - Tongo stores in INTERNAL UNITS, not token decimals!
      if (accountState && ('balance' in accountState)) {
        const balanceValue = accountState.balance;
        if (balanceValue !== undefined && balanceValue !== null) {
          const balance = typeof balanceValue === 'bigint'
            ? balanceValue
            : BigInt(String(balanceValue));

          // Store RAW Tongo balance (don't multiply by decimals!)
          this.state.currentBalance = balance;

          // Convert to token amount for display
          try {
            const tokenAmount = await this.tongoAccount.tongoToErc20(balance);
            const displayAmount = (Number(tokenAmount) / Math.pow(10, tokenDecimals)).toFixed(tokenDecimals === 6 ? 2 : 6);
            console.log(`[REFRESH] Current balance (Tongo internal units): ${balance.toString()}, equivalent to ${displayAmount} ${tokenName}`);
          } catch (e) {
            console.log(`[REFRESH] Current balance (Tongo internal units): ${balance.toString()}`);
          }
        } else {
          this.state.currentBalance = 0n;
          console.log('[REFRESH] Balance is null/undefined, setting to 0');
        }
      } else {
        this.state.currentBalance = 0n;
        console.log('[REFRESH] No balance property found in account state');
      }

      // Handle pending balance
      if (accountState && ('pending' in accountState)) {
        const pendingValue = accountState.pending;
        if (pendingValue !== undefined && pendingValue !== null) {
          const pending = typeof pendingValue === 'bigint'
            ? pendingValue
            : BigInt(String(pendingValue));

          // Store RAW Tongo balance (don't multiply!)
          this.state.pendingBalance = pending;

          // Convert to token amount for display
          try {
            const tokenAmount = await this.tongoAccount.tongoToErc20(pending);
            const displayAmount = (Number(tokenAmount) / Math.pow(10, tokenDecimals)).toFixed(tokenDecimals === 6 ? 2 : 6);
            console.log(`[REFRESH] Pending balance (Tongo internal units): ${pending.toString()}, equivalent to ${displayAmount} ${tokenName}`);
          } catch (e) {
            console.log(`[REFRESH] Pending balance (Tongo internal units): ${pending.toString()}`);
          }
        } else {
          this.state.pendingBalance = 0n;
          console.log('[REFRESH] Pending is null/undefined, setting to 0');
        }
      } else {
        this.state.pendingBalance = 0n;
        console.log('[REFRESH] No pending property found in account state');
      }

      // Handle nonce
      if (accountState && ('nonce' in accountState)) {
        const nonceValue = accountState.nonce;
        if (nonceValue !== undefined && nonceValue !== null) {
          this.state.nonce = typeof nonceValue === 'number'
            ? nonceValue
            : Number(nonceValue);
          console.log('[REFRESH] Nonce:', this.state.nonce);
        }
      }

      console.log('[REFRESH] State updated successfully');
      console.log('[REFRESH] Final state:', {
        currentBalance: this.state.currentBalance.toString(),
        pendingBalance: this.state.pendingBalance.toString(),
        nonce: this.state.nonce
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : '';
      console.error('[REFRESH] Failed to refresh state:', error);
      console.error('[REFRESH] Error stack:', errorStack);
      throw new Error(`Failed to refresh account state: ${errorMsg}`);
    }
  }

  /**
   * Parse public key string to PubKey format
   * Supports both base58 (TongoAddress) and hex formats
   * Hex format can be:
   * - Full affine coordinates: "0x<x><y>" (128 hex chars = 64 bytes each)
   * - Compressed point: "0x<compressed>" (66 hex chars = 33 bytes)
   */
  private parsePublicKey(pubKeyString: string): { x: bigint; y: bigint } {
    try {
      // Trim whitespace
      const trimmed = pubKeyString.trim();

      // Try parsing as base58 (TongoAddress format) - no 0x prefix
      if (!trimmed.startsWith('0x')) {
        return pubKeyBase58ToAffine(trimmed);
      }

      // Hex format - try to parse as affine coordinates
      const hexValue = trimmed.slice(2); // Remove 0x prefix

      // If it's 128 hex chars (64 bytes), it's likely full affine coordinates
      if (hexValue.length === 128) {
        const xHex = hexValue.slice(0, 64);
        const yHex = hexValue.slice(64, 128);
        return {
          x: BigInt('0x' + xHex),
          y: BigInt('0x' + yHex)
        };
      }

      // If it's 66 hex chars (33 bytes), it's a compressed point
      // For Stark curve, compressed points need decompression
      // This is a simplified approach - in production, use proper curve library
      if (hexValue.length === 66) {
        throw new Error(
          'Compressed point format detected. Please provide full affine coordinates (x, y) ' +
          'or use base58 TongoAddress format. Expected format: 0x<x64hex><y64hex> (128 hex chars total)'
        );
      }

      // If it's 64 hex chars, might be just x coordinate (unlikely but handle it)
      if (hexValue.length === 64) {
        throw new Error(
          'Incomplete public key. Please provide both x and y coordinates: ' +
          '0x<x64hex><y64hex> (128 hex chars total) or use base58 TongoAddress format'
        );
      }

      throw new Error(
        `Invalid hex format. Expected 128 hex chars (64 bytes each for x and y) ` +
        `or base58 TongoAddress format. Got ${hexValue.length} hex chars.`
      );
    } catch (error) {
      if (error instanceof Error && error.message.includes('Invalid hex format')) {
        throw error;
      }
      throw new Error(
        `Failed to parse public key: ${error instanceof Error ? error.message : String(error)}. ` +
        `Supported formats: base58 TongoAddress or hex 0x<x64hex><y64hex>`
      );
    }
  }

  /**
   * Convert Tongo internal units to human-readable token amount
   */
  async tongoToDisplayAmount(tongoAmount: bigint): Promise<string> {
    try {
      // Use SDK's conversion (reverse of erc20ToTongo)
      const tokenAmount = await this.tongoAccount.tongoToErc20(tongoAmount);
      const isMainnet = this.strkAddress.toLowerCase() ===
        '0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8';
      const tokenDecimals = isMainnet ? 6 : 18;
      const tokenName = isMainnet ? 'USDC' : 'STRK';

      return `${(Number(tokenAmount) / Math.pow(10, tokenDecimals)).toFixed(tokenDecimals <= 6 ? 2 : 6)} ${tokenName}`;
    } catch (e) {
      // Fallback: assume 1:1 ratio with basic formatting
      return `${tongoAmount.toString()} units`;
    }
  }

  /**
   * Get maximum sendable amount in token units
   */
  async getMaxSendableAmount(): Promise<{ tongoUnits: bigint; tokenAmount: bigint; display: string }> {
    const accountState = await this.tongoAccount.state();
    const tongoUnits = accountState.balance;

    try {
      const tokenAmount = await this.tongoAccount.tongoToErc20(tongoUnits);
      const display = await this.tongoToDisplayAmount(tongoUnits);
      return { tongoUnits, tokenAmount, display };
    } catch (e) {
      return { tongoUnits, tokenAmount: tongoUnits, display: `${tongoUnits} units` };
    }
  }
}


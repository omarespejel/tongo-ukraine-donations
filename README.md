# 🎭 Tongo Private Donation Demo

A web-based frontend for private donations on Starknet using Tongo Cash protocol. This demo enables users to:

- Connect Starknet wallets (Braavos, Argent X)
- Fund their Tongo account with USDC (mainnet) or STRK (testnet)
- Send private donations to recipients (amounts hidden via ZK proofs)
- Withdraw encrypted balances back to standard tokens
- Rollover pending balances to current balance

## Key Technology Stack

- **Tongo SDK** (TypeScript) - `@fatsolutions/tongo-sdk` v1.3.0
- **Starknet.js** v8.9.1 - For Starknet interactions
- **get-starknet** v3.3.3 - Wallet connection SDK
- **Vite** - Build tool and dev server
- **Bun** - Package manager and runtime
- **Vanilla TypeScript/HTML** - No framework dependencies

## 🚀 Quick Start

### Prerequisites

- **Bun** installed ([install bun](https://bun.sh))
- **Braavos** or **Argent X** wallet extension installed in your browser
- **USDC** (mainnet) or **STRK** (testnet) tokens in your wallet
- **Alchemy API key** (for RPC access) - Get one at [alchemy.com](https://www.alchemy.com)

### Installation

1. **Clone and install dependencies:**

```bash
git clone <repository-url>
cd tongo-donation-demo
bun install
```

2. **Set up environment variables (optional, for CLI demo only):**

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` with your Alchemy API key:
- `STARKNET_MAINNET_RPC_URL`: Your Alchemy mainnet RPC URL
- `STARKNET_SEPOLIA_RPC_URL`: Your Alchemy Sepolia RPC URL

**Note**: For browser usage, RPC URLs are configured in `src/wallet-config.ts`. The `.env` file is only needed for the CLI demo (`bun run demo`).

3. **Start the development server:**

```bash
bun run dev:web
```

4. **Open in browser:**

Navigate to `http://localhost:5173` (or the port shown in terminal)

5. **Connect your wallet:**

- Click "Connect Wallet"
- Select Braavos or Argent X
- Approve the connection
- Your Tongo private key will be auto-generated and stored in browser localStorage

## 📁 Project Structure

```
tongo-donation-demo/
├── .env                    # Environment variables (create from .env.example)
├── .env.example            # Template for environment variables
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── src/
│   ├── config.ts           # Configuration and provider setup
│   ├── types.ts            # TypeScript type definitions
│   ├── tongo-service.ts    # Core Tongo operations wrapper
│   ├── demo.ts             # CLI demo script
│   └── index.html          # Hacker-style frontend UI
├── dist/                   # Compiled JavaScript (generated)
└── README.md               # This file
```

## 🔐 How Tongo Works

### Key Concepts

**1. ElGamal Encryption on Stark Curve**
- Each user has a keypair: `(x, y = g^x)` where `g` is the Stark curve generator
- Public key `y` serves as account identifier
- Balances stored as ElGamal ciphertexts: `Enc[y](b, r) = (g^b * y^r, g^r)`
- Additively homomorphic = balance operations without decryption

**2. Two-Balance Model**
- **Current Balance**: Amount user can spend (requires ZK proof to modify)
- **Pending Balance**: Amount received through transfers (user must "rollover" to use)

**3. Core Operations**

| Operation | Purpose | Visibility | Constraint |
|-----------|---------|------------|-----------|
| **Fund** | Convert ERC20 → Encrypted balance | Amount PUBLIC | Owner only |
| **Transfer** | Send encrypted amount | Amount HIDDEN | Ownership + sufficient balance |
| **Rollover** | Move pending → current | Internal | Owner only |
| **Withdraw** | Convert encrypted → ERC20 | Amount PUBLIC | Ownership + sufficient balance |

**4. Security Measures**
- **No proof reuse**: Each proof includes `chain_id`, `contract_address`, `nonce`
- **TX sender whitelist**: Proof valid only if executed by designated Starknet account
- **Balance integrity**: All balance modifications validated with ZK proofs

## 💻 Usage Examples

### Fund Account

```typescript
import { TongoService } from './tongo-service';
import { starknetAccount } from './config';

const service = new TongoService(starknetAccount.address);
const txHash = await service.fundDonationAccount(
  BigInt('100000000000000000000') // 100 STRK (18 decimals)
);
```

### Send Private Donation

```typescript
// Recipient's Tongo public key (base58 format)
const recipientPublicKey = 'recipient_tongo_address_base58';

const txHash = await service.sendPrivateDonation(
  recipientPublicKey,
  BigInt('50000000000000000000') // 50 STRK
);
```

### Rollover Pending Balance

```typescript
// After receiving donations, move them to current balance
const txHash = await service.rolloverBalance();
```

### Withdraw to Wallet

```typescript
const txHash = await service.withdrawDonations(
  BigInt('25000000000000000000') // 25 STRK
);
```

## 🎨 Frontend Features

The web frontend (`src/index.html`) provides:

- **Wallet Connection**: Connect Braavos or Argent X wallets
- **Network Selection**: Switch between Mainnet (USDC) and Sepolia (STRK)
- **Account Status Panel**: View Tongo public key, current balance, pending balance, wallet balance
- **Fund Account**: Convert USDC/STRK to encrypted Tongo balance
- **Send Donation**: Send private donations (amounts hidden via ZK proofs)
- **Withdraw**: Convert encrypted balance back to USDC/STRK
- **Rollover**: Move pending balance to current balance
- **Operation Logs**: Real-time transaction logs and status updates
- **Key Management**: Backup and download Tongo private key

## 🔧 Configuration

### Deployed Contracts

#### Mainnet
- **Tongo Contract**: `0x0415f2c3b16cc43856a0434ed151888a5797b6a22492ea6fd41c62dbb4df4e6c`
- **USDC Token**: `0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8`
- **RPC**: Configured in `src/wallet-config.ts` (uses Alchemy)

#### Sepolia Testnet
- **Tongo Contract**: `0x00b4cca30f0f641e01140c1c388f55641f1c3fe5515484e622b6cb91d8cee585`
- **STRK Token**: `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d`
- **RPC**: Configured in `src/wallet-config.ts` (uses Alchemy)

## 🔑 Tongo Private Key

The Tongo private key is **automatically generated** if you don't provide one in your `.env` file. This key is:

- **Different from your Starknet private key** (used only for Tongo account encryption)
- **Randomly generated** (32 bytes) if not provided
- **Critical to save** - if you lose it, you lose access to your Tongo balance

### Manual Generation (Optional)

If you want to generate it manually:

```bash
bun -e "console.log('0x' + require('crypto').randomBytes(32).toString('hex'))"
```

Then add it to your `.env` file as `TONGO_PRIVATE_KEY=0x...`

### Auto-Generation

If you don't set `TONGO_PRIVATE_KEY` in your `.env`, the system will:
1. Generate a random 32-byte key on first run
2. Display it in the console
3. Use it for the current session

**⚠️ Important**: Copy the generated key to your `.env` file to persist it!

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Module not found" | Run `bun install` |
| Private key error | Check `.env` file values or let it auto-generate |
| RPC connection failed | Verify `STARKNET_RPC_URL` |
| Insufficient balance | Fund account first |
| TX fails with nonce error | SDK handles nonces automatically |
| Browser CORS errors | Use dev server, not `file://` |
| Lost Tongo private key | Cannot recover - generate new account |

## 📚 References

- **Tongo Docs**: https://docs.tongo.cash/
- **Tongo SDK**: `@fatsolutions/tongo-sdk` on npm (installable via bun)
- **Starknet.js**: https://docs.starknetjs.com/
- **Deployed Contracts**: https://docs.tongo.cash/protocol/contracts.html

## 🚧 Next Steps

After this demo works:

1. **Add wallet connection** (Argent, Braavos) for frontend
2. **Persist donation history** (localStorage or backend)
3. **Add QR code** for public key sharing
4. **Deploy to Starknet mainnet** (optional)
5. **Add compliance auditor support** (advanced feature)
6. **Build donation leaderboard** (amounts stay private, totals public)

## 📝 Privacy Model

| Operation | Amount Visibility |
|-----------|------------------|
| Fund | ✅ PUBLIC (on-chain logs) |
| Transfer | ✅ HIDDEN (ZK encrypted) |
| Rollover | ⚫ INTERNAL (only owner sees) |
| Withdraw | ✅ PUBLIC (on-chain logs) |

**Key Insight**: Transfers are FULLY HIDDEN. Only sender/receiver know amounts (via private viewing keys).

## ⚡ ZK Proof Magic

All operations automatically handled by SDK:

- Proof generation (no manual work)
- Chain ID / contract address / nonce binding
- Ownership verification
- Balance integrity checks

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details

## 🙏 Attribution

- **Starknet.js** - https://github.com/starknet-io/starknet.js
- **Tongo SDK** - https://github.com/fatsolutions/tongo-sdk
- **get-starknet** - https://github.com/starknet-io/get-starknet

---

✨ Happy hacking!


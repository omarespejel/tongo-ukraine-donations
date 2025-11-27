# Tongo Private Donation Demo

A web-based frontend for private donations on Starknet using the Tongo Cash protocol. This demo enables users to connect their wallets, fund encrypted Tongo accounts, and send private donations where amounts are hidden via zero-knowledge proofs.

## Features

- Wallet integration with Braavos and Argent X
- Network support for Mainnet (USDC) and Sepolia testnet (STRK)
- Fund operations: Convert USDC/STRK to encrypted Tongo balance
- Private donations: Send encrypted amounts (amounts hidden via ZK proofs)
- Withdraw operations: Convert encrypted balance back to tokens
- Rollover: Move pending balance to current balance
- Real-time balance display and transaction logging
- Tongo private key management with backup functionality

## Technology Stack

- Tongo SDK v1.3.0 - Zero-knowledge proof generation and encryption
- Starknet.js v8.9.1 - Starknet blockchain interactions
- get-starknet v3.3.3 - Wallet connection SDK
- Vite - Build tool and development server
- Bun - Package manager and runtime
- TypeScript - Type-safe development

## Prerequisites

- Bun runtime ([install bun](https://bun.sh))
- Braavos or Argent X wallet extension installed in your browser
- USDC (mainnet) or STRK (testnet) tokens in your wallet
- Alchemy API key for RPC access ([get one here](https://www.alchemy.com))

## Installation

1. Clone the repository:

```bash
git clone https://github.com/omarespejel/tongo-ukraine-donations.git
cd tongo-ukraine-donations
```

2. Install dependencies:

```bash
bun install
```

3. Configure RPC URLs (optional, for CLI demo):

Copy `.env.example` to `.env` and add your Alchemy API keys:

```bash
cp .env.example .env
```

Edit `.env` with your Alchemy RPC URLs:
- `STARKNET_MAINNET_RPC_URL`: Your Alchemy mainnet RPC URL
- `STARKNET_SEPOLIA_RPC_URL`: Your Alchemy Sepolia RPC URL

Note: For browser usage, RPC URLs are configured in `src/wallet-config.ts`. The `.env` file is only needed for the CLI demo (`bun run demo`).

## Usage

### Web Frontend

Start the development server:

```bash
bun run dev:web
```

Open your browser to `http://localhost:5173` (or the port shown in terminal).

1. Click "Connect Wallet" and select Braavos or Argent X
2. Approve the wallet connection
3. Your Tongo private key will be auto-generated and stored in browser localStorage
4. Select your network (Mainnet for USDC or Sepolia for STRK)
5. Fund your account, send donations, or withdraw as needed

### CLI Demo

For a command-line demonstration:

```bash
bun run demo
```

This requires `.env` configuration with `STARKNET_ACCOUNT_ADDRESS` and `STARKNET_PRIVATE_KEY`.

## Project Structure

```
tongo-donation-demo/
├── src/
│   ├── index.html          # Web frontend
│   ├── tongo-service.ts    # Core Tongo operations wrapper
│   ├── wallet-config.ts    # Wallet connection and network config
│   ├── tongo-key-manager.ts # Tongo private key management
│   ├── config.ts           # Configuration and provider setup
│   ├── types.ts            # TypeScript type definitions
│   └── demo.ts             # CLI demo script
├── .env.example            # Environment variable template
├── .gitignore             # Git ignore rules
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── vite.config.ts         # Vite build configuration
└── README.md              # This file
```

## Configuration

### Deployed Contracts

#### Mainnet
- Tongo Contract: `0x0415f2c3b16cc43856a0434ed151888a5797b6a22492ea6fd41c62dbb4df4e6c`
- USDC Token: `0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8`
- RPC: Configured in `src/wallet-config.ts` (uses Alchemy)

#### Sepolia Testnet
- Tongo Contract: `0x00b4cca30f0f641e01140c1c388f55641f1c3fe5515484e622b6cb91d8cee585`
- STRK Token: `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d`
- RPC: Configured in `src/wallet-config.ts` (uses Alchemy)

## How Tongo Works

### Key Concepts

**ElGamal Encryption on Stark Curve**
- Each user has a keypair: `(x, y = g^x)` where `g` is the Stark curve generator
- Public key `y` serves as account identifier
- Balances stored as ElGamal ciphertexts: `Enc[y](b, r) = (g^b * y^r, g^r)`
- Additively homomorphic: balance operations work without decryption

**Two-Balance Model**
- Current Balance: Amount user can spend (requires ZK proof to modify)
- Pending Balance: Amount received through transfers (user must "rollover" to use)

**Core Operations**

| Operation | Purpose | Visibility | Constraint |
|-----------|---------|------------|-----------|
| Fund | Convert ERC20 → Encrypted balance | Amount PUBLIC | Owner only |
| Transfer | Send encrypted amount | Amount HIDDEN | Ownership + sufficient balance |
| Rollover | Move pending → current | Internal | Owner only |
| Withdraw | Convert encrypted → ERC20 | Amount PUBLIC | Ownership + sufficient balance |

**Security Measures**
- No proof reuse: Each proof includes `chain_id`, `contract_address`, `nonce`
- TX sender whitelist: Proof valid only if executed by designated Starknet account
- Balance integrity: All balance modifications validated with ZK proofs

## Tongo Private Key

The Tongo private key is automatically generated when you first connect your wallet. This key is:

- Different from your Starknet private key (used only for Tongo account encryption)
- Randomly generated (32 bytes) if not provided
- Critical to save - if you lose it, you lose access to your Tongo balance

The key is stored in browser `localStorage` for web usage, or can be set via `TONGO_PRIVATE_KEY` environment variable for CLI usage.

### Manual Generation (Optional)

If you want to generate it manually:

```bash
node -e "console.log('0x' + require('crypto').randomBytes(32).toString('hex'))"
```

Then add it to your `.env` file as `TONGO_PRIVATE_KEY=0x...`

## Development

### Build

TypeScript compilation:

```bash
bun run build
```

Web build (Vite):

```bash
bun run build:web
```

### Type Checking

```bash
bun run type-check
```

### Preview Production Build

```bash
bun run preview
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Module not found | Run `bun install` |
| Private key error | Check `.env` file values or let it auto-generate |
| RPC connection failed | Verify `STARKNET_RPC_URL` or check `wallet-config.ts` |
| Insufficient balance | Fund account first |
| TX fails with nonce error | SDK handles nonces automatically |
| Browser CORS errors | Use dev server, not `file://` |
| Lost Tongo private key | Cannot recover - generate new account |
| "NowOwner" error | See address format handling in code - should be auto-patched |

## Known Issues

- Address format sensitivity: Addresses must be consistently formatted (65 vs 66 characters). The code includes automatic padding to handle this.
- SDK address conversion: The Tongo SDK converts addresses to numbers, which can lose leading zeros. The code automatically patches approve calldata to use correct padded addresses.

## Privacy Model

| Operation | Amount Visibility |
|-----------|------------------|
| Fund | PUBLIC (on-chain logs) |
| Transfer | HIDDEN (ZK encrypted) |
| Rollover | INTERNAL (only owner sees) |
| Withdraw | PUBLIC (on-chain logs) |

Key insight: Transfers are fully hidden. Only sender and receiver know amounts (via private viewing keys).

## ZK Proof Implementation

All operations are automatically handled by the SDK:

- Proof generation (no manual work required)
- Chain ID / contract address / nonce binding
- Ownership verification
- Balance integrity checks

The SDK generates zero-knowledge proofs that prove ownership and sufficient balance without revealing the actual balance amount.

## References

- Tongo Documentation: https://docs.tongo.cash/
- Tongo SDK: https://github.com/fatsolutions/tongo-sdk
- Starknet.js: https://docs.starknetjs.com/
- Deployed Contracts: https://docs.tongo.cash/protocol/contracts.html

## License

MIT License - See [LICENSE](LICENSE) file for details

## Attribution

- Starknet.js - https://github.com/starknet-io/starknet.js
- Tongo SDK - https://github.com/fatsolutions/tongo-sdk
- get-starknet - https://github.com/starknet-io/get-starknet

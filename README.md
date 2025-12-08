# Starknet Privacy Toolkit (Tongo + Verified Donor Badges)

This repository hosts an end-to-end reference implementation of Starknet privacy tooling. It combines two reference demos that share the same UI and contracts:
1. A “Verified Donor Badge” flow that uses Noir circuits, Barretenberg proofs, Garaga-generated Cairo verifiers, and a Starknet badge contract to prove a donor met a threshold without revealing the amount.
2. The Tongo private donation experience, showing how to fund, send, rollover, and withdraw encrypted balances on Starknet Mainnet (USDC) and Sepolia (STRK).

> The goal of this README is to serve technical builders who want to reproduce or extend the flow—not to advertise a hackathon submission.

---

## System Overview

| Layer | Component | Purpose |
| ----- | --------- | ------- |
| Tongo Private Donations | `src/*.ts`, on-chain contracts in `src/wallet-config.ts` | Zero-knowledge wallet that hides STRK/USDC transfers while keeping fund/withdraw events public. Runs on Sepolia (STRK) and Mainnet (USDC). |
| ZK Circuit | `zk-badges/donation_badge` | Noir circuit that hashes `(donation_amount, donor_secret)` with Poseidon and enforces `donation_amount >= threshold`. |
| Proving | Barretenberg `0.67.0` | Generates Ultra Keccak Honk proofs + VK compatible with Garaga 0.15.5. |
| Verifier | `donation_badge_verifier` | Garaga-generated verifier plus custom `DonationBadge` contract that mints tiered badges after proof validation. |
| Backend | `api/generate-proof.ts` | Bun API that orchestrates witness creation, proving, and calldata generation. |
| Frontend | `src/web/index.html` + `src/badge-service.ts` | Unified UI: funding/withdrawals follow the selected Starknet network, while the badge experience is currently hard-pinned to Sepolia. |

> **Important:** The badge verifier is deployed only on **Starknet Sepolia** today. The UI always connects to Sepolia for badge proofs/claims even when the network toggle is on Mainnet for Tongo operations.

### Deployed Contracts

| Network | Component | Address | Notes |
| ------- | --------- | ------- | ----- |
| **Mainnet** | Tongo Donation Contract | `0x72098b84989a45cc00697431dfba300f1f5d144ae916e98287418af4e548d96` | Accepts USDC (see token below) |
| Mainnet | USDC Token | `0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8` | ERC20 used for funding/withdraw |
| **Sepolia** | Tongo Donation Contract | `0x00b4cca30f0f641e01140c1c388f55641f1c3fe5515484e622b6cb91d8cee585` | Testnet STRK version |
| Sepolia | STRK Token | `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d` | Testnet token used in UI |
| Sepolia | `DonationBadge` Contract | `0x077ca6f2ee4624e51ed6ea6d5ca292889ca7437a0c887bf0d63f055f42ad7010` | Mints badge tiers after proof verification |
| Sepolia | `UltraKeccakHonkVerifier` | `0x022b20fef3764d09293c5b377bc399ae7490e60665797ec6654d478d74212669` | Garaga-generated verifier used by badge contract |

Deployment metadata lives in `deployments/`, and the frontend consumes it via `src/deployments.ts`. Add a new `<network>.json` file when you deploy additional environments.

---

## Status Checklist

- ✅ Noir circuit compiles (Noir `1.0.0-beta.1`)
- ✅ Verifier contract declared + deployed on Sepolia (Garaga `0.15.5`, Scarb `2.9.2`)
- ✅ Proof verified on-chain via `sncast call`
- ✅ Repository is structured + committed
- ✅ README rewritten for engineers
- ✅ Tongo + badge frontend aligned (badges hard-pinned to Sepolia)
- ⬜ Demo video (out of scope for repo)
- ⬜ Devpost submission (handled externally)

---

## Tech Stack

- **Noir** `1.0.0-beta.1` + Poseidon dependency
- **Barretenberg** `0.67.0` (Ultra Keccak Honk backend)
- **Garaga** `0.15.5` for Cairo verifier generation
- **Scarb** `2.9.2` (Cairo build)
- **Starknet Foundry** (`sncast`, `snforge`) for declares/deploys
- **Starkli** for manual invocations
- **Bun + TypeScript** for frontend/API

Version pinning is critical; mismatched bb/Garaga/Noir combinations will produce incompatible proofs. See `BADGE_SETUP.md` for the downgrade narrative.

---

## Repository Layout (Key Files Only)

```
zk-badges/
  └── donation_badge/
      ├── src/main.nr          # Noir circuit
      ├── Nargo.toml           # Noir manifest (Poseidon dep)
      ├── compute_commitment.js# Poseidon commitment helper
      └── generate-proof.sh    # One-touch proof pipeline

donation_badge_verifier/
  ├── Scarb.toml               # Garaga project manifest
  ├── src/honk_verifier*.cairo # Generated verifier modules
  ├── src/badge_contract.cairo # Custom contract that mints badges
  └── snfoundry.toml           # Deployment profile (Sepolia)

deployments/
  └── sepolia.json             # Contract registry consumed by frontend

src/
  ├── index.html               # Demo UI with badge section
  ├── badge-service.ts         # Client helper for proofs + badge contract
  └── deployments.ts           # Loader for deployment JSON files

api/generate-proof.ts          # Bun API endpoint to invoke Noir/bb/Garaga
BADGE_IMPLEMENTATION.md        # Requirements + architecture notes
BADGE_SETUP.md                 # Environment + troubleshooting log
DEPLOY.md                      # Pages deploy + deployment registry policy
```

### Per-directory guides

- [`zk-badges/README.md`](zk-badges/README.md) – Noir circuit + proof generation instructions.
- [`donation_badge_verifier/README.md`](donation_badge_verifier/README.md) – Garaga verifier + badge contract build/deploy guide.
- Additional deep dives: [`BADGE_SETUP.md`](BADGE_SETUP.md) (toolchain troubleshooting) and [`BADGE_IMPLEMENTATION.md`](BADGE_IMPLEMENTATION.md) (design notes). Refer to those docs to avoid duplicating version tables elsewhere.

---

## Getting Started

### 🐳 Docker (Recommended - Zero Setup)

**The easiest way to run this project is with Docker.** All dependencies are pre-installed and configured.

**Quick Start (3 steps):**

1. **Install Docker Desktop**: [Download here](https://www.docker.com/products/docker-desktop)

2. **Clone and configure**:
   ```bash
   git clone https://github.com/omarespejel/tongo-ukraine-donations.git
   cd starknet-privacy-toolkit
   cp .env.example .env
   ```

3. **Build and run**:
   ```bash
   # Windows (PowerShell)
   .\docker-helper.ps1 build
   .\docker-helper.ps1 start

   # Linux/Mac
   chmod +x docker-helper.sh
   ./docker-helper.sh build
   ./docker-helper.sh start

   # Or manually
   docker-compose build
   docker-compose up -d
   ```

4. **Access the app**: http://localhost:8080

**What's included in Docker:**
- ✅ Bun runtime
- ✅ Noir (nargo) v1.0.0-beta.1
- ✅ Barretenberg (bb) v0.67.0
- ✅ Garaga v0.15.5
- ✅ Scarb v2.9.2
- ✅ Starknet Foundry
- ✅ All Node.js dependencies
- ✅ Pre-compiled circuits and contracts

**Documentation:**
- 📖 [DOCKER.md](DOCKER.md) - Complete Docker guide
- 🚀 [DOCKER-QUICKSTART-ES.md](DOCKER-QUICKSTART-ES.md) - Guía rápida en español

---

### 💻 Manual Installation (Advanced)

If you prefer to install dependencies manually:

1. **Clone + install JS deps**
   ```bash
   git clone https://github.com/omarespejel/tongo-ukraine-donations.git
   cd tongo-donation-demo
   bun install
   ```

2. **Install ZK toolchain (versions matter!)**
   ```bash
   # Noir & Barretenberg
   curl -L noirup.dev | bash
   noirup --version 1.0.0-beta.1
   curl -L bbup.dev | bash
   bbup --version 0.67.0

   # Garaga + Cairo tooling (python3.10 + pip)
   pip install garaga==0.15.5
   brew install scarb@2.9.2  # or download release tarball
   ```

3. **Configure Starknet credentials**
   - `donation_badge_verifier/.secrets` contains **demo-only** RPC + account values. Do **not** push real keys—use `.secrets.example` as a template and keep your local `.secrets` added to `.gitignore`.
   - For badge declares/claims use Sepolia accounts (see `donation_badge_verifier/snfoundry.toml`). For Tongo operations you can connect mainnet wallets directly in the UI.
   - For Starkli-based flows, create a keystore and account config (see instructions in `BADGE_SETUP.md`).

---

## Generating Proofs Locally

> macOS bb binaries are flaky. For deterministic results, use GitHub Codespaces or any Linux VM with ≥8 GB RAM as documented in `BADGE_SETUP.md`.

```bash
cd zk-badges
./generate-proof.sh \
  --amount 1000 \
  --threshold 1000 \
  --donor-secret hunter2 \
  --tier 1
```

The script performs:

1. Poseidon commitment via `compute_commitment.js`
2. `nargo compile` + `nargo execute witness`
3. `bb prove` + `bb write_vk`
4. `garaga calldata --system ultra_keccak_honk --format starkli`

Outputs land in `zk-badges/donation_badge/target` plus `zk-badges/calldata.txt`.

---

## Contract Deployment + Verification

1. **Build verifier project**
   ```bash
   cd donation_badge_verifier
   scarb build
   ```

2. **Declare + deploy via sncast**
   ```bash
   sncast --profile sepolia declare \
     --contract target/release/donation_badge_verifier_UltraKeccakHonkVerifier.contract_class.json

   sncast --profile sepolia deploy \
     --class-hash <verifier_class_hash>
   ```

3. **Deploy badge contract (takes verifier address as constructor arg).**

4. **Record everything in `deployments/sepolia.json`.**

5. **Test verification**
   ```bash
   garaga calldata --system ultra_keccak_honk \
     --vk zk-badges/donation_badge/target/vk \
     --proof zk-badges/donation_badge/target/proof \
     --format starkli > zk-badges/calldata.txt

   sncast --profile sepolia call \
     --contract-address <verifier_addr> \
     --function verify_ultra_keccak_honk_proof \
     --calldata $(cat zk-badges/calldata.txt)
   ```
   When the call returns `0x1`, the proof is valid on-chain.

---

## Claiming a Badge

The `DonationBadge::claim_badge` entrypoint expects:

1. `full_proof_with_hints: Span<felt252>` – the Garaga calldata array.
2. `threshold: u256`
3. `donation_commitment: u256`
4. `badge_tier: u8`

Example invocation (once Sepolia account has STRK for fees):

```bash
cd donation_badge_verifier
PROOF_CALLDATA=$(cat ../zk-badges/calldata.txt)

sncast --profile sepolia invoke \
  --contract-address 0x077ca6f2ee4624e51ed6ea6d5ca292889ca7437a0c887bf0d63f055f42ad7010 \
  --function claim_badge \
  --calldata $PROOF_CALLDATA \
             1000 0 \
             0x4e18cb16fc23b735e3a2022c1e422ef4 0x1947661d0c48f766f31005bb473a16ad \
             1
```

After the transaction is accepted, `sncast call --function get_badge_tier` should return `1` for the caller.

---

## Frontend + API

### API (`api/generate-proof.ts`)
Runs under Bun; it shells out to Noir/bb/Garaga and streams the calldata back to the client. Ensure the host machine has the toolchain installed and reachable in `$PATH`.

```bash
bun run api
```

POST payload:
```json
{
  "donation_amount": 1500,
  "threshold": 1000,
  "donor_secret": "hunter2",
  "badge_tier": 2
}
```
Response contains `{ "calldata": [ "...felt array..." ] }`.

### Frontend (`src/web/index.html`)
Served via Vite:
```bash
bun run dev
```
Key facts:
- The Tongo card honors the network toggle (Mainnet = USDC, Sepolia = STRK).
- The badge section is always visible once a wallet connects and now shows an explicit "Sepolia only" banner.
- `badge-service.ts` instantiates a Sepolia `RpcProvider` under the hood, so badge generation/claims never touch mainnet until we deploy mainnet badge contracts.
- Contract addresses are fetched from `src/deployments.ts`, which reads all JSON files under `deployments/`.

---

## Deployment Records

- All contract declarations and deployments must be captured in `deployments/<network>.json`.
- Each entry records class hashes, addresses, tx hashes, and artifact locations.
- `DEPLOY.md` documents the policy so that frontend/backend consumers share consistent metadata.

This approach keeps the repo network-agnostic—adding a mainnet deployment is just another JSON file.

---

## Testing Matrix

| Component | Command |
| --------- | ------- |
| Noir circuit unit test | `cd zk-badges/donation_badge && nargo test` |
| Cairo verifier build   | `cd donation_badge_verifier && scarb build` |
| Badge contract tests   | `snforge test` (tests WIP; the contract currently relies on live verifier interaction) |
| Frontend type-check    | `bun run type-check` |
| End-to-end proof       | `./zk-badges/generate-proof.sh` followed by `sncast call` as shown above |

---

## Security & Privacy Notes

- Proof commitments are Poseidon hashes over `(amount, donor_secret)`; the badge contract stores only the hashed commitment.
- `DonationBadge` prevents commitment reuse, enforces tier monotonicity, and exposes on-chain badge counts for analytics.
- All calldata arrays are validated for public input ordering before upgrading a badge.
- Use fresh STRK-funded Sepolia accounts for experiments; never store production keys in this repository (the `.secrets` file is for demo purposes only).

---

## Roadmap Ideas

- Add recursive proofs for multi-donation attestations.
- Build a backend service that queues proof jobs (to avoid running `bb` client-side).
- Expose REST/GraphQL APIs that wallets can consume for badge status.
- Port the verifier + badge combo to Starknet mainnet when proof generation is production-ready.

---

## Tongo Private Donation Demo

This repository is intentionally dual-purpose: it is both a Garaga/Noir badge tutorial **and** a living walkthrough of Tongo’s private donation rails. The Tongo integration is fully supported (not legacy) and demonstrates how privacy-preserving wallets coexist with ZK attestations inside one Starknet UI.

### Feature Overview

- Wallet integration with Braavos and Argent X.
- Network support for Starknet Mainnet (USDC) and Sepolia testnet (STRK).
- Fund → Transfer → Rollover → Withdraw operations over encrypted balances.
- Real-time balance display, transaction logging, and key-backup helpers.

### Technology Stack

- **Tongo SDK v1.3.0** – zero-knowledge proof generation + encryption.
- **Starknet.js v8.9.1** and **get-starknet v3.3.3** – wallet + chain interactions.
- **Vite + Bun + TypeScript** – application runtime/build.

### Prerequisites

- Bun runtime (`curl -fsSL https://bun.sh/install | bash`).
- Braavos or Argent X wallet extension.
- USDC (mainnet) or STRK (testnet) for funding.
- Optional Alchemy API keys for custom RPC endpoints.

### Installation

```bash
git clone https://github.com/omarespejel/tongo-ukraine-donations.git
cd tongo-donation-demo
bun install
```

To run the CLI demo, copy `.env.example` to `.env` and fill in `STARKNET_MAINNET_RPC_URL`, `STARKNET_SEPOLIA_RPC_URL`, and (for CLI usage) `STARKNET_ACCOUNT_ADDRESS`/`STARKNET_PRIVATE_KEY`.

### Usage

#### Web Frontend

```bash
bun run dev:web
# open http://localhost:5173
```

1. Connect Braavos or Argent X.
2. The Tongo private key auto-generates and stores in `localStorage`.
3. Choose network (Mainnet USDC or Sepolia STRK) and perform fund/transfer/withdraw operations.

#### CLI Demo

```bash
bun run demo
```

Requires the `.env` values mentioned above.

### Configuration + Contracts

| Network | Tongo Contract | Token | Notes |
| ------- | -------------- | ----- | ----- |
| Mainnet | `0x72098b84989a45cc00697431dfba300f1f5d144ae916e98287418af4e548d96` | USDC `0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8` | Matches SDK v1.3.0 |
| Sepolia | `0x00b4cca30f0f641e01140c1c388f55641f1c3fe5515484e622b6cb91d8cee585` | STRK `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d` | Uses Alchemy RPC |
| Sepolia (Badges) | `DonationBadge` `0x077ca6f2ee4624e51ed6ea6d5ca292889ca7437a0c887bf0d63f055f42ad7010` | N/A | Calls into verifier `0x022b20fef3764d09293c5b377bc399ae7490e60665797ec6654d478d74212669` |

Edit `src/wallet-config.ts` for RPCs; the `.env` file affects CLI usage only.

### How Tongo Works (recap)

- **ElGamal encryption** on Stark curve; balances stored as ciphertexts `Enc[y](b, r)`.
- **Two-balance model** (current vs pending) with rollover.
- **Operations**: Fund (public amount), Transfer (hidden), Rollover (internal), Withdraw (public).
- **Security**: proofs bind `chain_id`, `contract_address`, `nonce`; only whitelisted senders can execute.

### Development Commands

```bash
bun run build        # TypeScript build
bun run build:web   # Vite build
bun run type-check  # tsconfig checks
bun run preview     # Preview production build
```

### Troubleshooting

| Issue | Fix |
| ----- | --- |
| Module not found | `bun install` |
| Private key error | Check `.env` or allow auto-generation |
| RPC failures | Verify `STARKNET_RPC_URL` / `wallet-config.ts` |
| Insufficient balance | Fund the account first |
| CORS errors | Use dev server, not `file://` |

### Additional Notes

- `temp-commitment/` contains throwaway scripts used to benchmark Poseidon commitment logic while designing the badge circuit. Keep them for reference or delete if not needed.
- `test-mainnet-rpc.ts` is a quick CLI that pings the configured RPC endpoints and contract addresses. Use it when rotating provider URLs or debugging wallet issues.
- If you fork this repo and do not rely on those helpers, feel free to remove them—just remember why they existed before stripping them out.
- Address padding quirks: the UI automatically normalizes Starknet addresses.
- Tongo private key differs from Starknet account key; losing it forfeits encrypted funds.
- Manual key generation example:
  ```bash
  node -e "console.log('0x' + require('crypto').randomBytes(32).toString('hex'))"
  ```

For deeper protocol details, see the official [Tongo docs](https://docs.tongo.cash/).

---

## License

MIT License — see [LICENSE](LICENSE).

For questions or contributions, open an issue or PR referencing the section you’re extending (circuit, verifier, contracts, API, or frontend). This repo is intentionally transparent so other Starknet teams can reuse the tooling for privacy-enhancing governance badges, compliance proofs, or donation attestations.

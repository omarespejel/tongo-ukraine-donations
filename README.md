# Verified Donor Badge Demo (Starknet Privacy Toolkit)

This repository hosts an end-to-end reference implementation of a “Verified Donor Badge” workflow built entirely on Starknet privacy tooling. It demonstrates how Noir circuits, Barretenberg proofs, Garaga-generated Cairo verifiers, and a Starknet badge contract can be composed to prove that a donor contributed ≥ a threshold without revealing the exact amount.

> The goal of this README is to serve technical builders who want to reproduce or extend the flow—not to advertise a hackathon submission.

---

## System Overview

| Layer | Component | Purpose |
| ----- | --------- | ------- |
| ZK Circuit | `zk-badges/donation_badge` | Noir circuit that hashes `(donation_amount, donor_secret)` with Poseidon and enforces `donation_amount >= threshold`. |
| Proving | Barretenberg `0.67.0` | Generates Ultra Keccak Honk proofs + VK compatible with Garaga 0.15.5. |
| Verifier | `donation_badge_verifier` | Garaga-generated verifier plus custom `DonationBadge` contract that mints tiered badges after proof validation. |
| Backend | `api/generate-proof.ts` | Bun API that orchestrates witness creation, proving, and calldata generation. |
| Frontend | `src/index.html` + `src/badge-service.ts` | Simple UI + TypeScript service for generating commitments, requesting proofs, and claiming the badge. |

The verifier and badge contracts are currently deployed on **Starknet Sepolia**; addresses are tracked under `deployments/sepolia.json` and surfaced to the UI through `src/deployments.ts`.

---

## Status Checklist

- ✅ Noir circuit compiles (Noir `1.0.0-beta.1`)
- ✅ Verifier contract declared + deployed on Sepolia (Garaga `0.15.5`, Scarb `2.9.2`)
- ✅ Proof verified on-chain via `sncast call`
- ✅ Repository is structured + committed
- ✅ README rewritten for engineers
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

---

## Getting Started

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
   - `donation_badge_verifier/.secrets` contains the Sepolia RPC + account keys used in this repo.
   - Copy values into your environment or create fresh OpenZeppelin accounts via `sncast account create …`.
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

### Frontend (`src/index.html`)
Served via Vite:
```bash
bun run dev
```
The badge section displays eligibility, lets a donor trigger proof generation (via the API), and then submits the proof to Starknet using `starknet.js`. Contract addresses are fetched from `src/deployments.ts`, which reads all JSON files under `deployments/`.

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

## License

MIT License — see [LICENSE](LICENSE).

For questions or contributions, open an issue or PR referencing the section you’re extending (circuit, verifier, contracts, API, or frontend). This repo is intentionally transparent so other Starknet teams can reuse the tooling for privacy-enhancing governance badges, compliance proofs, or donation attestations.

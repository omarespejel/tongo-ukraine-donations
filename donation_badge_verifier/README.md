# donation_badge_verifier (Garaga Verifier + Badge Contract)

This package contains the Garaga-generated Ultra Keccak Honk verifier and the custom `DonationBadge` contract that mints tiers once a proof is validated.

## Requirements

- [Garaga](https://github.com/garaga-labs/garaga) `0.15.5`
- [Scarb](https://docs.swmansion.com/scarb/) `2.9.2`
- [Starknet Foundry](https://foundry-rs.github.io/starknet-foundry/) (`sncast`, `snforge`) for deploys/tests

Install the pinned versions (see `../BADGE_SETUP.md` for the downgrade notes).

## Project Layout

- `src/honk_verifier*.cairo` – Auto-generated verifier modules.
- `src/badge_contract.cairo` – Higher-level contract that gates badge tiers and tracks commitments.
- `Scarb.toml` – Package manifest.
- `snfoundry.toml` – Deployment profile (Sepolia). Uses credentials referenced in `.secrets` (ignored by git).

## Common Commands

```bash
# Build verifier + badge contract
cd donation_badge_verifier
scarb build

# Run verifier tests (if any)
snforge test

# Declare & deploy (Sepolia example)
sncast --profile sepolia declare \
  --contract target/release/donation_badge_verifier_UltraKeccakHonkVerifier.contract_class.json

sncast --profile sepolia deploy \
  --class-hash <verifier_class_hash>
```

After deploying the verifier, deploy `DonationBadge` with the verifier address as constructor input and record all addresses in `../deployments/<network>.json`.

## Secrets & Accounts

- `./.secrets` is intentionally gitignored. Copy `.secrets.example` (or create one) with your own RPC URL + deployer account.
- `snfoundry.toml` references Starknet Foundry profiles (`[sncast.sepolia]`). Ensure the referenced account exists in `~/.starknet_accounts`.

## Notes

- Whenever the Noir circuit changes, re-run Garaga to regenerate the verifier files, then rebuild with Scarb.
- The frontend (`src/badge-service.ts`) assumes the Sepolia addresses listed in `../deployments/sepolia.json`. Update that file plus the README table if you redeploy.


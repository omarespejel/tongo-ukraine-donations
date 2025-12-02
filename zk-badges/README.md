# zk-badges (Donation Badge Noir Circuit)

This directory contains the Noir circuit, tooling, and helper scripts used to prove that a donor contributed at least a given threshold without revealing the exact amount.

## Requirements

- [Noir](https://noir-lang.org/) `1.0.0-beta.1`
- [Barretenberg](https://github.com/AztecProtocol/barretenberg) CLI `0.67.0`
- Node.js or Bun for the helper scripts

Install the pinned versions with:

```bash
curl -L noirup.dev | bash
noirup --version 1.0.0-beta.1

curl -L bbup.dev | bash
bbup --version 0.67.0
```

## Key Files

- `donation_badge/src/main.nr` – Poseidon-based circuit enforcing `donation_amount >= threshold`.
- `donation_badge/compute_commitment.js` – Convenience script to hash `(donation_amount, donor_secret)`.
- `donation_badge/generate-proof.sh` – One-touch pipeline that runs `nargo`, `bb prove`, and `garaga calldata`.
- `calldata.txt` / `calldata_hex.txt` – Generated proof calldata (ignored from git).

## Common Commands

```bash
# Run circuit tests
cd zk-badges/donation_badge
nargo test

# Generate a proof + calldata
./generate-proof.sh \
  --amount 1000 \
  --threshold 1000 \
  --donor-secret hunter2 \
  --tier 1
```

Outputs land under `donation_badge/target/` and the calldata files at the repo root. Feed the resulting calldata into Garaga or the Sepolia badge contract as described in the root README.

## Notes

- Large artifacts (`target/`, calldata files) are gitignored—keep them local.
- The circuit intentionally matches the verifier generated in `donation_badge_verifier/`; re-run `garaga` after any circuit change.
- For detailed troubleshooting (bb/garaga versions, Linux recommendations), see `../BADGE_SETUP.md`.


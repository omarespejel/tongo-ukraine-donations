# Starknet Privacy Toolkit (Tongo + Garaga/Noir)

End-to-end reference implementation for private transfers (Tongo) and ZK proofs powered by Noir + Garaga. The donation badge is a use case demo of the ZK stack, not the core product.

---

## Tutorial (start here)

Full walkthrough and implementation notes:
- https://espejel.bearblog.dev/starknet-privacy-toolkit/

Tip: include the blog link in your LLM context (Cursor, etc.) so the agent follows the same flow and constraints.

---

## Codespaces (recommended for proofs)

Why: Noir/Barretenberg/Garaga toolchains are sensitive to OS versions; Linux in Codespaces is more reliable and avoids local setup issues.

What for: running proof generation and verifier builds in a consistent environment.

Steps:
1. Create a GitHub Codespace on the repo.
2. Run:
   ```bash
   chmod +x setup-codespace.sh && ./setup-codespace.sh
   ```
3. Start the proof API:
   ```bash
   bun run api
   ```
4. Make port `3001` public if you want the web UI to call the API remotely.

---

## Quickstart

```bash
bun install
bun run tongo:init
bun run preflight:tx
bun run dev:web
```

Minimal integration surface:
- `src/tongo-client.ts`
- `template/snippet.ts`
- `template/quickstart.ts`

Badges are Sepolia-only and optional:
- `zk-badges/README.md` (proof generation)
- `donation_badge_verifier/README.md` (verifier + badge contract)

---

## Guide + LLM Tips

Recommended workflow:
- Fork this repo and customize the Noir circuit + Cairo contract for your use case.
- Keep prompts focused on the small surfaces: circuit constraints, verifier contract, and `createTongoClient()`.

---

## Deployed Contracts

| Network | Component | Address | Notes |
| ------- | --------- | ------- | ----- |
| **Mainnet** | Tongo Contract | `0x026f79017c3c382148832c6ae50c22502e66f7a2f81ccbdb9e1377af31859d3a` | Accepts USDC |
| Mainnet | USDC Token | `0x033068F6539f8e6e6b131e6B2B814e6c34A5224bC66947c47DaB9dFeE93b35fb` | Native USDC |
| **Sepolia** | Tongo Contract | `0x00b4cca30f0f641e01140c1c388f55641f1c3fe5515484e622b6cb91d8cee585` | STRK |
| Sepolia | STRK Token | `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d` | STRK |
| Sepolia | `DonationBadge` | `0x077ca6f2ee4624e51ed6ea6d5ca292889ca7437a0c887bf0d63f055f42ad7010` | Badge contract |
| Sepolia | `UltraKeccakHonkVerifier` | `0x022b20fef3764d09293c5b377bc399ae7490e60665797ec6654d478d74212669` | Verifier |

Deployment metadata lives in `deployments/` and is consumed by `src/deployments.ts`.

---

## Proof API (optional)

The proof API runs locally under Bun:

```bash
bun run api
```

Default endpoint: `http://localhost:3001/api/generate-proof`.
The server honors `PORT`, which is required on Render.

---

## Deploy (Render)

Static site (frontend):
- Build: `bun install && bun run build:web`
- Publish: `dist`
- Add SPA rewrite: `/*` → `/index.html` (200)

Optional proof API:
- Build: `bun install`
- Start: `bun run api`
- Ensure Noir/BB/Garaga are available in `$PATH` if you want real proofs

If you deploy the API, update:
- `src/badge-service.ts` (`proofBackendUrl`)
- `src/web/index.html` (`PROOF_BACKEND_URL`)

---

## Tests

```bash
bun run type-check
bun run check:health
```

Optional badge checks:
- `cd zk-badges/donation_badge && nargo test`
- `cd donation_badge_verifier && scarb build`

---

## License

MIT License — see `LICENSE`.

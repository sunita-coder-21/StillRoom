# Stillroom

Stillroom is a private screening-club experiment for Midnight. An organizer opens a room with a public admission rule; a member proves that their private credential is eligible without publishing the score, secret, or reason they were invited.

> **Concept note:** Stillroom is a working testnet dApp and reference implementation, not a production identity or access-control service. The interface intentionally labels demo credentials and testnet state.

## The product idea

Private events, research rooms, and limited releases need a way to verify eligibility without turning a guest list into a permanent identity map. Stillroom gives an organizer an auditable admission count and replay-resistant proof while the member keeps their credential and personal context in a local proving session. The chosen Level 3 problem is **Private Allowlist Access — prove membership without revealing identity**.

## What is included

- Compact contract with public screening state, private score/secret witnesses, organizer authorization, credential commitments, and one-use nullifiers.
- React + Vite frontend with 1AM/Lace wallet detection, explicit Preview/Preprod selection, browser proving, browser deployment, credential issuance, admission flow, and transaction links.
- Public Signal Room for the contract state and private Member Pass for the witness flow.
- Day/night mode, accessible responsive layout, local-only secret handling, recovery-key download, reduced-motion support, and no secret localStorage persistence.
- Vitest contract tests, CI compile/test/build workflow, generated `managed/` artifacts, and deployment configuration for a static SPA.

## Screens

Add your own captures after deploying. These are intentionally not fabricated in the repository.

| Capture | File to add | Needed for |
| --- | --- | --- |
| Compact compiler output with circuits | `docs/evidence/compile.png` | Level 1 |
| Wallet connected and admission submitted | `docs/evidence/member-pass.png` | Level 2 |
| Three or more tests passing | `docs/evidence/tests.png` | Level 3 |
| Browser deployment address | `docs/evidence/deployment.png` | Level 4 |

## Architecture

```text
contracts/stillroom.compact
        │ compact compile
        ▼
contracts/managed/stillroom
        ├── contract bindings
        ├── compiler metadata
        ├── zkir circuits
        └── prover/verifier keys
        │ npm run copy:managed
        ▼
frontend/public/managed + frontend/src/managed/contract
        │ browser wallet / Midnight.js
        ▼
Stillroom React app → Preview or Preprod
```

### Compact circuits

| Circuit | Purpose | Private inputs |
| --- | --- | --- |
| `check_in()` | Prove an issued private credential clears the public threshold and consume a pass-scoped nullifier | score, member secret |
| `issue_credential(commitment)` | Organizer registers the commitment produced by a member | organizer secret |
| `configure_screening(...)` | Rotate rule, pass, expiry, curator and capacity | organizer secret |
| `pause_admissions()` / `resume_admissions()` | Lifecycle control | organizer secret |

The contract exposes the threshold, pass identifier, deadline, capacity, room state, aggregate count, credential commitments and nullifier set as public ledger state. A score, member secret, source credential and organizer secret are witnesses. `disclose()` is used only at the intentional public state boundary; private witness values are never passed as circuit arguments.

## Privacy model

### An observer can learn

- which contract and circuit were used;
- that a transaction occurred and when it was indexed;
- the public threshold, pass identifier, deadline, capacity, room state and aggregate admissions;
- the issued credential commitment and pass-scoped nullifier;
- that the private credential satisfied the circuit's assertions.

### An observer cannot recover from the proof

- the member's score;
- the member's secret or the preimage of the credential commitment;
- the private source credential or why the member qualified;
- the organizer's secret;
- an identity mapping from a nullifier alone.

Zero knowledge does not hide the existence or shape of a transaction. Circuit arguments are public in Midnight; Stillroom therefore keeps sensitive values in witnesses and validates every witness-derived value before it affects public state. Do not put real personal data into a testnet demo.

## Prerequisites

- Node.js 22 or newer
- npm 10 or newer
- Docker Desktop for the local proof server/indexer/node
- Compact compiler 0.31.x (the CI workflow installs the pinned release)
- A Midnight-compatible browser wallet such as 1AM or Lace for browser transactions
- A Preview or Preprod wallet funded for testnet fees/DUST

The source Compact compiler is not the Windows `compact` command. Follow the current Compact installation instructions for your platform; on Windows, the script can invoke `compactc` or a WSL installation.

## Run locally

```bash
npm install
npm run compile
npm test
npm run test:frontend
npm run build
npm run dev -w stillroom-frontend
```

Open the Vite URL shown in the terminal. The app defaults to `preview` in the network selector. Use the selector to move to `preprod`; switching networks disconnects the browser session and reads a network-scoped contract address.

### Local Midnight services (optional)

```bash
npm run env:up
npm run test:local
npm run env:down
```

The browser app targets Preview/Preprod. The Docker stack is for the headless local contract test environment and proof-server development loop.

### Environment variables

Copy `.env.preprod.example` to a local ignored file only when using headless scripts. Never commit a mnemonic, seed, proof-server credential or private organizer key.

Frontend values are optional:

```bash
VITE_NETWORK=preprod
VITE_CONTRACT_ADDRESS=
VITE_PREPROD_CONTRACT_ADDRESS=
VITE_PREVIEW_CONTRACT_ADDRESS=
VITE_INDEXER_URL=
VITE_INDEXER_WS=
```

A browser-deployed address is saved to a versioned, network-scoped localStorage key. It is not shared with another browser or user.

## Browser deployment and operations

1. Install a Midnight-compatible wallet and choose `Preview` or `Preprod` in the top bar.
2. Open **Operations** and connect the wallet on that same network.
3. Generate or paste a 64-character organizer secret. Use **Save recovery key** and store the file offline.
4. Set threshold, capacity and expiry; choose **Deploy new screening**.
5. Approve the transaction in the wallet. The app displays a submitted transaction ID and saves the derived contract address after submission.
6. Wait for the indexer and refresh the Signal Room before treating the address as confirmed.
7. On Member Pass, the member creates a credential commitment from their private score, secret and current pass identifier.
8. The organizer pastes that commitment into Operations and issues it.
9. The member connects their wallet and submits **Generate admission proof**. The app labels this as submitted until indexed.

The contract deploy page is the browser portal requested for this project. It uses `CompiledContract.make`, compiled assets served from `/managed`, `createUnprovenDeployTx`, `createUnprovenCallTx`, `submitTxAsync`, wallet balancing and the selected network. It does not pretend a wallet submission is final confirmation.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run compile` | Compile Compact and sync generated assets into the frontend |
| `npm test` | Run Compact contract and privacy tests |
| `npm run test:frontend` | Run browser utility tests |
| `npm run build` | Compile, test separately as needed, and build the frontend bundle |
| `npm run check` | Test plus production build |
| `npm run env:up` | Start local Midnight services |
| `npm run env:down` | Stop local Midnight services |
| `npm run dev -w stillroom-frontend` | Start the Vite frontend |

## Level review

This repository contains the implementation and evidence scaffolding for all four levels. Live-chain and public-submission facts cannot be truthfully completed by source code alone.

| Level | Code prepared in this project | Manual evidence still required |
| --- | --- | --- |
| 1 — New Moon | Compact source, generated managed circuits/keys, local tests, setup docs, product idea | Run compile, deploy to Preview/Preprod, paste verifiable address, add compile screenshot, publish repository, make 5 meaningful commits |
| 2 — Waxing Crescent | Wallet connect/disconnect, network selection, circuit calls, credential-gated private admission, observable public counter/nullifier | Deploy a real contract, add live demo URL, record wallet + successful circuit video, paste address and privacy claim, make 8 meaningful commits |
| 3 — Half Light | Approved private allowlist proposal, 3+ contract/privacy tests, CI compile/test/build, public Signal Room | Push workflow and wait for a passing run, add test screenshot, record one-minute demo, submit approval, make 10 meaningful commits |
| 4 — Waxing Gibbous | Browser admin/deploy portal, docs/setup/usage, CI workflow, polished responsive UI, product profile placeholders | Deploy MVP to Preprod, add live link/address/video, create/link the product X profile, wait for CI badge, make 15 meaningful commits |

### Submission links

Fill these after manual deployment; placeholders are deliberate rather than fabricated claims.

- Live demo: `TBD — add Preview/Preprod deployment URL`
- Contract address: `TBD — deploy from Operations and verify on Midnight Explorer`
- Deployment transaction: `TBD — copy from wallet/indexer`
- Demo video: `TBD — record member pass + organizer flow`
- Product X profile: `TBD — create the Stillroom profile`
- CI badge: the workflow is at `.github/workflows/ci.yaml`; add the repository badge after the first passing run.

## Security notes

- Secrets are held in React state for the active tab and are not written to localStorage by the app.
- The recovery download is an explicit user action and is marked sensitive.
- Network changes disconnect the wallet and use network-scoped address storage.
- Old contract addresses are not valid after changing Compact source or generated keys; redeploy after every contract change.
- A wallet address and transaction existence remain public. Do not treat this demo as anonymous money movement or as a substitute for a reviewed credential system.
- Compact witnesses are not authentication by themselves. The contract enforces organizer authorization, credential membership, threshold, expiry, capacity and nullifier replay protection.

## Project map

```text
contracts/stillroom.compact      Compact source
contracts/managed/stillroom      generated bindings, circuits and keys
frontend/src                     Stillroom React application
frontend/public/managed          browser-served ZK assets
src/test                         Compact runtime tests
scripts                          compile, environment and inspection helpers
docs/DESIGN.md                   visual and interaction decisions
.github/workflows                 CI and deployment workflows
```

## Design direction

Stillroom is deliberately not a generic crypto dashboard. It uses a cinema-program shell, slate surfaces, cobalt controls, mountain and forest stills, DM Sans for reading, Space Grotesk for display hierarchy, and a real day/night mode. Interaction states are text-first, focus-visible and reduced-motion aware. The design system is recorded in [`docs/DESIGN.md`](docs/DESIGN.md).

## License

MIT. See [`LICENSE`](LICENSE).

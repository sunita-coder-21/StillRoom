# Stillroom product proposal

## Selected Level 3 problem

**Private Allowlist Access** — prove membership without revealing identity.

## Problem

Invitation-only screenings, research rooms, private events and limited releases usually ask for an email, wallet address, screenshot or a database lookup. Every shortcut creates an identity trail that says more than “this visitor is eligible.” Members should be able to prove an admission claim without handing the organizer their source credential or social graph.

## Product

Stillroom is a private screening-room access layer. An organizer publishes a threshold, pass identifier, deadline and capacity. The organizer issues a commitment for a member's private eligibility claim. The member later supplies the score and secret as witnesses; Compact proves that the commitment is registered and that the hidden score clears the public threshold. The chain records a one-use, pass-scoped nullifier and aggregate result, while the underlying reason for eligibility stays with the member.

Stillroom is intentionally narrow: it demonstrates selective disclosure on testnet and does not claim to validate real-world credentials by itself. The organizer remains responsible for validating a member before issuing a commitment.

## Users

- Organizers running private screenings, research rooms, beta communities or limited releases.
- Members who need to prove eligibility without connecting their identity to a room.
- Auditors who need a replay-resistant public count instead of a private guest list.

## Public / private data model

| Data | Location | Why |
| --- | --- | --- |
| Threshold, pass ID, deadline, capacity, open/paused state | Public ledger | Everyone must agree on the active rule |
| Registered credential commitment | Public ledger | The contract must enforce organizer-issued eligibility |
| Aggregate admissions | Public ledger | Room activity is intentionally observable |
| Nullifier | Public ledger | Prevents the same private pass from being used twice |
| Eligibility score | Private witness | Only the threshold result is needed |
| Member secret | Private witness | Binds the credential and derives a nullifier without exposing its preimage |
| Organizer secret | Private witness | Authorizes deployment operations and lifecycle changes |
| Source credential and personal context | Outside the contract | Not needed by the circuit |

## Security decisions

- Credential commitments bind the score, secret and screening pass with a domain-separated persistent hash.
- The member circuit requires a registered commitment before checking the threshold, then records a pass-scoped nullifier.
- Organizer actions compare a private secret-derived commitment with the public steward value.
- Screening identifiers cannot be reused during rotation; per-screening counts reset while lifetime counts remain available.
- Circuit arguments remain public by Midnight's model. Sensitive values therefore arrive only through witnesses.
- `disclose()` is used at deliberate public ledger boundaries; private witness values are not stored directly.

## Why Midnight

Compact makes the public/private boundary explicit with exported ledger state, witnesses, circuits and `disclose()`. Midnight can verify that a predicate was satisfied while the witness remains outside the public transcript. The browser connector also lets users approve wallet operations on the selected Preview or Preprod network.

## Scope and roadmap

### Level 1 — New Moon

Compile and test the five-circuit screening contract, generate the managed ZK assets, document the privacy boundary and deploy the first instance to Preview or Preprod.

### Level 2 — Waxing Crescent

Connect 1AM/Lace, issue a private credential commitment, generate a member admission proof from the browser and display an observable public admission result.

### Level 3 — Half Light

Harden the contract and application tests, run CI on every push, publish the Signal Room and submit this Private Allowlist Access proposal for approval.

### Level 4 — Waxing Gibbous

Ship the MVP on Preprod with browser deployment, operational documentation, a release build, a live product profile and a recorded member-to-admission walkthrough.

### Later

Replace the organizer's manual credential validation with verifiable credential adapters, add audited revocation policy, improve confirmation UX, and complete a formal Compact/security review before any mainnet use.

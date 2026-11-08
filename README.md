# ⚸ 🔆[DecentSubscriptions](https://TheJollyLaMa.github.io/DecentSubscriptions/public)

A Decent Super Simple Smart Subscriber button

## Additive V1 project default (local, unaudited)

New projects can use `contracts/default/DecentSubscriptionsV1.sol` and
[`default/index.html`](default/index.html). The original
`SubscriptionWithPrepay`, ABI, deployed address and `public/` app are unchanged.
**This is prepaid access, not recurring billing, a direct-debit mandate or a
refundable balance.** No consumer, ArtFi or router migration is included.

### Explicit plan and access lifecycle

- Any merchant calls `createPlan(asset, price, duration, context)` and is its
  immutable payee. Asset, positive price, positive duration in seconds and
  public context (max 512 UTF-8 bytes) are immutable per plan. Create another
  plan to change commercial terms. No global owner can change another plan.
- `subscribe(id, subscriber, periods)` makes the caller the payer/sponsor and
  grants a nonzero named beneficiary a positive number of prepaid periods.
  Total is `price * periods`. Zero asset means native coin and exact
  `msg.value`; ERC20 requires allowance and zero native value. Payment goes
  directly to the plan's payee atomically. No platform fees/withdrawal balance.
- Renewal extends from `max(current expiry, block.timestamp)`. Access is active
  strictly before expiry, including when a merchant disables new purchases.
  Only the merchant may `setEnabled(id, bool)`; it cannot confiscate paid time.
- Only a subscriber can cancel **their own** currently active pass via
  `cancel(id)`. Expiry becomes now: remaining access is forfeited, **no refund**.
  A sponsor cannot cancel somebody else's pass. Canceling is optional; there
  is no future automatic charge to stop. Buying again starts a new paid term.
- Unknown/disabled plans, zero periods/beneficiaries, overflow, wrong native
  amounts, missing allowances and failed transfers revert. Expiry and funds
  roll back together. `PlanCreated`, `PlanEnabled`, `Purchased`, `Canceled`,
  `plans`, `expiry` and `isActive` provide public lifecycle evidence.

### Run the usable interface

Requires Node 20+ and npm. From this repository/worktree:

```sh
npm ci
npm test
npm run preview
# http://127.0.0.1:4313/default/  (PORT overrides 4313)
```

The loopback preview uses a fresh **synthetic local chain**. Actor 1 creates a
plan; actor 2 connects, loads its ID, inspects their own subscriber address,
buys, renews or cancels. Set the subscriber field to another address to sponsor
that beneficiary instead. For ERC20 plans paste the displayed mock-token
address into Asset; each actor has 1,000,000 mock raw units. No wallet/real funds
are required. Restart resets chain state, not source/tests. Never fund these
deterministic test accounts or expose the local RPC to a network.

The interface distinguishes current access from old cancellation events and
merchant purchase availability. It explicitly shows roles/asset/rate/duration,
checks integer raw units, waits for confirmation and reports disconnected/error
states instead of claiming stale access. ERC20 approval is exact (zero-reset
when needed); approval may remain if a later purchase fails. It does not infer
decimal/fiat conversions. This addresses ambiguity observed in legacy issue #1
for the **new** interface; it does not fix or close that legacy UI issue.

`npm run build` generates ignored `build/DecentSubscriptionsV1.json`,
`default/abi.json` and `default/vendor/ethers.js`. A separately reviewed
deployment can serve built `default/` with `default/config.json` set to
`mode: "wallet"` and independently verified `chainId`/V1 `address`. Empty
configuration disables writes. The preview always substitutes its synthetic
chain. Wallet mode checks chain and code presence, resets on account/chain
changes, but does not establish ABI/bytecode correctness. No deployment script
or existing-address substitution is provided.

### Reuse decision and receiving tests

Need: reusable prepaid access with explicit merchant, asset and immutable terms.
Canopy's three payment leads, actual source/worktrees, remote branches and
open issues/PRs were inspected. Base:
`eb71011f5eda2b2912f4ca83aa26d8494a505284` (latest inspected `origin/main`);
`jolly-brancher` and `BobCat` were checked before choosing main.
Adapted donor `SubscriptionWithPrepay.subscribe`, `isSubscribed` and
`cancelSubscription` in `contracts/DecentSubscription.sol` at
`c8b7a5c6fb806dd0410ae80d4f81af9d93f1713f`, unchanged at base: preserve
prepaid extension and no-refund cancellation semantics, generalize fixed
30-day/native/global-owner pricing into explicit immutable merchant plans.
The donor's MIT notice and repository Apache-2.0/NOTICE attribution remain.
V1 ABI is intentionally new; no global fee-update/owner-withdraw migration.
`PaymentAsset._collect`, `_send` and `nonReentrant` are copied/adapted from
the explicitly **uncommitted**
`DecentEscrow/contracts/default/PaymentAsset.sol`,
not a released shared package or automatic cross-repository dependency.

Validated: `npm test` **12/12 passing**, Solidity 0.8.30, optimizer 200,
Shanghai EVM, Ganache 7.9.2 and ethers 6.15.0. Tests cover native/ERC20,
sponsorship, active/expired renewal, subscriber-only cancellation, merchant-only
disable with retained access, overflow, invalid values, no-return/false-return
tokens, allowance/transfer fees including payer surcharges, native rejection,
reentry attempts and rollback. `scripts/browser-smoke.mjs` also passed native
buy→renew→cancel, ERC20 purchase, merchant disable, invalid integer entry,
receipt rendering and 375px layout with no uncaught browser errors. Optional
browser tooling was reused from an existing local installation:

```sh
mkdir -p .cache
TMPDIR="$PWD/.cache" PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
  node scripts/browser-smoke.mjs
```

Ganache's optional native uWS binary is unavailable under Node 24/macOS; its
JavaScript fallback passed these validations.

### Receipt/access boundary and deployment gates

Receipts contain chain ID, V1 contract, transaction hash, block and decoded
events. A future adapter must verify receipt status, contract/chain, event log
index and finality, then read **current** expiry/plan/subscriber; a historical
`Purchased` log is not permanent access, and `Canceled` is not a refund.
No off-chain authentication/session gate or router is wired here. Office and
Academy may link the synthetic local `/default/` preview, not claim deployed
enrollment, ongoing billing, or a production access service.

Unsupported: automatic recurring debit, refundable/prorated cancellation,
merchant revocation of paid access, plan term edits, free trials, NFTs,
fee/rebasing/reflection tokens, permits, cross-chain passes, transfer of passes,
upgrades and admin fund rescue. Exact checks reject common transfer-fee behavior,
not arbitrary malicious assets. Mistaken/forced deposits cannot be rescued.
Before real use require independent review/audit, approved asset policy,
clear service/refund terms, chain-specific tests, verified source/bytecode,
wallet/deployment configuration and receiving application's current-access
authorization tests. Specialized recurring/refund models need their own version.

## 🛠️ **Tech Stack**
- **Frontend**: HTML, CSS, JavaScript
- **Blockchain**: Polygon
- **Smart Contracts**: Solidit
- **Wallet Integration**: ethers.js

## ⚸📜 [The Contract](https://polygonscan.com/address/0x8C6E80B510216840f4eFf18D6d2A9bD81f38e6CC#events)

* another Decent Realization by TheJollyLaMa 

## Local DecentHeader integration

Entries: `public/index.html` (legacy Polygon) and `default/index.html` (V1).
One themed native header provides click-only wallet identity, explicit
Pinata/Kubo connectivity verification and About; no DBusk widget.
Default wallet operations share the header BrowserProvider, verify configured
chain/bytecode and invalidate actions on wallet changes. Synthetic actors remain
separate and never create fake header wallet identity. Legacy operations retain
the documented Polygon chain 137, require bytecode, reuse the same raw provider,
and disable subscription/update controls on session changes; no automatic chain
switch or debit is introduced.
Legacy failures now appear in `#legacy-status` outside the hidden old toolbar;
the original forms and About remain intact. The owner fee control is accessible
below the header only after current-owner verification. Subscribe, cancel and
fee updates recheck session, Polygon chain and bytecode immediately before
submission; stale fee/owner/access reads cannot re-enable controls for a changed
wallet. Disconnect clears fee, timeline, addresses and inline goodies visibility.
This browser display is not an authenticated private-content service.

Reuse/adapt: DecentHead `00691c4fe93fd280f5aec780bdc4fac651bfcdb1`
`js/main.js:DecentHead`, `js/wallet.js:WalletSession`, `Header.js`,
`Header/{WalletConnect,IPFSControls,IPFSStatus,AboutModal}.js` and
`docs/ADOPTING.md`'s vendor manifest. LICENSE/NOTICE/artwork/ethers attribution
and exact provenance are in `vendor/decent-head/2.0.0`.
Legacy ethers v5 stays untouched: v6 UMD is wrapped in module-local CommonJS
exports. Nullable wallet/display guards avoid guessed chains; CSS clips
horizontal orbit paint at 375px.

Read-only connectivity additionally adapts **uncommitted** shared
`_wt/header-provider-connect` work based on that commit:
`IPFSSession.verifyConnection()` and `IPFSControls`' verify-provider handler.
Provider choice is unverified until an explicit Pinata authentication/Kubo
version response. Even ready connectivity does not verify backups, renewals,
retention or rewards. Credentials stay in memory; subscription backup,
replication, rewards and generic upload/pinning controls remain unavailable.
Canopy curated leads, current receiving worktrees and open issues/PRs were
inspected read-only; saved V1 work remains intact.

Validation: `npm test`, `node scripts/browser-smoke.mjs` (synthetic native/ERC20
renewal lifecycle), and `node scripts/header-browser-smoke.mjs` with an existing
`PLAYWRIGHT_MODULE`. Both actual entries pass 375px wallet rejection/lifecycle,
shared-session/no-code/wrong-chain gates, unconfigured/401/network/Pinata/Kubo
probe states without uploads, and About Escape/focus checks. Helpers self-stop;
no deployment, funds, widget, router or contract migration.

Bounded recovery validation (2026-11-08): the original **25 tests** and both
browser harnesses passed before edits. Final `npm test` passes **31 tests**,
including six synthetic legacy-header regressions for exact fee × months,
explicit cancellation, missing-code/wrong-chain/disconnect gates, owner-only fee
updates, changed-account-before-payment, stale owner initialization and stale
goodies/controls cleanup. `node scripts/header-browser-smoke.mjs` verifies both
actual entries, inert mount, no upload/pin/sign/switch requests, unavailable IPFS
actions, unconfigured/401/network/Pinata-ready/Kubo-ready, wallet lifecycle,
legacy Polygon/no-code gates, default no-code/wrong-chain gates, About keyboard
open/Tab/Escape/focus and 375px dialog bounds. The synthetic native/ERC20
subscription renewal/cancel/disable lifecycle remains covered by
`node scripts/browser-smoke.mjs`.
Supply `PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs`;
no dependency was added. Both scripts self-start/stop loopback servers; failed
browser launch is also bounded. Pinata/Kubo responses and legacy ethers are
synthetic fixtures, not live service/deployment validation. Ganache's missing
native µWS binary uses its existing working JavaScript fallback.
The receiver's saved vendor wallet, provider probe/UI/status and lexical ethers
wrapper are byte-identical to the accepted Escrow/Invoice adaptation of
Head `00691c4fe93fd280f5aec780bdc4fac651bfcdb1`; tests verify upstream manifest,
exact UMD wrapper and uncommitted shared `js/ipfs.js`/`IPFSControls.js` hashes.
The bounded reuse search covered Canopy Subscriptions leads, this receiving
worktree and the accepted donor implementation; no open Subscriptions PR was
found. The open Supporter workflow issue is outside this slice.

## License

Code: [Apache-2.0](LICENSE) · Art and docs: [CC BY 4.0](LICENSES/CC-BY-4.0.txt) · Please keep the [NOTICE](NOTICE) and give The Jolly LaMa / A Decent Agency a head nod when you reuse this work.
Support the work with a [Supporter DNFT](https://thejollylama.github.io/DecentMarket/).

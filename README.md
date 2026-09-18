# VAMP

**Paste a token. Vamp it. Launch it.**

VAMP is a Robinhood Chain (chain id 4663) tool: paste an existing token
contract, VAMP reads its public on-chain metadata — name, ticker, image,
description, links — you customize the new launch, and release it through
Pons V2. Every vamp is attributed to its source on chain (`vamp:0x…` in the
token's spare social slot) and shown everywhere as **Vamped from 0x…**.

Architecture: [ARCHITECTURE.md](ARCHITECTURE.md).

## Run

```bash
npm install
npm run dev          # http://localhost:3000
```

```bash
npm run build && npm start
```

Copy `.env.example` to `.env.local` for the optional pieces:

| Variable | Effect when set |
| --- | --- |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Offers WalletConnect (mobile wallets) next to injected wallets. |
| `PINATA_JWT` | Enables image uploads to IPFS from the editor. Without it, the source image is reused as-is and a URL can be pasted. |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL for metadata. |

Everything else (RPC, factory, forwarder, escrow, config id) defaults to the
values verified on Robinhood Chain and lives in
[`src/config/contracts.ts`](src/config/contracts.ts).

## What is real

- **Reading a token**: `name()`, `symbol()`, `logo()`, `description()`,
  `socials()`, `curve()` straight from the contract over the public RPC, in the
  browser.
- **Launching**: the exact `factory.launchToken` (no dev buy) or
  `forwarder.launchAndBuy` (dev buy) call, with `previewLaunchEconomics` read
  right before, simulated from your wallet first, signed by your wallet, and
  the new token read back from the `TokenLaunched` event. Nothing is sent that
  did not pass simulation; an error after sending carries the tx hash.
- **Launch fee, graduation, supply, creator-tax ceiling**: read live from the
  factory.
- **Recent vamps / network / dashboard**: `TokenLaunched` logs from the RPC,
  filtered by the on-chain provenance tag, hydrated with multicalls; volume
  from `CurveBuy`/`CurveSell` events; claimable fees from the Pons escrow.

## What is sample

When the chain has nothing to show — no launch with a provenance tag in the
scanned window, or no wallet connected on the dashboard — the grids show a
**labeled** sample set. The label says so; the first real vamp replaces it.

## Dry run against the real factory

```bash
npm run simulate
```

Builds the same calldata the app builds for a source token and runs it as
`eth_call` from a fictional funded account against the live factory and
forwarder. Prints the predicted token and curve addresses, tokens out for a
0.01 ETH dev buy, and gas. Sends nothing.

## Captures

```bash
npm run build && npm start -- --port 3857
npm run capture http://localhost:3857   # → docs/captures/*.png
```

`/?ca=0x…&t=900` freezes the extraction animation at 900 ms; `/?intro=0`
skips the intro. `public/dev/scroll-harness.html` stacks scrolled views of a
page for full-page captures. `scripts/dev-wallet.js` is a read-only wallet
stub (announces over EIP-6963, refuses to sign) for driving the UI.

## Not affiliated

VAMP is not affiliated with Pons or Robinhood. A vamped token is a new token;
the source stays what it was.

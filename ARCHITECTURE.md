# VAMP — architecture

Paste a token. Vamp it. Launch it.

A Robinhood Chain (4663) tool: paste an existing token contract, read its
public on-chain metadata (name, ticker, image, description, links), edit the
new launch, release it through Pons V2. Every vamp carries an on-chain
provenance tag so the new token is always shown as **Vamped from 0x…**.

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind 4 · Framer Motion ·
React Three Fiber + drei (procedural chrome bat, no model files) · wagmi 3 +
viem (injected wallets, WalletConnect when a project id is configured) ·
Lucide.

## Where the chain lives

| File | Role |
| --- | --- |
| `src/config/contracts.ts` | Every address, config id and env-driven knob. **The only file to edit to point VAMP at another factory / chain.** Marks what still needs configuration (WalletConnect id, Pinata JWT). |
| `src/lib/robinhood.ts` | Chain definition, RPC, explorer links, the shared viem public client. |
| `src/lib/pons.ts` | Pons V2 ABIs (factory, launch forwarder, curve, fee escrow, token metadata), `readSourceToken`, `readFactoryEconomics`, `buildLaunchCall`, receipt parsing, the `vamp:0x…` provenance tag. |
| `src/lib/curve.ts` | Exact constant-product maths of a Pons curve (quotes, market cap, dev-buy floor). |
| `src/lib/launches.ts` | Reads `TokenLaunched` logs from the RPC, filters vamps by their tag, hydrates cards (metadata, reserves, volume, fees). Server-side only. |
| `src/lib/ipfs.ts` | `ipfs://` → gateway candidates; upload through `/api/upload` (Pinata, needs `PINATA_JWT`). |
| `src/lib/prices.ts` | ETH/USD from the Pyth contract on Robinhood Chain (`getPriceUnsafe`), with age; USD figures are omitted when stale. |
| `src/lib/sample.ts` | Labeled sample data shown only when the chain has nothing yet (recent vamps, network, dashboard when disconnected). Every sample surface says so. |

Nothing on-chain is faked: the launch is the real `factory.launchToken` /
`forwarder.launchAndBuy` call, simulated first, signed by the wallet, and the
result is read back from the `TokenLaunched` event.

## Routes

| Route | Content |
| --- | --- |
| `/` | Intro (once per session, skippable) → Hero (3D bat + CA input) → extraction animation → editor + live preview → release flow → "YOUR VAMP IS LIVE" → How it works → They've been vamped → Vamp network. Deep link: `/?ca=0x…` skips the intro and starts extracting. |
| `/launched` | Full grid of recent vamps. |
| `/network` | Full-page lineage graph. |
| `/dashboard` | Your coven: totals + every launch by the connected wallet, claim fees. |
| `/api/vamps` | Recent vamps (RPC scan, cached in memory 45 s). |
| `/api/launches?deployer=0x…` | Launches of one wallet with live stats. |
| `/api/upload` | Image → IPFS through Pinata. |

## State

`src/lib/vampStore.ts` — one small external store (`useSyncExternalStore`)
holding the session: `stage` (`intro | hero | extracting | editor | releasing |
live`), the source token, the editable draft, factory economics, the launch
result. The 3D scene, the extraction overlay and the editor all read the same
store; the scene never re-renders React on frame updates (flight position is a
mutable ref in `src/lib/flight.ts`).

## Components

```
src/components
  brand/      BatMark (SVG mark, animatable wings), BatLoader, Wordmark
  three/      BatScene (single persistent canvas: intro flight, hero hover,
              extraction flight, scroll retreat), batGeometry (procedural
              chrome bat built from the same silhouette as the SVG mark)
  layout/     Navbar, Footer, CursorGlow, Toaster, PageShell
  home/       Intro, Hero, Extraction, HowItWorks, RecentVamps, NetworkSection
  editor/     Editor, IdentityFields, SocialFields, LaunchSettings,
              VampMeter, TokenPreview (tilt card), ReleaseButton
  launch/     ReleaseFlow (preflight → simulate → sign → pending → cage → live)
  network/    LineageGraph (2D canvas force layout)
  dashboard/  Coven, LaunchRow
  wallet/     ConnectButton, ConnectDialog, ChainGuard
  ui/         Button, Input, Field, Num (animated numbers), Badge, Card, Slider
```

## Motion budget

One WebGL canvas, mounted lazily (`next/dynamic`, ssr: false), dpr capped at
1.75, paused when hidden or scrolled past the hero. Mobile (< 768 px) and
`prefers-reduced-motion` get the SVG bat driven by Framer Motion instead of
WebGL for the extraction; the intro is skipped for reduced motion.

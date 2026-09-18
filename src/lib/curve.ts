/**
 * A Pons V2 curve is an exact constant product on
 * (quote reserve + phantom quote, token reserve). Verified to the wei on a
 * fork of Robinhood Chain: 0.01 ETH on a fresh ETH curve buys
 * 5 858 334.812710811290608911 tokens. Fees come off the input on a buy and
 * off the output on a sell.
 */

export const BPS = 10_000n;
export const WAD = 10n ** 18n;

/** Tokens out for `amountIn` after `takenBps` (curve fee + creator tax + snipe tax) leaves the input. */
export function quoteBuy(quote: bigint, tokens: bigint, amountIn: bigint, takenBps: bigint): bigint {
  if (amountIn <= 0n || quote <= 0n || tokens <= 0n || takenBps >= BPS) return 0n;
  const net = amountIn - (amountIn * takenBps) / BPS;
  return (tokens * net) / (quote + net);
}

/** Quote out for `tokensIn` after `takenBps` leaves the output. */
export function quoteSell(quote: bigint, tokens: bigint, tokensIn: bigint, takenBps: bigint): bigint {
  if (tokensIn <= 0n || quote <= 0n || tokens <= 0n || takenBps >= BPS) return 0n;
  const gross = (quote * tokensIn) / (tokens + tokensIn);
  return gross - (gross * takenBps) / BPS;
}

/** Spot price in quote wei per whole token. */
export function spotPerToken(quote: bigint, tokens: bigint): bigint {
  return tokens === 0n ? 0n : (quote * WAD) / tokens;
}

/** Market cap in quote wei: spot × supply. */
export function marketCap(quote: bigint, tokens: bigint, supply: bigint): bigint {
  return tokens === 0n ? 0n : (quote * supply) / tokens;
}

/** `out` less `slippageBps`. */
export function withSlippage(out: bigint, slippageBps: bigint): bigint {
  return (out * (BPS - slippageBps)) / BPS;
}

/** Curve progress to graduation, 0..1. */
export function graduationProgress(realQuote: bigint, threshold: bigint): number {
  if (threshold <= 0n) return 0;
  const p = Number((realQuote * 10_000n) / threshold) / 10_000;
  return Math.max(0, Math.min(1, p));
}

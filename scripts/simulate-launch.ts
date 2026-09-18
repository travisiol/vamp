/**
 * Dry run of the exact launch the app builds, against the real Pons factory
 * on Robinhood Chain — no wallet, no funds, nothing sent. eth_call with a
 * state override gives a fictional account 10 ETH; if the factory and the
 * forwarder both return a token and a curve, the calldata is right.
 *
 * usage: node --import ./scripts/alias-hooks.mjs scripts/simulate-launch.ts [sourceAddress]
 */
import { formatEther, parseEther, type Address } from "viem";
import { buildLaunchCall, readFactoryEconomics, readSourceToken, EMPTY_SOCIALS, type VampDraft } from "../src/lib/pons";
import { publicClient } from "../src/lib/robinhood";

const source = (process.argv[2] ?? "0x37CCEb327019E618001978413db8968c1C6fFf14") as Address;
const account = "0x000000000000000000000000000000000000dEaD" as Address; // never signs anything
const client = publicClient();

const eco = await readFactoryEconomics(client);
console.log(`factory: fee ${formatEther(eco.launchFee)} ETH · graduation ${formatEther(eco.graduationThreshold)} ETH · enabled ${eco.launchEnabled} · economics ${eco.economicsHash.slice(0, 18)}…`);

const src = await readSourceToken(source, client);
console.log(`source: ${src.name} ($${src.symbol}) kind=${src.kind} logo=${src.logo.slice(0, 40)} curve=${src.curve}`);

const draft: VampDraft = {
  name: `${src.name} (vamp dry run)`,
  symbol: src.symbol.slice(0, 8),
  description: src.description,
  logo: src.logo,
  socials: { ...EMPTY_SOCIALS, ...src.socials, farcaster: "" },
  devBuyEth: "",
  creatorWallet: "",
  creatorTaxPct: 1,
  buybackEnabled: false,
  snipeExemptions: [],
  tagProvenance: true,
};

const override = [{ address: account, balance: parseEther("10") }];
for (const devBuy of ["", "0.01"]) {
  const call = buildLaunchCall({ ...draft, devBuyEth: devBuy }, account, source, eco);
  const t0 = Date.now();
  const sim = await client.simulateContract({ account, address: call.address, abi: call.abi, functionName: call.functionName, args: call.args as never, value: call.value, stateOverride: override } as never);
  const [token, curve, tokensOut] = (sim as { result: readonly [Address, Address, bigint?] }).result;
  const gas = await client.estimateContractGas({ account, address: call.address, abi: call.abi, functionName: call.functionName, args: call.args as never, value: call.value, stateOverride: override } as never);
  console.log(
    `${call.kind.padEnd(9)} ok · value ${formatEther(call.value)} ETH · token ${token} · curve ${curve}` +
      (tokensOut !== undefined ? ` · tokensOut ${formatEther(tokensOut)} (floor ${formatEther(call.minTokensOut)})` : "") +
      ` · gas ${gas} · ${Date.now() - t0} ms · farcaster="${call.params.socials.farcaster}"`,
  );
}

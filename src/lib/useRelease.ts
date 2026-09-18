"use client";

import { useCallback, useState } from "react";
import type { Address, Hex } from "viem";
import { useConnection, usePublicClient, useSwitchChain, useWriteContract } from "wagmi";
import { CHAIN_ID, PONS } from "@/config/contracts";
import { formatEth } from "./format";
import { rememberLaunch } from "./myLaunches";
import { explorer } from "./robinhood";
import { toast } from "./toast";
import { buildLaunchCall, describeLaunchError, factoryAbi, LaunchBuildError, parseLaunchReceipt, readFactoryEconomics, type LaunchCall, type LaunchResult } from "./pons";
import { actions, getState } from "./vampStore";

export type ReleaseStep = "idle" | "preflight" | "simulate" | "sign" | "pending" | "cage" | "live" | "error";

export type ReleaseState = {
  step: ReleaseStep;
  error: string | null;
  hash: Hex | null;
  predicted: { token: Address; curve: Address } | null;
  call: LaunchCall | null;
};

const initial: ReleaseState = { step: "idle", error: null, hash: null, predicted: null, call: null };

/** A launch measured at ~3.7M gas on mainnet. */
const LAUNCH_GAS = 4_000_000n;

/**
 * The real launch: fresh economics → build the exact call → simulate it
 * from the wallet → sign → wait for the receipt → read the new token out of
 * the TokenLaunched event. Nothing is sent that did not pass simulation.
 */
export function useRelease() {
  const { address, chainId } = useConnection();
  const client = usePublicClient();
  const { mutateAsync: switchChain } = useSwitchChain();
  const { mutateAsync: writeContract } = useWriteContract();
  const [state, setState] = useState<ReleaseState>(initial);

  const reset = useCallback(() => setState(initial), []);

  const release = useCallback(async () => {
    const { draft, source } = getState();
    if (!draft) return;
    if (!address || !client) {
      setState({ ...initial, step: "error", error: "Connect a wallet first." });
      return;
    }
    let call: LaunchCall | null = null;
    let hash: Hex | null = null;
    try {
      setState({ ...initial, step: "preflight" });
      actions.setStage("releasing");

      if (chainId !== CHAIN_ID) await switchChain({ chainId: CHAIN_ID });

      const [eco, allowed, balance] = await Promise.all([
        readFactoryEconomics(client),
        client.readContract({ address: PONS.factory, abi: factoryAbi, functionName: "canLaunch", args: [address] }).catch(() => true),
        client.getBalance({ address }),
      ]);
      if (!eco.launchEnabled) throw new Error("Pons has launching switched off right now.");
      if (!allowed) throw new Error("This wallet is not allowed to launch on Pons.");

      call = buildLaunchCall(draft, address, source?.address ?? null, eco);
      if (balance < call.value) throw new Error(`Not enough ETH: the wallet holds ${formatEth(balance)} ETH, the launch sends ${formatEth(call.value)} ETH plus gas.`);

      setState((s) => ({ ...s, step: "simulate", call }));
      const sim = await client.simulateContract({ account: address, address: call.address, abi: call.abi, functionName: call.functionName, args: call.args as never, value: call.value } as never);
      const result = (sim as { result: readonly [Address, Address, ...unknown[]] }).result;
      const predicted = { token: result[0], curve: result[1] };

      // A wallet holding exactly fee + dev buy passes the simulation and then dies in the popup. Same check the node makes.
      const gas = await client
        .estimateContractGas({ account: address, address: call.address, abi: call.abi, functionName: call.functionName, args: call.args as never, value: call.value } as never)
        .catch(() => LAUNCH_GAS);
      const fees = await client.estimateFeesPerGas().catch(() => null);
      const perGas = fees?.maxFeePerGas ?? (await client.getGasPrice().catch(() => 100_000_000n));
      const reserve = ((gas * 13n) / 10n) * perGas;
      if (balance < call.value + reserve) {
        throw new Error(`Not enough ETH for gas: the launch needs about ${formatEth(call.value + reserve)} ETH (${formatEth(call.value)} sent + ${formatEth(reserve)} gas reserve, mostly refunded). Nothing was sent.`);
      }

      setState((s) => ({ ...s, step: "sign", predicted }));
      hash = await writeContract({ address: call.address, abi: call.abi, functionName: call.functionName, args: call.args as never, value: call.value, chainId: CHAIN_ID } as never);
      setState((s) => ({ ...s, step: "pending", hash }));

      const receipt = await client.waitForTransactionReceipt({ hash, timeout: 240_000, pollingInterval: 900 });
      if (receipt.status !== "success") throw new Error("The launch transaction reverted on chain.");

      const parsed = parseLaunchReceipt(receipt, call, source?.address ?? null);
      const launched: LaunchResult = { ...parsed, launchedAt: Date.now() };
      rememberLaunch(launched);
      setState((s) => ({ ...s, step: "cage" }));
      // The cage: locked → unlock → the bat escapes. Then the live screen.
      window.setTimeout(() => {
        setState((s) => ({ ...s, step: "live" }));
        actions.setLive(launched);
        toast({ kind: "success", title: "Your vamp is live", body: `${launched.name} · $${launched.symbol}`, href: explorer.tx(launched.hash), hrefLabel: "View transaction" });
      }, 2400);
    } catch (e) {
      const message = e instanceof LaunchBuildError || (e instanceof Error && !("shortMessage" in e)) ? (e as Error).message : describeLaunchError(e);
      setState({ ...initial, step: "error", error: message, hash, call });
      actions.setStage("editor");
    }
  }, [address, chainId, client, switchChain, writeContract]);

  return { state, release, reset };
}

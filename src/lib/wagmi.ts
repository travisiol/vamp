import { createConfig, http, type Config } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";
import { RPC_URL, WALLETCONNECT_PROJECT_ID } from "@/config/contracts";
import { robinhoodChain } from "./robinhood";
import { site } from "./site";

/**
 * Injected wallets always (every EIP-6963 provider shows up as its own
 * entry). WalletConnect only when a project id is configured — without one
 * the connector would throw at boot.
 */
export const wagmiConfig: Config = createConfig({
  chains: [robinhoodChain],
  connectors: [
    injected({ shimDisconnect: true }),
    ...(WALLETCONNECT_PROJECT_ID
      ? [
          walletConnect({
            projectId: WALLETCONNECT_PROJECT_ID,
            showQrModal: true,
            metadata: { name: site.name, description: site.description, url: site.url, icons: [`${site.url}/icon.png`] },
          }),
        ]
      : []),
  ],
  transports: { [robinhoodChain.id]: http(RPC_URL, { batch: true }) },
  multiInjectedProviderDiscovery: true,
  ssr: true,
});

export const hasWalletConnect = Boolean(WALLETCONNECT_PROJECT_ID);

// Read-only wallet stub for driving the UI without a real wallet. Paste into the
// console (or inject with a browser tool). It announces itself over EIP-6963 as
// "Stub Wallet", answers account/chain requests for ACCOUNT, forwards every read
// to the RPC, and REJECTS eth_sendTransaction like a person pressing Cancel —
// so the release flow can be exercised up to the signature without sending.
(() => {
  const ACCOUNT = (window.__STUB_ACCOUNT || "0xF3cBF0B7e962CEea57a2f88F1FD1e331CD3bB1E4").toLowerCase();
  const CHAIN = "0x1237"; // 4663
  const RPC = "https://rpc.mainnet.chain.robinhood.com";
  const listeners = {};
  let id = 1;
  const provider = {
    isStubWallet: true,
    on(ev, cb) {
      (listeners[ev] ||= []).push(cb);
    },
    removeListener(ev, cb) {
      listeners[ev] = (listeners[ev] || []).filter((f) => f !== cb);
    },
    async request({ method, params }) {
      switch (method) {
        case "eth_requestAccounts":
        case "eth_accounts":
          return [ACCOUNT];
        case "eth_chainId":
          return CHAIN;
        case "wallet_switchEthereumChain":
        case "wallet_addEthereumChain":
          return null;
        case "wallet_getPermissions":
        case "wallet_requestPermissions":
          return [{ parentCapability: "eth_accounts" }];
        case "eth_sendTransaction": {
          window.__STUB_LAST_TX = params?.[0];
          console.log("[stub wallet] eth_sendTransaction refused; calldata:", params?.[0]);
          const err = new Error("User rejected the request.");
          err.code = 4001;
          throw err;
        }
        case "personal_sign":
        case "eth_signTypedData_v4": {
          const err = new Error("User rejected the request.");
          err.code = 4001;
          throw err;
        }
        default: {
          const r = await fetch(RPC, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: id++, method, params }) });
          const j = await r.json();
          if (j.error) {
            const err = new Error(j.error.message);
            err.code = j.error.code;
            throw err;
          }
          return j.result;
        }
      }
    },
  };
  const detail = Object.freeze({ info: { uuid: "b3b1c0de-0000-4000-8000-0000000000ab", name: "Stub Wallet", icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%238b0000'/%3E%3C/svg%3E", rdns: "xyz.vamp.stub" }, provider });
  window.addEventListener("eip6963:requestProvider", () => window.dispatchEvent(new CustomEvent("eip6963:announceProvider", { detail })));
  window.dispatchEvent(new CustomEvent("eip6963:announceProvider", { detail }));
  if (!window.ethereum) window.ethereum = provider;
  console.log("[stub wallet] announced as", ACCOUNT);
})();

// End-to-end drive of the release flow in headless Chrome over the DevTools
// protocol, with the read-only wallet stub: connect → paste → extraction →
// editor → RELEASE THE VAMP → preflight → simulate → the stub refuses to sign
// → the error path. Real time, real RPC, nothing sent.
//
// usage: node scripts/cdp-flow.mjs [baseUrl]   → docs/captures/flow-*.png
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const base = process.argv[2] ?? "http://localhost:3857";
const chrome = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const out = path.resolve("docs/captures");
mkdirSync(out, { recursive: true });
const port = 9333 + Math.floor(Math.random() * 200);

const proc = spawn(
  chrome,
  [
    "--headless=new",
    "--no-first-run",
    `--user-data-dir=${path.join(process.env.TEMP ?? "/tmp", `vamp-cdp-${port}`)}`,
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
    "--hide-scrollbars",
    "--window-size=1440,900",
    `--remote-debugging-port=${port}`,
    "about:blank",
  ],
  { stdio: "ignore" },
);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function json(url) {
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(url);
      return await r.json();
    } catch {
      await sleep(200);
    }
  }
  throw new Error(`no answer from ${url}`);
}

const { webSocketDebuggerUrl } = await json(`http://127.0.0.1:${port}/json/version`);
const ws = new WebSocket(webSocketDebuggerUrl);
await new Promise((r, j) => {
  ws.onopen = r;
  ws.onerror = j;
});
let seq = 0;
const pending = new Map();
const events = [];
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(msg.error.message));
    else resolve(msg.result);
  } else if (msg.method) events.push(msg);
};
const send = (method, params = {}, sessionId) =>
  new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });

const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
const S = sessionId;
await send("Page.enable", {}, S);
await send("Runtime.enable", {}, S);
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, S);

const evaluate = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }, S);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + " " + JSON.stringify(r.exceptionDetails.exception?.description ?? ""));
  return r.result.value;
};
const shot = async (name) => {
  const { data } = await send("Page.captureScreenshot", { format: "png" }, S);
  const file = path.join(out, `flow-${name}.png`);
  writeFileSync(file, Buffer.from(data, "base64"));
  console.log("shot", file);
};
const waitFor = async (expression, label, timeout = 30_000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await evaluate(expression)) return;
    await sleep(250);
  }
  throw new Error(`timeout waiting for ${label}`);
};
const click = async (selectorExpr) => {
  const ok = await evaluate(`(() => { const el = ${selectorExpr}; if (!el) return false; el.click(); return true; })()`);
  if (!ok) throw new Error(`nothing to click for ${selectorExpr}`);
};

try {
  await send("Page.navigate", { url: `${base}/?intro=0` }, S);
  await waitFor(`!!document.querySelector('input[placeholder*="Paste token"]')`, "hero");
  await sleep(1200);
  await shot("1-hero");

  // The stub wallet, announced over EIP-6963.
  await evaluate(readFileSync(path.resolve("scripts/dev-wallet.js"), "utf8"));
  await sleep(800);
  const already = await evaluate(`/0xF3cB…B1E4/i.test(document.body.innerText)`);
  if (!already) {
    await click(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Connect')`);
    await waitFor(`!!document.querySelector('[aria-label="Connect a wallet"]')`, "connect dialog");
    await shot("2-connect");
    await click(`[...document.querySelectorAll('[aria-label="Connect a wallet"] button')].find(b => b.textContent.includes('Stub Wallet'))`);
    await waitFor(`/0xF3cB…B1E4/i.test(document.body.innerText)`, "connected address in nav");
  } else {
    console.log("wagmi picked the announced wallet up on its own");
    await shot("2-connected");
  }
  console.log("connected");

  // Paste and vamp.
  await evaluate(`(() => { const i = document.querySelector('input[placeholder*="Paste token"]'); const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(i, '0x37CCEb327019E618001978413db8968c1C6fFf14'); i.dispatchEvent(new Event('input', { bubbles: true })); return i.value; })()`);
  await click(`document.querySelector('button[type="submit"]')`);
  await waitFor(`!!document.querySelector('[aria-label="Extracting token metadata"]')`, "extraction");
  await sleep(1000);
  await shot("3-extracting");
  await waitFor(`!!document.querySelector('[aria-label="Token editor"]')`, "editor", 20_000);
  await sleep(1500);
  await shot("4-editor");

  const releaseState = await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim().toLowerCase() === 'release the vamp'); return b ? { disabled: b.disabled, reason: b.parentElement.querySelector('p')?.textContent ?? null } : null; })()`);
  console.log("release button", releaseState);
  if (!releaseState || releaseState.disabled) throw new Error("release button not enabled");

  await click(`[...document.querySelectorAll('button')].find(b => b.textContent.trim().toLowerCase() === 'release the vamp')`);
  await waitFor(`!!document.querySelector('[aria-label="Releasing the vamp"]')`, "release dialog");
  await sleep(600);
  await shot("5-releasing");
  await waitFor(`/Not released/i.test(document.body.innerText)`, "the refused signature", 60_000);
  const text = await evaluate(`document.querySelector('[aria-label="Releasing the vamp"]').innerText`);
  console.log("release dialog:\n" + text);
  const tx = await evaluate(`JSON.stringify(window.__STUB_LAST_TX ?? null)`);
  console.log("calldata the wallet was asked to sign:", tx?.slice(0, 400));
  await shot("6-refused");
  if (!/declined/i.test(text)) throw new Error("expected the declined-signature message");
  const first = JSON.parse(tx);
  if (!first?.data?.startsWith("0xa72101af")) throw new Error("expected factory.launchToken calldata without a dev buy");
  if (BigInt(first.value) !== 500000000000000n) throw new Error(`expected value = launch fee, got ${first.value}`);

  // Second pass with a dev buy: the forwarder path, value = fee + 0.01 ETH.
  await click(`[...document.querySelectorAll('[aria-label="Releasing the vamp"] button')].find(b => /back to the editor/i.test(b.textContent))`);
  await waitFor(`!document.querySelector('[aria-label="Releasing the vamp"]')`, "dialog closed");
  await evaluate(`(() => { const i = [...document.querySelectorAll('input')].find(x => x.placeholder === '0.00'); const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(i, '0.01'); i.dispatchEvent(new Event('input', { bubbles: true })); return i.value; })()`);
  await sleep(400);
  await click(`[...document.querySelectorAll('button')].find(b => b.textContent.trim().toLowerCase() === 'release the vamp')`);
  await waitFor(`/Not released/i.test(document.body.innerText)`, "second refusal", 60_000);
  const second = JSON.parse(await evaluate(`JSON.stringify(window.__STUB_LAST_TX ?? null)`));
  console.log("dev-buy calldata selector", second?.data?.slice(0, 10), "value", second?.value, "=", Number(BigInt(second.value)) / 1e18, "ETH");
  if (!second?.data?.startsWith("0xf85f8e41")) throw new Error("expected forwarder.launchAndBuy calldata with a dev buy");
  if (BigInt(second.value) !== 10500000000000000n) throw new Error(`expected value = fee + 0.01 ETH, got ${second.value}`);
  await shot("7-devbuy-refused");
  console.log("FLOW OK");
} catch (e) {
  console.error("FLOW FAILED:", e.message);
  await shot("failed").catch(() => {});
  process.exitCode = 1;
} finally {
  ws.close();
  proc.kill();
}

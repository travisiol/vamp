// Headless Chrome captures of the site (WebGL through SwiftShader, no GPU needed).
// usage: node scripts/capture.mjs [baseUrl]   → docs/captures/*.png
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const base = process.argv[2] ?? "http://localhost:3856";
const chrome = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const out = path.resolve("docs/captures");
mkdirSync(out, { recursive: true });

const shots = [
  { name: "home", url: "/", w: 1440, h: 900, budget: 9000 },
  { name: "home-full", url: "/?intro=0", w: 1440, h: 4400, budget: 12000 },
  { name: "editor", url: "/?ca=0x37CCEb327019E618001978413db8968c1C6fFf14", w: 1440, h: 1500, budget: 14000 },
  { name: "launched", url: "/launched", w: 1440, h: 1400, budget: 9000 },
  { name: "network", url: "/network", w: 1440, h: 1100, budget: 9000 },
  { name: "dashboard", url: "/dashboard", w: 1440, h: 1300, budget: 9000 },
];

// Phones: Chrome refuses windows narrower than ~500 px, so four 390 px iframes side by side.
const phoneRoutes = ["/?intro=0", "/?ca=0x37CCEb327019E618001978413db8968c1C6fFf14&t=800", "/?ca=0x37CCEb327019E618001978413db8968c1C6fFf14", "/dashboard"];
const harness = path.join(out, "mobile-harness.html");
writeFileSync(
  harness,
  `<!doctype html><body style="margin:0;background:#050505;display:flex;gap:16px;padding:16px">${phoneRoutes
    .map((r) => `<iframe src="${base}${r}" width="390" height="844" style="border:1px solid #1e1e1e;border-radius:24px;background:#050505"></iframe>`)
    .join("")}</body>`,
);
shots.push({ name: "mobile", url: null, file: harness, w: 1660, h: 880, budget: 16000 });

for (const s of shots) {
  const file = path.join(out, `${s.name}.png`);
  const args = [
    "--headless=new",
    "--no-first-run",
    `--user-data-dir=${path.join(process.env.TEMP ?? "/tmp", "vamp-shot")}`,
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
    "--hide-scrollbars",
    `--window-size=${s.w},${s.h}`,
    `--virtual-time-budget=${s.budget}`,
    `--screenshot=${file}`,
    s.url === null ? pathToFileURL(s.file).href : `${base}${s.url}`,
  ];
  const r = spawnSync(chrome, args, { stdio: "ignore", timeout: 120_000 });
  console.log(r.status === 0 ? "ok  " : "fail", s.name, file);
}

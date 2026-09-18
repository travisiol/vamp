export const site = {
  name: "VAMP",
  tagline: "Vamp any token on Robinhood.",
  description: "Paste a Robinhood Chain token contract. VAMP reads its public on-chain metadata, you customize the new launch, and release it through Pons.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://vamp.example",
  x: process.env.NEXT_PUBLIC_X_URL ?? "",
} as const;

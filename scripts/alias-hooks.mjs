// Lets Node run the app's TypeScript directly: resolves the "@/..." alias to
// src/ and adds ".ts" to extensionless relative imports.
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const src = path.resolve("src");
const withTs = (file) => (!/\.[a-z]+$/.test(file) && existsSync(`${file}.ts`) ? `${file}.ts` : file);

registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith("@/")) {
      return { url: pathToFileURL(withTs(path.join(src, specifier.slice(2)))).href, shortCircuit: true };
    }
    if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:")) {
      const file = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
      const resolved = withTs(file);
      if (resolved !== file) return { url: pathToFileURL(resolved).href, shortCircuit: true };
    }
    return next(specifier, context);
  },
});

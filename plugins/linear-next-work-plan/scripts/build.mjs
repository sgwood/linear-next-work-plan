import { readFile, writeFile } from "node:fs/promises";

import { build } from "esbuild";

const outfile = "dist/server.mjs";

await build({
  entryPoints: ["src/server.mjs"],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  loader: { ".html": "text" },
  outfile,
});

const bundle = await readFile(outfile, "utf8");
const normalizedBundle = `${bundle.replace(/[ \t]+$/gm, "").trimEnd()}\n`;
await writeFile(outfile, normalizedBundle, "utf8");

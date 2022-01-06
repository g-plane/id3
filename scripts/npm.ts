import { emptyDir } from "https://deno.land/std@0.120.0/fs/mod.ts";
import { build } from "https://deno.land/x/dnt@0.12.0/mod.ts";

await emptyDir("./npm");

await build({
  entryPoints: ["./mod.ts"],
  outDir: "./npm",
  shims: {},
  package: {
    name: "@gplane/id3",
    version: "0.0.0",
    description: "ID3 tag manipulation library.",
    author: "Pig Fang <g-plane@hotmail.com>",
    license: "MIT",
    keywords: ["ID3", "audio", "music"],
    sideEffects: false,
    publishConfig: {
      access: "public",
    },
  },
  packageManager: "pnpm",
  test: false,
  typeCheck: false,
  skipSourceOutput: true,
});

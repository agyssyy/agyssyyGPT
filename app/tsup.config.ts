import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    cli: "src/bin.ts",
    index: "src/index.ts",
  },
  format: ["esm"],
  target: "node20",
  splitting: false,
  dts: true,
  clean: true,
  sourcemap: true,
  banner: { js: "#!/usr/bin/env node" },
});

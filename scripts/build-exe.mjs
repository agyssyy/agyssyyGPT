#!/usr/bin/env node
/**
 * Build a standalone Windows executable (agyssyy.exe) from the AgyssyyGPT CLI using
 * Node's single-executable-application (SEA) support.
 *
 * Pipeline (validated on Node 24 + Windows):
 *   1. esbuild bundles src/bin.ts -> a single CommonJS file (SEA needs CJS)
 *   2. `node --experimental-sea-config` generates the SEA blob
 *   3. a copy of the Node runtime becomes agyssyy.exe
 *   4. postject injects the blob into that copy
 *
 * Usage: node scripts/build-exe.mjs [outputDir]   (default: ./dist-exe)
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const app = join(root, "app");
const outDir = resolve(process.argv[2] ?? join(root, "dist-exe"));
const outFile = join(outDir, "agyssyy.exe");
const work = join(outDir, ".sea");
const bundleFile = join(outDir, "bundle", "cli.js");
const seaConfig = join(outDir, "sea-config.json");
const FUSE = "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2";

if (process.platform !== "win32") {
  process.stderr.write(
    "[build-exe] agyssyy.exe is a Windows binary. Run this on Windows (or a Windows CI runner).\n",
  );
  process.exit(1);
}

console.log("[build-exe] 1/5 bundling the CLI to CJS");
await build({
  entryPoints: [join(app, "src", "bin.ts")],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  banner: { js: "#!/usr/bin/env node" },
  outfile: bundleFile,
});

console.log("[build-exe] 2/5 writing SEA config");
rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });
writeFileSync(
  seaConfig,
  JSON.stringify({
    main: "bundle/cli.js",
    output: ".sea/sea-prep.blob",
    disableExperimentalSEAWarning: true,
  }),
);

console.log("[build-exe] 3/5 generating the SEA blob");
execFileSync(process.execPath, ["--experimental-sea-config", seaConfig], {
  cwd: outDir,
  stdio: "inherit",
});

console.log("[build-exe] 4/5 copying the Node runtime");
copyFileSync(process.execPath, outFile);

console.log("[build-exe] 5/5 injecting the blob with postject");
const shim = join(work, "postject.cmd");
writeFileSync(
  shim,
  [
    "@echo off",
    [
      "npx --yes postject",
      '"' + outFile + '"',
      "NODE_SEA_BLOB",
      '"' + join(work, "sea-prep.blob") + '"',
      "--sentinel-fuse",
      FUSE,
    ].join(" "),
    "",
  ].join("\r\n"),
);
execFileSync("cmd.exe", ["/d", "/c", shim], { cwd: outDir, stdio: "inherit" });

if (!existsSync(outFile)) {
  process.stderr.write("[build-exe] postject did not produce " + outFile + "\n");
  process.exit(1);
}
console.log("[build-exe] done -> " + outFile);

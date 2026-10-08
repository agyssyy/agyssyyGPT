#!/usr/bin/env node
/**
 * Builds a standalone Windows executable (agyssyy.exe) from the AgyssyyGPT CLI
 * using Node's single-executable-application (SEA) support.
 *
 * Prerequisites (Windows, x64/arm64):
 *   - Node.js >= 20 (the same major used to run this script)
 *   - `postject` available (npx downloads it on demand)
 *
 * This is intentionally best-effort: if the toolchain is unavailable the script
 * exits non-zero with instructions instead of leaving a broken binary behind.
 *
 * Usage: node scripts/build-exe.mjs [outputPath]
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const app = join(root, "app");
const outFile = resolve(process.argv[2] ?? join(root, "dist-exe", "agyssyy.exe"));
const work = join(root, "dist-exe", ".sea");
const FUSE = "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2";

function run(command, args, cwd = root) {
  execFileSync(command, args, { cwd, stdio: "inherit", shell: process.platform === "win32" });
}

function fail(message) {
  process.stderr.write(`\n[build-exe] ${message}\n`);
  process.exit(1);
}

if (process.platform !== "win32") {
  fail("agyssyy.exe is a Windows binary. Run this on Windows (or in a Windows CI runner).");
}

console.log("[build-exe] 1/5 building the CLI bundle");
run("npm", ["run", "build"], app);

if (!existsSync(join(app, "dist", "cli.js"))) {
  fail("app/dist/cli.js was not produced. Check the app build output.");
}

console.log("[build-exe] 2/5 writing SEA config");
rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });

const seaConfig = join(work, "sea-config.json");
writeFileSync(
  seaConfig,
  JSON.stringify(
    {
      main: join(app, "dist", "cli.js"),
      output: join(work, "sea-prep.blob"),
      disableExperimentalSEAWarning: true,
    },
    null,
    2,
  ),
);

console.log("[build-exe] 3/5 generating the SEA blob");
run(process.execPath, ["--experimental-sea-config", seaConfig], work);

console.log("[build-exe] 4/5 copying the Node runtime");
mkdirSync(dirname(outFile), { recursive: true });
copyFileSync(process.execPath, outFile);

console.log("[build-exe] 5/5 injecting the blob with postject");
run("npx", [
  "--yes",
  "postject",
  outFile,
  "NODE_SEA_BLOB",
  join(work, "sea-prep.blob"),
  "--sentinel-fuse",
  FUSE,
]);

console.log(`[build-exe] done -> ${outFile}`);

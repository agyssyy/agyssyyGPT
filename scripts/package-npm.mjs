#!/usr/bin/env node
/**
 * Assembles the npm package (packages/npm) by copying the freshly built
 * agyssyy.exe next to its README.md + package.json, then optionally packs it.
 *
 * Usage:
 *   node scripts/package-npm.mjs          # assemble only
 *   node scripts/package-npm.mjs --pack   # assemble + `npm pack`
 *   node scripts/package-npm.mjs --publish
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pkgDir = join(root, "packages", "npm");
const source = resolve(process.argv.find((a) => a.endsWith(".exe")) ?? join(root, "dist-exe", "agyssyy.exe"));
const target = join(pkgDir, "agyssyy.exe");

if (!existsSync(source)) {
  process.stderr.write(
    `[package-npm] no binary at ${source}\n` +
      `  Build it first (node scripts/build-exe.mjs) or drop a prebuilt agyssyy.exe there.\n` +
      `  The npm package is intentionally "exe + README.md only", so this step is required.\n`,
  );
  process.exit(1);
}

copyFileSync(source, target);
console.log(`[package-npm] copied ${source} -> ${target}`);

const mode = process.argv.includes("--publish") ? "publish" : process.argv.includes("--pack") ? "pack" : null;
if (mode) {
  const args = mode === "publish" ? ["publish", "--access", "public"] : ["pack"];
  if (process.platform === "win32") {
    execFileSync("cmd.exe", ["/d", "/c", "npm " + args.join(" ")], {
      cwd: pkgDir,
      stdio: "inherit",
    });
  } else {
    execFileSync("npm", args, { cwd: pkgDir, stdio: "inherit" });
  }
}

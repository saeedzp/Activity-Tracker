/**
 * Writes public/version.json before the build.
 *
 * Served as a plain static asset, so it answers "which commit is actually
 * live?" even when the app's functions are failing — which is exactly when
 * that question matters.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";

function gitSha() {
  // Cloudflare exposes the commit it is building; fall back to git locally.
  if (process.env.CF_PAGES_COMMIT_SHA) return process.env.CF_PAGES_COMMIT_SHA;
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

mkdirSync("public", { recursive: true });
const version = {
  commit: gitSha().slice(0, 7),
  built_at: new Date().toISOString(),
  branch: process.env.CF_PAGES_BRANCH ?? "local",
};
writeFileSync("public/version.json", JSON.stringify(version, null, 2) + "\n");
console.log("version stamp:", JSON.stringify(version));

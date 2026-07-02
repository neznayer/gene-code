#!/usr/bin/env bun
// Rewrites `workspace:` dependency ranges to concrete semver at pack time.
//
// changesets publishes via `npm publish` (for OIDC Trusted Publishing), but npm
// only rewrites the `workspace:` protocol for workspaces *it* manages. Here bun
// links the workspace, so `workspace:*` leaks into the published tarball and
// makes the package uninstallable from the registry.
//
// Wire this into a publishable package as:
//   "prepack":  "bun ../../scripts/workspace-protocol.ts pin",
//   "postpack": "bun ../../scripts/workspace-protocol.ts restore",
//
// `pin` runs in the package dir just before the tarball is built and replaces
// each `workspace:` range with the depended-on package's actual version. It
// writes a `.package.json.bak` sidecar. `restore` puts the original manifest
// back so the working tree keeps `workspace:*`.

import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const mode = process.argv[2];
const cwd = process.cwd();
const manifestPath = join(cwd, "package.json");
const backupPath = join(cwd, ".package.json.bak");

// Root of the monorepo, relative to this script (scripts/ -> repo root).
const repoRoot = join(import.meta.dir, "..");

/** Read a workspace package's current version by name from packages/ *. */
function resolveWorkspaceVersion(depName: string): string {
  // All workspace packages live under packages/*; find the one whose
  // package.json `name` matches.
  const { readdirSync } = require("node:fs");
  const pkgsDir = join(repoRoot, "packages");
  for (const entry of readdirSync(pkgsDir)) {
    const p = join(pkgsDir, entry, "package.json");
    if (!existsSync(p)) continue;
    const pkg = JSON.parse(readFileSync(p, "utf8"));
    if (pkg.name === depName && typeof pkg.version === "string") {
      return pkg.version;
    }
  }
  throw new Error(`Cannot resolve workspace version for "${depName}"`);
}

/**
 * Translate a `workspace:` range to a concrete range.
 *   workspace:*      -> ^<version>   (compatible, the common case)
 *   workspace:~      -> ~<version>
 *   workspace:^      -> ^<version>
 *   workspace:<expr> -> <expr>       (already an explicit range)
 */
function translate(range: string, version: string): string {
  const rest = range.slice("workspace:".length);
  if (rest === "*" || rest === "^") return `^${version}`;
  if (rest === "~") return `~${version}`;
  return rest; // explicit semver was given after the protocol
}

const DEP_FIELDS = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
] as const;

if (mode === "pin") {
  const raw = readFileSync(manifestPath, "utf8");
  writeFileSync(backupPath, raw); // exact bytes, so restore is lossless
  const pkg = JSON.parse(raw);
  let changed = false;
  for (const field of DEP_FIELDS) {
    const deps = pkg[field];
    if (!deps) continue;
    for (const [name, range] of Object.entries(deps)) {
      if (typeof range === "string" && range.startsWith("workspace:")) {
        deps[name] = translate(range, resolveWorkspaceVersion(name));
        changed = true;
      }
    }
  }
  if (changed) {
    writeFileSync(manifestPath, `${JSON.stringify(pkg, null, 2)}\n`);
  }
} else if (mode === "restore") {
  if (existsSync(backupPath)) {
    writeFileSync(manifestPath, readFileSync(backupPath, "utf8"));
    unlinkSync(backupPath);
  }
} else {
  console.error(`usage: workspace-protocol.ts <pin|restore>`);
  process.exit(1);
}

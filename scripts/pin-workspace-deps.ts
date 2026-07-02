#!/usr/bin/env bun
// Rewrites `workspace:` dependency ranges to concrete semver, in place, across
// every package under packages/*.
//
// Source manifests keep `workspace:*` so bun live-links the local package
// during development (a semver range makes bun snapshot a copy instead). But
// `workspace:*` is not a valid range on npm, so it must be replaced before
// publishing. This runs as an explicit CI step just before `changeset publish`,
// on the throwaway CI checkout — so there is nothing to restore afterwards.
//
// Doing it here rather than in npm `prepack`/`postpack` hooks is deliberate:
// those hooks fought `npm publish` (invoked by changesets) and left the leaked
// `workspace:*` in the published tarball. A workflow step cannot be bypassed by
// the packer's timing.

import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "..");
const pkgsDir = join(repoRoot, "packages");

// name -> concrete version, read from each workspace manifest.
const versions = new Map<string, string>();
const manifests: { path: string; pkg: any }[] = [];

for (const entry of readdirSync(pkgsDir)) {
  const path = join(pkgsDir, entry, "package.json");
  if (!existsSync(path)) continue;
  const pkg = JSON.parse(readFileSync(path, "utf8"));
  manifests.push({ path, pkg });
  if (pkg.name && pkg.version) versions.set(pkg.name, pkg.version);
}

/**
 *   workspace:*      -> ^<version>
 *   workspace:^      -> ^<version>
 *   workspace:~      -> ~<version>
 *   workspace:<expr> -> <expr>   (explicit range already given)
 */
function translate(range: string, version: string): string {
  const rest = range.slice("workspace:".length);
  if (rest === "*" || rest === "^") return `^${version}`;
  if (rest === "~") return `~${version}`;
  return rest;
}

const DEP_FIELDS = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
] as const;

let rewrote = 0;
for (const { path, pkg } of manifests) {
  let changed = false;
  for (const field of DEP_FIELDS) {
    const deps = pkg[field];
    if (!deps) continue;
    for (const [name, range] of Object.entries(deps)) {
      if (typeof range === "string" && range.startsWith("workspace:")) {
        const version = versions.get(name);
        if (!version) throw new Error(`No workspace version for "${name}" (in ${path})`);
        deps[name] = translate(range, version);
        changed = true;
        rewrote++;
      }
    }
  }
  if (changed) writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`);
}

console.log(`pin-workspace-deps: rewrote ${rewrote} workspace: range(s)`);

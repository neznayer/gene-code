---
"@gene-code/rehype": patch
---

Publish a concrete `@gene-code/core` version range instead of the internal
`workspace:*` protocol, which had leaked into published tarballs and made the
package impossible to install from npm. The `workspace:` protocol is now
rewritten to `^<version>` as a release step, so source manifests keep
`workspace:*` for local development.

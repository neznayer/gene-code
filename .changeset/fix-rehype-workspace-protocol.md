---
"@gene-code/rehype": patch
---

Fix the published package shipping an unresolvable `"@gene-code/core":
"workspace:*"` dependency. The `workspace:` protocol is now rewritten to the
concrete core version (`^x.y.z`) at pack time, so `@gene-code/rehype` installs
correctly from npm while the source manifest keeps `workspace:*` for local
development.

# @gene-code/rehype

## 0.0.9

### Patch Changes

- [#7](https://github.com/neznayer/gene-code/pull/7) [`8fd6043`](https://github.com/neznayer/gene-code/commit/8fd60430e58fb5f124f971457826e63f761da985) Thanks [@neznayer](https://github.com/neznayer)! - Publish a concrete `@gene-code/core` version range instead of the internal
  `workspace:*` protocol, which had leaked into published tarballs and made the
  package impossible to install from npm. The `workspace:` protocol is now
  rewritten to `^<version>` as a release step, so source manifests keep
  `workspace:*` for local development.

## 0.0.8

### Patch Changes

- [`e0f666a`](https://github.com/neznayer/gene-code/commit/e0f666aed0d8df0bbcc62dcd4292307a7b75e9ef) Thanks [@neznayer](https://github.com/neznayer)! - - Fix pedigree diagram - center & scale.
  - Add gene label to lollipop diagram.
- Updated dependencies [[`e0f666a`](https://github.com/neznayer/gene-code/commit/e0f666aed0d8df0bbcc62dcd4292307a7b75e9ef)]:
  - @gene-code/core@0.2.0

## 0.0.7

### Patch Changes

- [#4](https://github.com/neznayer/gene-code/pull/4) [`7d0350b`](https://github.com/neznayer/gene-code/commit/7d0350bdc841fcb000a64ac518fb9c586ae91f04) Thanks [@neznayer](https://github.com/neznayer)! - Fix the published package shipping an unresolvable `"@gene-code/core":
"workspace:*"` dependency. The `workspace:` protocol is now rewritten to the
  concrete core version (`^x.y.z`) at pack time, so `@gene-code/rehype` installs
  correctly from npm while the source manifest keeps `workspace:*` for local
  development.

## 0.0.6

### Patch Changes

- Updated dependencies [[`6859b69`](https://github.com/neznayer/gene-code/commit/6859b69a6bf9d579a7cff8596829f67cf43625e1)]:
  - @gene-code/core@0.1.0

## 0.0.5

### Patch Changes

- Updated dependencies [[`ce511e6`](https://github.com/neznayer/gene-code/commit/ce511e62724573274262f87920154711db8fdf2f)]:
  - @gene-code/core@0.0.3

## 0.0.4

### Patch Changes

- [`a425ae1`](https://github.com/neznayer/gene-code/commit/a425ae158be991a30287cb442eeb2cdb8a06d851) Thanks [@neznayer](https://github.com/neznayer)! - try changesets

- Updated dependencies [[`a425ae1`](https://github.com/neznayer/gene-code/commit/a425ae158be991a30287cb442eeb2cdb8a06d851)]:
  - @gene-code/core@0.0.2

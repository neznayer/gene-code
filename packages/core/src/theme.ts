// Themeable color tokens.
//
// Colors are emitted as CSS custom properties with the original literal as the
// fallback, e.g. `var(--gc-ink, black)`.
//
// Two kinds of token:
//   - Structural ink (lines, text, symbol outlines): `--gc-ink`, so all incidental
//     drawing follows the reader's text color.
//   - Palette (variant classes, domain box, stems): individually named vars whose
//     fallbacks preserve the meaningful hues.
//
// Pedigree symbol fills are deliberately NOT collapsed to one color: "filled =
// affected" vs "open = unaffected" is a domain convention that must survive
// theming. They map to `--gc-ink` (foreground) and `--gc-surface` (background)
// so the filled/open *contrast* holds in both light and dark themes.

/** A CSS `var(--name, fallback)` reference. */
function token(name: string, fallback: string): string {
  return `var(${name}, ${fallback})`;
}

export const theme = {
  /** Structural ink: lines, text, and symbol outlines. */
  ink: token("--gc-ink", "black"),
  /** Page/background color — the "open" (unaffected) pedigree fill. */
  surface: token("--gc-surface", "white"),

  // Lollipop palette. Hue semantics: warm = damaging, cool = benign.
  variant: {
    missense: token("--gc-variant-missense", "#d1495b"),
    nonsense: token("--gc-variant-nonsense", "#5b7c99"),
    frameshift: token("--gc-variant-frameshift", "#e0955b"),
    splice: token("--gc-variant-splice", "#5a9367"),
    synonymous: token("--gc-variant-synonymous", "#9a9a9a"),
  },

  domainFill: token("--gc-domain-fill", "#e4e0d8"),
  domainStroke: token("--gc-domain-stroke", "#8c8577"),

  stem: token("--gc-stem", "#5c5c5c"),
  headRing: token("--gc-head-ring", "#fbfbfb"),
} as const;

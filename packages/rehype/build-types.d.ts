// Ambient stub used only during declaration emit (tsconfig.build.json).
// @gene-code/core is not part of rehype's public API surface, so `tsc` does
// not need core's built types to emit rehype's .d.ts. This decouples the two
// builds: rehype can be built/published even when core's dist/ is absent
// (e.g. on publish, when core is skipped because it is already released).
declare module "@gene-code/core" {
  export function render(dsl: string): string | undefined;
}

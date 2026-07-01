import { splitRows } from "./src/dsl";
import { registry } from "./src/registry";
import { render as renderBase } from "./src/render";
import type { SVGString } from "./src/types";

/**
 * Renders a DSL string to an SVG. Returns null for empty, unknown, or
 * malformed input (e.g. a partially-typed diagram) so callers can keep the
 * previous output rather than handling thrown errors.
 */
export function render(dsl: string): SVGString | null {
  const rows = splitRows(dsl);
  const diagramKeyword = rows[0];

  if (!diagramKeyword) {
    return null;
  }

  const module = registry[diagramKeyword as keyof typeof registry];

  if (!module) {
    return null;
  }

  try {
    const diagram = module.parse(rows);
    const layout = module.layout(diagram);
    return renderBase(layout);
  } catch {
    return null;
  }
}

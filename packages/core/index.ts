import { splitRows } from "./src/dsl";
import { registry } from "./src/registry";
import { render as renderBase } from "./src/render";
import type { SVGString } from "./src/types";

export function render(dsl: string): SVGString {
  const rows = splitRows(dsl);
  const diagramKeyword = rows[0];

  if (!diagramKeyword) {
    throw new Error("Empty DSL input");
  }

  const module = registry[diagramKeyword as keyof typeof registry];

  if (!module) {
    throw new Error(`Unknown diagram type: ${diagramKeyword}`);
  }

  const diagram = module.parse(rows);
  console.log("diagram", diagram);
  const layout = module.layout(diagram);
  const svg = renderBase(layout);

  return svg;
}

import { tokenize } from "../dsl";
import { INNER_WIDTH, MARGIN_X, MARGIN_Y, WIDTH_PX } from "../render";
import type { DiagramModule, Layout, LayoutNode } from "../types";

export type GeneDiagram = {
  type: "geneDiagram";
  gene: string;
  /** Protein length in amino acids. Defines the right end of the backbone. */
  length: number;
  domains: Domain[];
  variants: Variant[];
};

export interface Domain {
  /** First residue of the domain (amino-acid position, 1-based). */
  start: number;
  /** Last residue of the domain (amino-acid position, 1-based). */
  end: number;
  label?: string;
}

export interface Variant {
  label: string;
  /** Residue number the variant affects (amino-acid position, 1-based). */
  pos: number;
  class: VariantClass;
}

export type VariantClass = "missense" | "nonsense" | "frameshift" | "splice" | "synonymous";

const Y_OFFSET_PX = 12;
const BLOCK_HEIGHT_PX = 10;
const LOLLIPOP_RADIUS_PX = 3;

const VARIANT_COLORS: Record<VariantClass, string> = {
  missense: "red",
  nonsense: "blue",
  frameshift: "orange",
  splice: "green",
  synonymous: "gray",
};

function parseDomain(words: string[]): Domain {
  const [start, end, ...rest] = words;

  return {
    start: Number(start),
    end: Number(end),
    ...(rest.length ? { label: rest.join(" ") } : {}),
  };
}

function parseVariant(words: string[]): Variant {
  const [label, pos, varClass] = words;

  if (!label || !pos || !varClass) {
    throw new Error(`Invalid variant row: ${words.join(" ")}`);
  }

  if (Number.isNaN(Number(pos))) {
    throw new Error(`Invalid variant position: ${pos}`);
  }

  return {
    label,
    pos: Number(pos),
    class: varClass as VariantClass,
  };
}

function groupVariantsByPos(variants: Variant[]): Record<number, Variant[]> {
  const variantsByPos: Record<number, Variant[]> = {};

  for (const variant of variants) {
    const pos = variant.pos;

    if (variantsByPos[pos]) {
      variantsByPos[pos].push(variant);
    } else {
      variantsByPos[pos] = [variant];
    }
  }

  return variantsByPos;
}

export function parse(rows: string[]): GeneDiagram {
  const diagram = { type: "geneDiagram", domains: [], variants: [] } as unknown as GeneDiagram;

  if (rows.length === 0) {
    throw new Error("Empty DSL input");
  }

  for (const row of rows) {
    const [keyword, ...rest] = tokenize(row);

    switch (keyword) {
      case "geneDiagram": {
        diagram.type = "geneDiagram";
        break;
      }
      case "length": {
        diagram.length = Number(rest[0]);
        break;
      }
      case "gene": {
        diagram.gene = rest.join(" ");
        break;
      }
      case "domain": {
        diagram.domains.push(parseDomain(rest));
        break;
      }
      case "variant": {
        diagram.variants.push(parseVariant(rest));
        break;
      }
      default: {
        throw new Error(`Unknown keyword: ${keyword}`);
      }
    }
  }

  if (!diagram.length || Number.isNaN(diagram.length)) {
    throw new Error("geneDiagram requires a `length` (protein length in amino acids)");
  }

  return diagram;
}

export function layout(ast: GeneDiagram): Layout {
  const nodes: LayoutNode[] = [];

  // Protein space: the axis runs over amino-acid positions 1 … length.
  const xDomain: [number, number] = [1, ast.length];

  const xScale = (x: number) =>
    MARGIN_X + (INNER_WIDTH * (x - xDomain[0])) / (xDomain[1] - xDomain[0]);

  const variantsByPos = groupVariantsByPos(ast.variants);

  const maxVariantsStack = Math.max(
    1,
    ...Object.values(variantsByPos).map((variants) => variants.length),
  );

  // Screen-space y-axis (grows downward). Variants stack up from the backbone,
  // so the backbone sits below a band tall enough for the deepest stack.
  const stackHeight = maxVariantsStack * Y_OFFSET_PX;
  const backboneY = MARGIN_Y + stackHeight;

  // Backbone: full protein 1 → length.
  nodes.push({
    type: "line",
    x1: xScale(xDomain[0]),
    x2: xScale(xDomain[1]),
    y1: backboneY,
    y2: backboneY,
  });

  // Domains: boxes centered on the backbone.
  for (const domain of ast.domains) {
    const x = xScale(domain.start);
    const width = xScale(domain.end) - xScale(domain.start);

    nodes.push({
      type: "group",
      x,
      y: backboneY,
      children: [
        {
          type: "rect",
          x: 0,
          y: -BLOCK_HEIGHT_PX / 2,
          width,
          height: BLOCK_HEIGHT_PX,
        },
        {
          type: "text",
          x: width / 2,
          y: BLOCK_HEIGHT_PX / 2 + MARGIN_Y - 4,
          text: domain.label || "",
          anchor: "middle",
          baseline: "hanging",
        },
      ],
    });
  }

  // Variants: lollipops rising from the backbone. Same-position variants stack.
  for (const [pos, variants] of Object.entries(variantsByPos)) {
    const x = xScale(Number(pos));

    for (const [i, v] of variants.entries()) {
      const headY = backboneY - (i + 1) * Y_OFFSET_PX;

      nodes.push({
        type: "group",
        x,
        y: 0,
        children: [
          // Leader line from the backbone up to this variant's head.
          {
            type: "line",
            x1: 0,
            y1: backboneY,
            x2: 0,
            y2: headY,
          },
          {
            type: "circle",
            x: 0,
            y: headY,
            color: VARIANT_COLORS[v.class],
            radius: LOLLIPOP_RADIUS_PX,
          },
          {
            type: "text",
            x: LOLLIPOP_RADIUS_PX + 2,
            y: headY + LOLLIPOP_RADIUS_PX,
            text: v.label,
          },
        ],
      });
    }
  }

  return {
    width: WIDTH_PX,
    height: backboneY + BLOCK_HEIGHT_PX / 2 + MARGIN_Y,
    nodes,
  };
}

export const geneDiagram: DiagramModule<GeneDiagram> = {
  keyword: "geneDiagram",
  parse,
  layout,
};

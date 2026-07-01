import { tokenize } from "../dsl";
import { INNER_WIDTH, MARGIN_X, MARGIN_Y, WIDTH_PX } from "../render";
import type { DiagramModule, Layout, LayoutNode } from "../types";

export type GeneDiagram = {
  type: "geneDiagram";
  gene: string;
  length?: number;
  exons: Exon[];
  variants: Variant[];
};

export interface Exon {
  start: number;
  end: number;
  label?: string;
}

export interface Variant {
  label: string;
  pos: number;
  class: VariantClass;
}

export type VariantClass = "missense" | "nonsense" | "frameshift" | "splice" | "synonimus";

const Y_OFFSET_PX = 10;
const BLOCK_HEIGHT_PX = 10;

const VARIANT_COLORS: Record<VariantClass, string> = {
  missense: "red",
  nonsense: "blue",
  frameshift: "orange",
  splice: "green",
  synonimus: "gray",
};

function parseExon(words: string[]): Exon {
  const [start, end, ...rest] = words;

  return {
    start: Number(start),
    end: Number(end),
    ...(rest ? { label: rest.join(" ") } : {}),
  };
}

function parseVariant(words: string[]): Variant {
  const [label, pos, varClass] = words;

  if (!label || !pos || !varClass) {
    throw new Error(`Invalid variant row: ${words.join(" ")}`);
  }

  if (Number.isNaN(pos)) {
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
  const diagram = {} as GeneDiagram;

  if (rows.length === 0) {
    throw new Error("Empty DSL input");
  }

  for (const row of rows) {
    const [keyword, ...rest] = tokenize(row);

    switch (keyword) {
      case "geneDiagram": {
        // Parse gene diagram properties
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
      case "exon": {
        if (!diagram.exons) {
          diagram.exons = [parseExon(rest)];
        } else {
          diagram.exons.push(parseExon(rest));
        }
        break;
      }
      case "variant": {
        // Parse variant properties
        if (!diagram.variants) {
          diagram.variants = [parseVariant(rest)];
        } else {
          diagram.variants.push(parseVariant(rest));
        }

        break;
      }
      default: {
        throw new Error(`Unknown keyword: ${keyword}`);
      }
    }
  }

  return diagram;
}

export function layout(ast: GeneDiagram): Layout {
  const result = [] as LayoutNode[];

  let xDomain = [0, 0] as [number, number];

  if (ast.length) {
    xDomain = [0, ast.length];
  } else {
    // calculate range from exons and variants

    const min = Math.min(
      ...ast.exons.map((exon) => exon.start),
      ...ast.variants.map((variant) => variant.pos),
    );

    const max = Math.max(
      ...ast.exons.map((exon) => exon.end),
      ...ast.variants.map((variant) => variant.pos),
    );

    xDomain = [min, max];
  }

  const xScale = (x: number) =>
    MARGIN_X + (INNER_WIDTH * (x - xDomain[0])) / (xDomain[1] - xDomain[0]);

  const variantsByPos = groupVariantsByPos(ast.variants);

  const maxVariantsStack = Math.max(
    ...Object.values(variantsByPos).map((variants) => variants.length),
  );

  const yScale = (y: number) => MARGIN_Y + BLOCK_HEIGHT_PX + maxVariantsStack * Y_OFFSET_PX - y;

  result.push({
    type: "line",
    x1: xScale(0),
    x2: xScale(xDomain[1]) - xScale(xDomain[0]),
    y1: yScale(BLOCK_HEIGHT_PX / 2),
    y2: yScale(BLOCK_HEIGHT_PX / 2),
  });

  for (const exon of ast.exons) {
    result.push({
      type: "group",
      x: xScale(exon.start),
      y: yScale(0),

      children: [
        {
          type: "rect",
          x: 0,
          y: -BLOCK_HEIGHT_PX,
          width: xScale(exon.end) - xScale(exon.start),
          height: BLOCK_HEIGHT_PX,
        },
        {
          type: "text",
          x: (xScale(exon.end) - xScale(exon.start)) / 2,
          y: yScale(BLOCK_HEIGHT_PX / 2),
          text: exon.label || "",
          anchor: "middle",
        },
        {
          type: "text",
          x: 0,
          y: yScale(MARGIN_Y),
          text: exon.start.toString(),
          baseline: "hanging",
          anchor: "middle",
        },
        {
          type: "text",
          x: xScale(exon.end),
          y: yScale(MARGIN_Y),
          text: exon.end.toString(),
          baseline: "hanging",
          anchor: "middle",
        },
      ],
    });
  }

  for (const [pos, varinats] of Object.entries(variantsByPos)) {
    const x = xScale(Number(pos));

    for (const [i, v] of varinats.entries()) {
      result.push({
        type: "group",
        x,
        y: yScale((i + 1) * Y_OFFSET_PX + BLOCK_HEIGHT_PX),
        children: [
          {
            type: "circle",
            x: 0,
            y: 0,
            color: VARIANT_COLORS[v.class],
            radius: 3,
          },
          {
            type: "line",
            x1: 0,
            y1: 0,
            x2: 0,
            y2: yScale(0) - yScale(BLOCK_HEIGHT_PX),
          },
          {
            type: "text",
            x: 5,
            y: 4,
            text: v?.label ?? "",
          },
        ],
      });
    }
  }

  return {
    width: WIDTH_PX,
    height: MARGIN_Y * 2 + BLOCK_HEIGHT_PX + maxVariantsStack * Y_OFFSET_PX,
    nodes: result,
  };
}

export const geneDiagram: DiagramModule<GeneDiagram> = {
  keyword: "geneDiagram",
  parse,
  layout,
};

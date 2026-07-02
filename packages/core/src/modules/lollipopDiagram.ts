import { tokenize } from "../dsl";
import { INNER_WIDTH, MARGIN_X, MARGIN_Y, WIDTH_PX } from "../render";
import type { DiagramModule, Layout, LayoutNode } from "../types";

export type LollipopDiagram = {
  type: "lollipopDiagram";
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
const FIRST_VARIANT_GAP_PX = 15;
const BLOCK_HEIGHT_PX = 10;
const LOLLIPOP_RADIUS_PX = 3;
const ELBOW_RADIUS_PX = 3;
// Text is rendered at font-size 10 (see render.ts); reserve a full line-height
// so hanging-baseline labels below the backbone aren't clipped by the SVG edge.
const FONT_SIZE_PX = 10;
// Gap from the backbone down to the top (hanging baseline) of a domain label.
const DOMAIN_LABEL_GAP_PX = BLOCK_HEIGHT_PX / 2 + MARGIN_Y - 4;

/**
 * Orthogonal stem from the backbone anchor `(x, y0)` up to the head `(headX, y1)`
 * (`y1 < y0`). Runs vertical → horizontal → vertical with rounded elbows so the
 * dodge never draws a diagonal. Falls back to a straight vertical when the head
 * isn't dodged.
 */
function stemPath(x: number, y0: number, headX: number, y1: number): string {
  const dx = headX - x;

  if (Math.abs(dx) < 0.5) {
    return `M ${x} ${y0} L ${x} ${y1}`;
  }

  const dir = Math.sign(dx);
  // The horizontal jog sits halfway up the stem; clamp the corner radius so it
  // fits both the vertical room (each corner eats half the run) and the jog.
  const jogY = (y0 + y1) / 2;
  const r = Math.min(ELBOW_RADIUS_PX, Math.abs(dx) / 2, Math.abs(y0 - y1) / 4);

  // Up to the first elbow, arc into the horizontal, run across, arc up, finish.
  return [
    `M ${x} ${y0}`,
    `L ${x} ${jogY + r}`,
    `Q ${x} ${jogY} ${x + dir * r} ${jogY}`,
    `L ${headX - dir * r} ${jogY}`,
    `Q ${headX} ${jogY} ${headX} ${jogY - r}`,
    `L ${headX} ${y1}`,
  ].join(" ");
}

// Muted, harmonious palette (desaturated ~500-level tones) instead of the
// harsh CSS primaries. Hue semantics kept: warm = damaging, cool = benign.
const VARIANT_COLORS: Record<VariantClass, string> = {
  missense: "#d1495b", // dusty rose-red — the common damaging class
  nonsense: "#5b7c99", // slate blue
  frameshift: "#e0955b", // muted amber
  splice: "#5a9367", // sage green
  synonymous: "#9a9a9a", // neutral gray — silent
};

// Domain box fill — soft warm gray with a slightly darker outline.
const DOMAIN_FILL = "#e4e0d8";
const DOMAIN_STROKE = "#8c8577";

// Stems and lollipop-head ring — soft charcoal instead of pure black; the
// white-ish ring lets stacked heads read as separate discs.
const STEM_COLOR = "#5c5c5c";
const HEAD_RING = "#fbfbfb";

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

/** A variant assigned a stacking level and a (possibly dodged) head x. */
interface PlacedVariant {
  variant: Variant;
  /** True residue position on the backbone — where the stem is anchored. */
  x: number;
  /** Head x, dodged away from the anchor to separate near-adjacent heads. */
  headX: number;
  /** Vertical stack level (0 = closest to backbone). */
  level: number;
}

// SVG text isn't measured server-side; estimate width from character count.
// font-size 10 monospace-ish ≈ 6px/char, plus the head + gap before the label.
const CHAR_WIDTH_PX = 6;
const LABEL_GAP_PX = LOLLIPOP_RADIUS_PX + 2;
const HEAD_DODGE_PX = 2 * LOLLIPOP_RADIUS_PX + 1;

function labelWidth(v: Variant): number {
  return LABEL_GAP_PX + v.label.length * CHAR_WIDTH_PX;
}

/**
 * Assign each variant a head-x and a stacking level.
 *
 * Heads (A): swept left-to-right; near-adjacent distinct residues are dodged
 * right so their circles don't merge, same-residue variants share the anchor.
 *
 * Levels (B): labels always extend rightward, so a marker's label threatens
 * whatever sits to its right. We resolve this asymmetrically — the *left*
 * marker always yields (rises), the *right* marker stays low. Sweeping
 * right-to-left, each marker is lifted above every already-placed marker to its
 * right whose head-column its own rightward label would cross. This cascades
 * both ways: a lifted left marker can in turn push its own left neighbours up.
 */
function packVariants(variants: Variant[], xScale: (x: number) => number): PlacedVariant[] {
  const sorted = [...variants].sort((a, b) => a.pos - b.pos);

  const placed: PlacedVariant[] = [];

  // Pass 1 (L→R): assign head positions, dodging near-adjacent heads apart.
  let prevPos = Number.NaN;
  let prevHeadX = Number.NEGATIVE_INFINITY;

  for (const variant of sorted) {
    const x = xScale(variant.pos);

    // Same residue → share the anchor and stack straight up (hotspot column).
    // Distinct residue → dodge right only if its head would touch the last one.
    const headX = variant.pos === prevPos ? prevHeadX : Math.max(x, prevHeadX + HEAD_DODGE_PX);
    prevPos = variant.pos;
    prevHeadX = headX;

    placed.push({ variant, x, headX, level: 0 });
  }

  // Pass 2 (R→L): the left marker yields. Lift each marker above every marker
  // to its right whose head its rightward label would cross; same-residue
  // variants keep distinct levels so the hotspot column stays a column.
  for (let i = placed.length - 1; i >= 0; i--) {
    const p = placed[i]!;
    const labelEnd = p.headX + labelWidth(p.variant);

    let level = 0;
    for (let j = i + 1; j < placed.length; j++) {
      const q = placed[j]!;
      const samePos = q.variant.pos === p.variant.pos;
      // Conflict if q sits under p's rightward label, or shares its column.
      if (samePos || q.headX <= labelEnd) {
        level = Math.max(level, q.level + 1);
      }
    }

    p.level = level;
  }

  return placed;
}

export function parse(rows: string[]): LollipopDiagram {
  const diagram = { type: "lollipopDiagram", domains: [], variants: [] } as unknown as LollipopDiagram;

  if (rows.length === 0) {
    throw new Error("Empty DSL input");
  }

  for (const row of rows) {
    const [keyword, ...rest] = tokenize(row);

    switch (keyword) {
      case "lollipopDiagram": {
        diagram.type = "lollipopDiagram";
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
    throw new Error("lollipopDiagram requires a `length` (protein length in amino acids)");
  }

  return diagram;
}

export function layout(ast: LollipopDiagram): Layout {
  const nodes: LayoutNode[] = [];

  // Protein space: the axis runs over amino-acid positions 1 … length.
  const xDomain: [number, number] = [1, ast.length];

  const xScale = (x: number) =>
    MARGIN_X + (INNER_WIDTH * (x - xDomain[0])) / (xDomain[1] - xDomain[0]);

  const placedVariants = packVariants(ast.variants, xScale);

  const maxVariantsStack = Math.max(1, ...placedVariants.map((p) => p.level + 1));

  // Screen-space y-axis (grows downward). Variants stack up from the backbone,
  // so the backbone sits below a band tall enough for the deepest stack.
  const stackHeight = FIRST_VARIANT_GAP_PX + maxVariantsStack * Y_OFFSET_PX;
  const backboneY = MARGIN_Y + stackHeight;

  // Backbone: full protein 1 → length.
  nodes.push({
    type: "line",
    x1: xScale(xDomain[0]),
    x2: xScale(xDomain[1]),
    y1: backboneY,
    y2: backboneY,
  });

  // Axis endpoints: first residue (1) at the left end, protein length at the
  // right. Anchored inward so neither number overflows the SVG horizontally.
  nodes.push({
    type: "text",
    x: xScale(xDomain[0]),
    y: backboneY + DOMAIN_LABEL_GAP_PX,
    text: String(xDomain[0]),
    anchor: "start",
    baseline: "hanging",
  });
  nodes.push({
    type: "text",
    x: xScale(xDomain[1]),
    y: backboneY + DOMAIN_LABEL_GAP_PX,
    text: String(xDomain[1]),
    anchor: "end",
    baseline: "hanging",
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
          fill: DOMAIN_FILL,
          stroke: DOMAIN_STROKE,
        },
        {
          type: "text",
          x: width / 2,
          y: DOMAIN_LABEL_GAP_PX,
          text: domain.label || "",
          anchor: "middle",
          baseline: "hanging",
        },
      ],
    });
  }

  // Variants: lollipops rising from the backbone. Labels are packed onto
  // non-overlapping levels (B); near-adjacent heads are dodged horizontally
  // while the stem stays anchored at the true residue (A).
  const levelY = (level: number) => backboneY - FIRST_VARIANT_GAP_PX - (level + 1) * Y_OFFSET_PX;

  // Same-residue variants share one stem: a single elbow rising to the topmost
  // head, with the lower heads stacked on its vertical riser. Group by column.
  const columns = new Map<number, typeof placedVariants>();
  for (const p of placedVariants) {
    const col = columns.get(p.x);
    if (col) col.push(p);
    else columns.set(p.x, [p]);
  }

  const domainTopY = backboneY - BLOCK_HEIGHT_PX / 2;
  const inDomain = (pos: number) => ast.domains.some((d) => pos >= d.start && pos <= d.end);

  for (const [x, column] of columns) {
    const headX = column[0]!.headX;
    const topLevel = Math.max(...column.map((p) => p.level));
    // Stem starts at the domain box's top edge where one covers this residue,
    // otherwise at the backbone line itself.
    const anchorY = inDomain(column[0]!.variant.pos) ? domainTopY : backboneY;

    // One stem: anchored at the true residue, jogging orthogonally to the
    // shared riser and up to the topmost head. Lower heads sit on the riser.
    nodes.push({
      type: "path",
      d: stemPath(x, anchorY, headX, levelY(topLevel)),
      stroke: STEM_COLOR,
    });

    for (const { variant, level } of column) {
      const headY = levelY(level);

      nodes.push({
        type: "group",
        x: 0,
        y: 0,
        children: [
          {
            type: "circle",
            x: headX,
            y: headY,
            color: VARIANT_COLORS[variant.class],
            radius: LOLLIPOP_RADIUS_PX,
            stroke: HEAD_RING,
          },
          {
            type: "text",
            x: headX + LABEL_GAP_PX,
            y: headY + LOLLIPOP_RADIUS_PX,
            text: variant.label,
          },
        ],
      });
    }
  }

  // Reach the bottom of the lowest content below the backbone: the axis
  // endpoints (and domain labels) share one baseline below the backbone —
  // a hanging baseline plus a full line-height of glyphs. Add a bottom margin.
  const belowBackbone = DOMAIN_LABEL_GAP_PX + FONT_SIZE_PX;

  return {
    width: WIDTH_PX,
    height: backboneY + belowBackbone + MARGIN_Y,
    nodes,
  };
}

export const lollipopDiagram: DiagramModule<LollipopDiagram> = {
  keyword: "lollipopDiagram",
  parse,
  layout,
};

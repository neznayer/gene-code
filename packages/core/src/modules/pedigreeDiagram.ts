import { tokenize } from "../dsl";
import { MARGIN_X, MARGIN_Y, WIDTH_PX } from "../render";
import type { DiagramModule, Layout, LayoutNode } from "../types";

export interface PedigreeDiagram {
  type: "pedigreeDiagram";
  couples: Couple[];
  nodes: PedigreeNode[];
}

interface Couple {
  id1: string;
  id2: string;
}

// Couple id is derived from partner ids, order-independent so that
// `childOf: "p1-p2"` and `childOf: "p2-p1"` resolve to the same couple.
function coupleId(id1: string, id2: string): string {
  return [id1, id2].sort().join("-");
}

interface PedigreeNode {
  id: string;
  sex: "male" | "female";
  phenotype: "affected" | "unaffected" | "unknown";
  genotype: "carrier" | "noncarrier" | "unknown";
  childOf?: string;
}

export function parse(rows: string[]): PedigreeDiagram {
  const diagram = {} as PedigreeDiagram;

  if (rows.length === 0) {
    throw new Error("Empty DSL input");
  }

  for (const row of rows) {
    const [keyword, ...rest] = tokenize(row);

    switch (keyword) {
      case "pedigreeDiagram": {
        diagram.type = "pedigreeDiagram";
        break;
      }
      case "couple": {
        const [id1, id2] = rest;
        if (!id1 || !id2) {
          throw new Error(`Invalid couple definition: ${row}`);
        }
        if (!diagram.couples) {
          diagram.couples = [{ id1, id2 }];
        } else {
          diagram.couples.push({ id1, id2 });
        }
        break;
      }
      case "node": {
        const [id, sex, phenotype, genotype, childOf] = rest;

        if (!id || !isSex(sex) || !isPhenotype(phenotype) || !isGenotype(genotype)) {
          throw new Error(`Invalid node definition: ${row}`);
        }

        if (!diagram.nodes) {
          diagram.nodes = [{ id, sex, phenotype, genotype, childOf }];
        } else {
          diagram.nodes.push({ id, sex, phenotype, genotype, childOf });
        }
        break;
      }
      default:
        throw new Error(`Unknown keyword: ${keyword}`);
    }
  }

  return diagram;
}

function isSex(value: string | undefined): value is "male" | "female" {
  return value === "male" || value === "female";
}

function isPhenotype(value: string | undefined): value is "affected" | "unaffected" | "unknown" {
  return value === "affected" || value === "unaffected" || value === "unknown";
}

function isGenotype(value: string | undefined): value is "carrier" | "noncarrier" | "unknown" {
  return value === "carrier" || value === "noncarrier" || value === "unknown";
}

const ROW_HEIGHT_PX = 60;
const NODE_GAP_PX = 40;
const SYMBOL_PX = 24;

export function layout(diagram: PedigreeDiagram): Layout {
  const nodes = [] as LayoutNode[];

  const byId = new Map(diagram.nodes.map((n) => [n.id, n]));
  
  const coupleById = new Map(diagram.couples.map((c) => [coupleId(c.id1, c.id2), c]));

  // 1. Raw generation: a node's generation is one below its deeper parent.
  //    Founders (no childOf) are generation 0.
  const genMemo = new Map<string, number>();
  const gen = (id: string): number => {
    const cached = genMemo.get(id);
    if (cached !== undefined) return cached;

    const node = byId.get(id);
    if (!node?.childOf) {
      genMemo.set(id, 0);
      return 0;
    }
    const parents = coupleById.get(node.childOf);
    if (!parents) {
      throw new Error(`Node ${id} references unknown couple: ${node.childOf}`);
    }
    const g = 1 + Math.max(gen(parents.id1), gen(parents.id2));
    genMemo.set(id, g);
    return g;
  };

  // 2. Reconcile spouses onto a shared row: a married-in founder (gen 0)
  //    gets pulled down to sit beside their partner.
  const row = new Map<string, number>();
  for (const n of diagram.nodes) row.set(n.id, gen(n.id));
  for (const c of diagram.couples) {
    const r = Math.max(row.get(c.id1) ?? 0, row.get(c.id2) ?? 0);
    row.set(c.id1, r);
    row.set(c.id2, r);
  }

  // 3. Downward index: couple id -> child node ids (invert childOf).
  const childrenOf = new Map<string, string[]>();
  for (const n of diagram.nodes) {
    if (!n.childOf) continue;
    (childrenOf.get(n.childOf) ?? childrenOf.set(n.childOf, []).get(n.childOf)!).push(n.id);
  }

  // partner id -> couple they are a parent in (for recursing child -> its own couple).
  const coupleByPartner = new Map<string, Couple>();
  for (const c of diagram.couples) {
    coupleByPartner.set(c.id1, c);
    coupleByPartner.set(c.id2, c);
  }

  // 4. Couple-centered DFS placement.
  //    Leaves consume x-cursor slots left->right; a couple/parent is then
  //    centered over the block of descendants it produced.
  const x = new Map<string, number>();
  let cursor = MARGIN_X;
  const slot = () => {
    const at = cursor;
    cursor += SYMBOL_PX + NODE_GAP_PX;
    return at;
  };

  const placed = new Set<string>();

  const placeNode = (id: string): number => {
    if (x.has(id)) return x.get(id)!;
    placed.add(id);

    const couple = coupleByPartner.get(id);
    // If this node is a parent, place it as part of its couple block.
    if (couple) return placeCouple(couple);

    const at = slot();
    x.set(id, at);
    return at;
  };

  const placeCouple = (c: Couple): number => {
    const key = coupleId(c.id1, c.id2);
    if (x.has(key)) return x.get(key)!;

    // Reserve the key up-front so a child recursing back here short-circuits.
    x.set(key, MARGIN_X);

    const kids = childrenOf.get(key) ?? [];
    const kidXs = kids.map(placeNode);

    // Center the couple over its children; place partners straddling that
    // midpoint. Childless couples fall back to fresh cursor slots.
    const half = (SYMBOL_PX + NODE_GAP_PX) / 2;
    let mid: number;
    if (kidXs.length > 0) {
      mid = (Math.min(...kidXs) + Math.max(...kidXs)) / 2;
      x.set(c.id1, mid - half);
      x.set(c.id2, mid + half);
    } else {
      const p1x = slot();
      const p2x = slot();
      x.set(c.id1, p1x);
      x.set(c.id2, p2x);
      mid = (p1x + p2x) / 2;
    }
    x.set(key, mid);
    return mid;
  };

  // Seed from top-generation couples, then any stragglers.
  for (const c of diagram.couples) {
    if ((row.get(c.id1) ?? 0) === Math.min(row.get(c.id1) ?? 0, row.get(c.id2) ?? 0)) {
      placeCouple(c);
    }
  }
  for (const n of diagram.nodes) if (!placed.has(n.id)) placeNode(n.id);

  const pos = new Map<string, { x: number; y: number }>();
  
  for (const n of diagram.nodes) {
    pos.set(n.id, {
      x: x.get(n.id) ?? MARGIN_X,
      y: MARGIN_Y + (row.get(n.id) ?? 0) * ROW_HEIGHT_PX,
    });
  }

  // 5. Emit symbols: square = male, circle = female; filled = affected.
  for (const n of diagram.nodes) {
    const p = pos.get(n.id)!;
    nodes.push(symbol(n, p.x, p.y));
  }

  // 6. Marriage lines + orthogonal sibship connectors.
  //    marriage line ─┬─  then a vertical drop to a horizontal sibship bar,
  //    and a short drop from the bar to each child's top-center.
  const SIB_BAR_DROP_PX = ROW_HEIGHT_PX / 2;
  for (const c of diagram.couples) {
    const a = pos.get(c.id1)!;
    const b = pos.get(c.id2)!;
    const [left, right] = a.x <= b.x ? [a, b] : [b, a];
    const marriageY = left.y + SYMBOL_PX / 2;
    nodes.push({
      type: "line",
      x1: left.x + SYMBOL_PX,
      y1: marriageY,
      x2: right.x,
      y2: marriageY,
    });

    const kids = childrenOf.get(coupleId(c.id1, c.id2)) ?? [];
    if (kids.length === 0) continue;

    // Drop from the visual center of the marriage line, not the stored
    // child-derived midpoint (which need not sit between the two partners).
    const midX = (left.x + SYMBOL_PX + right.x) / 2;
    const barY = marriageY + SIB_BAR_DROP_PX;
    const kidCenters = kids.map((kid) => pos.get(kid)!.x + SYMBOL_PX / 2);

    // vertical drop from the marriage line down to the sibship bar
    nodes.push({ type: "line", x1: midX, y1: marriageY, x2: midX, y2: barY });

    // horizontal sibship bar spanning all children
    nodes.push({
      type: "line",
      x1: Math.min(midX, ...kidCenters),
      y1: barY,
      x2: Math.max(midX, ...kidCenters),
      y2: barY,
    });

    // short drop from the bar to each child's top
    for (const kid of kids) {
      const k = pos.get(kid)!;
      nodes.push({ type: "line", x1: k.x + SYMBOL_PX / 2, y1: barY, x2: k.x + SYMBOL_PX / 2, y2: k.y });
    }
  }

  const maxRow = Math.max(0, ...row.values());
  return {
    width: WIDTH_PX,
    height: MARGIN_Y * 2 + maxRow * ROW_HEIGHT_PX + SYMBOL_PX,
    nodes,
  };
}

// A symbol occupies the box [x, x+SYMBOL_PX] x [y, y+SYMBOL_PX]. Both the
// square and the circle are centered in that box so partners on a row share a
// centerline and connector lines meet their edges cleanly.
//
// Fill conventions:
//   affected phenotype -> fully shaded symbol
//   carrier genotype   -> left half shaded (heterozygote). Shown independently
//                         of phenotype, so an affected carrier reads as fully
//                         shaded (the carrier half is subsumed by the full fill).
//   noncarrier/unknown -> no extra shading
function symbol(n: PedigreeNode, x: number, y: number): LayoutNode {
  const affected = n.phenotype === "affected";
  const carrier = n.genotype === "carrier";
  const base = affected ? "black" : "white";
  const r = SYMBOL_PX / 2;

  const children: LayoutNode[] =
    n.sex === "male"
      ? [{ type: "rect", x: 0, y: 0, width: SYMBOL_PX, height: SYMBOL_PX, fill: base }]
      : [{ type: "circle", x: r, y: r, radius: r, color: base, stroke: "black" }];

  // A fully-shaded (affected) symbol already covers the carrier half, so only
  // draw the half-fill on unaffected symbols.
  if (carrier && !affected) {
    children.push(
      n.sex === "male"
        ? { type: "rect", x: 0, y: 0, width: r, height: SYMBOL_PX, fill: "black" }
        : // Left half-disc: semicircle from the top point, down the left side,
          // to the bottom point (sweep flag 0 bows the arc left), then closed.
          { type: "path", d: `M ${r} 0 A ${r} ${r} 0 0 0 ${r} ${SYMBOL_PX} Z`, fill: "black", stroke: "black" },
    );
  }

  return { type: "group", x, y, children };
}

export const pedigreeDiagram: DiagramModule<PedigreeDiagram> = {
  keyword: "pedigreeDiagram",
  parse,
  layout,
};

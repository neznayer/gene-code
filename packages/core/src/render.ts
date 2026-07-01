import type { Layout, LayoutNode, SVGString } from "./types";

export const WIDTH_PX = 800;

export const MARGIN_X = 10;
export const MARGIN_Y = 14;

export const INNER_WIDTH = WIDTH_PX - MARGIN_X * 2;

export function renderNode(node: LayoutNode): string {
  switch (node.type) {
    case "line":
      return `<line x1="${node.x1}" x2="${node.x2}" y1="${node.y1}" y2="${node.y2}" stroke="black" />`;
    case "rect":
      return `<rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" fill="${node.fill ?? "lightgray"}" stroke="black" />`;
    // return `<g transform="translate(${node.x},${node.y})">
    //           <rect x="0" y="0" width="${node.width}" height="${node.height}" fill="lightgray" stroke="black" />
    //           <text x="0" alignment-baseline="hanging" text-anchor="middle" y="10" font-size="10">${node.label.start}</text>
    //           <text x="${node.width}" alignment-baseline="hanging" text-anchor="middle" y="10" font-size="10">${node.label.end}</text>
    //         </g>`;
    case "text":
      return `<text x="${node.x}" y="${node.y}" text-anchor="${node.anchor}" alignment-baseline="${node.baseline}" font-size="10">${node.text}</text>`;

    case "circle":
      return `<circle cx="${node.x}" cy="${node.y}" r="${node.radius}" fill="${node.color}" stroke="${node.stroke ?? "none"}" />`;
    case "group":
      return `<g transform="translate(${node.x},${node.y})">
        ${node.children.map(renderNode).join("")}
      </g>`;

    default:
      return "";
  }
}

export function render(layout: Layout): SVGString {
  const svg = `<svg width="${layout.width}" height="${layout.height}" xmlns="http://www.w3.org/2000/svg">
    ${layout.nodes.map(renderNode).join("")}
    </svg>`;

  return svg;
}

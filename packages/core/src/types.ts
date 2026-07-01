import type { GeneDiagram } from "./modules/geneDiagram";

export type Diagram = GeneDiagram;

export type SVGString = string;

export type Layout = {
  width: number;
  height: number;
  nodes: LayoutNode[];
};

export type LayoutNode = Line | Rect | Text | Circle | Path | Group;

type Path = {
  type: "path";
  d: string; // SVG path data
  fill?: string;
  stroke?: string;
};

type Circle = {
  type: "circle";
  x: number;
  y: number;
  radius: number;
  color: string;
  stroke?: string;
};

type Text = {
  type: "text";
  x: number;
  y: number;
  text: string;
  baseline?: "hanging" | "base";
  anchor?: "start" | "middle" | "end";
};

type Rect = {
  type: "rect";

  x: number;
  y: number;
  width: number;
  height: number;
  fill?: string;
};

type Line = {
  type: "line";
  x1: number;
  x2: number;
  y1: number;
  y2: number;
};

type Group = {
  type: "group";
  x: number; // transform
  y: number;
  children: LayoutNode[];
};

export interface DiagramModule<AST> {
  keyword: string; // "geneDiagram"
  parse(rows: string[]): AST;
  layout(ast: AST): Layout; // emits shared LayoutNode[]
}

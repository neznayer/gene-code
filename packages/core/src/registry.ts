import type { GeneDiagram } from "./modules/geneDiagram";
import { geneDiagram } from "./modules/geneDiagram";
import type { DiagramModule } from "./types";

export type DiagramType = GeneDiagram["type"];

export const registry: Record<DiagramType, DiagramModule<unknown>> = {
  geneDiagram,
};

import type { GeneDiagram } from "./modules/geneDiagram";
import { geneDiagram } from "./modules/geneDiagram";
import type { PedigreeDiagram } from "./modules/pedigree";
import { pedigreeDiagram } from "./modules/pedigree";
import type { DiagramModule } from "./types";

export type DiagramType = GeneDiagram["type"] | PedigreeDiagram["type"];

export const registry: Record<DiagramType, DiagramModule<unknown>> = {
  geneDiagram,
  pedigreeDiagram,
};

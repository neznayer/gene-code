import type { LollipopDiagram } from "./modules/lollipopDiagram";
import { lollipopDiagram } from "./modules/lollipopDiagram";
import type { PedigreeDiagram } from "./modules/pedigreeDiagram";
import { pedigreeDiagram } from "./modules/pedigreeDiagram";
import type { DiagramModule } from "./types";

export type DiagramType = LollipopDiagram["type"] | PedigreeDiagram["type"];

export const registry: Record<DiagramType, DiagramModule<unknown>> = {
  lollipopDiagram,
  pedigreeDiagram,
};

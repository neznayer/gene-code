import { render } from "@gene-code/core";

const EXAMPLES: Record<string, string> = {
  "Gene — KRAS": `lollipopDiagram
    gene KRAS
    length 189
    domain 5 166 GTPase
    domain 167 185 HVR
    variant G12D 12 missense
    variant G12V 12 missense
    variant G12C 12 missense
    variant G12A 12 missense
    variant G12S 12 missense
    variant G12R 12 missense
    variant G13D 13 missense
    variant G13C 13 missense
    variant V14I 14 missense
    variant L19F 19 missense
    variant Q22K 22 missense
    variant T35fs 35 frameshift
    variant I36M 36 missense
    variant E37* 37 nonsense
    variant A59T 59 missense
    variant Q61H 61 missense
    variant Q61L 61 missense
    variant Q61R 61 missense
    variant Q61K 61 missense
    variant E62* 62 nonsense
    variant K117N 117 missense
    variant A146T 146 missense
    variant A146V 146 missense
    variant A146P 146 missense`,

  // Every implemented feature in one chart:
  //   sex:       male (square), female (circle)
  //   phenotype: affected (filled), unaffected (open), unknown (open)
  //   genotype:  carrier (center dot), noncarrier (no dot), unknown (no dot)
  //   couples, multi-generation nesting, a married-in founder pulled onto a
  //   lower row, a childless couple, and a sibship with several children.
  "Pedigree — all features": `pedigreeDiagram
    node gf male unaffected noncarrier
    node gm female unaffected carrier
    couple gf gm
    node uncle male unknown unknown gf-gm
    node dad male unaffected carrier gf-gm
    node mom female unaffected carrier
    couple dad mom
    node childless_a male unaffected noncarrier gf-gm
    node childless_b female unaffected unknown
    couple childless_a childless_b
    node son male affected carrier dad-mom
    node daughter female unaffected carrier dad-mom
    node baby male unaffected noncarrier dad-mom`,
};

document.addEventListener("DOMContentLoaded", main);

function main() {
  const textArea = document.querySelector("textarea")!;
  const rendered = document.getElementById("rendered")!;
  const presets = document.getElementById("presets")!;

  if (!rendered) return;

  const draw = () => {
    // render() returns null for incomplete/invalid DSL (e.g. mid-typing);
    // keep the last good SVG on screen in that case.
    const svg = render(textArea.value);
    if (svg !== null) rendered.innerHTML = svg;
  };

  for (const [name, dsl] of Object.entries(EXAMPLES)) {
    const button = document.createElement("button");
    button.textContent = name;
    button.addEventListener("click", () => {
      textArea.value = dsl;
      draw();
    });
    presets.append(button);
  }

  textArea.value = Object.values(EXAMPLES)[0]!;
  textArea.addEventListener("input", draw);
  draw();
}

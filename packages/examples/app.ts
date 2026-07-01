import { render } from "@gene-code/core";

const EXAMPLES: Record<string, string> = {
  "Gene — KRAS": `geneDiagram
    gene KRAS
    length 189
    exon 5 166 GTPase
    variant G12D 12 missense
    variant G12V 12 missense
    variant G13D 13 missense
    variant Q61H 61 missense`,

  "Pedigree — autosomal recessive": `pedigreeDiagram
    node gf male unaffected unknown
    node gm female unaffected carrier
    couple gf gm
    node dad male unaffected carrier gf-gm
    node aunt female unaffected unknown gf-gm
    node mom female unaffected carrier
    couple dad mom
    node kid1 male affected homozygous dad-mom
    node kid2 female unaffected carrier dad-mom
    node kid3 male unaffected unknown dad-mom`,
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

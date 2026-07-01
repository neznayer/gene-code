import { render } from "@gene-code/core";

document.addEventListener("DOMContentLoaded", main);

function main() {
  const textArea = document.querySelector("textarea")!;
  const rendered = document.getElementById("rendered")!;

  textArea.value = `geneDiagram
    gene KRAS
    length 189
    exon 5 166 GTPase
    variant G12D 12 missense
    variant G12V 12 missense
    variant G13D 13 missense
    variant Q61H 61 missense`;

  if (!rendered) return;

  textArea.addEventListener("input", () => {
    rendered.innerHTML = render(textArea.value);
  });
  rendered.innerHTML = render(textArea.value);
}

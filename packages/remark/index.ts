import { render } from "@gene-code/core";
import { visit } from "unist-util-visit";

export default function remarkGeneCode() {
  return (tree) => {
    visit(tree, "code", (node, index, parent) => {
      if (node.lang !== "gene-code") return;

      const svg = render(node.value);

      if (!svg) return;

      parent.children[index] = { type: "html", value: svg };
    });
  };
}

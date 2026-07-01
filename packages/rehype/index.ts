import { render } from "@gene-code/core";
import type { Element, Root } from "hast";
import { fromHtml } from "hast-util-from-html";
import { visit } from "unist-util-visit";

/**
 * Concatenates the raw text of a code node's children. Unlike
 * hast-util-to-text, this preserves newlines and indentation — the DSL is
 * whitespace-significant (one statement per line), so CSS-style whitespace
 * collapsing would flatten it into a single unparseable row.
 */
function rawText(node: Element): string {
  return node.children
    .map((child) => (child.type === "text" ? child.value : ""))
    .join("");
}

export default function rehypeGeneCode() {
  return (tree: Root) => {
    visit(tree, "element", (node, index, parent) => {
      if (node.tagName !== "pre" || !parent || index == null) return;

      const code = node.children.find(
        (c): c is Element => c.type === "element" && c.tagName === "code",
      );
      if (!code) return;

      const className = code.properties?.className;
      const langs = Array.isArray(className) ? className : [];
      if (!langs.includes("language-gene-code")) return;

      const svg = render(rawText(code));
      if (!svg) return;

      const root = fromHtml(svg, { fragment: true, space: "svg" });
      parent.children[index] = {
        type: "element",
        tagName: "figure",
        properties: { className: ["gene-code"] },
        children: root.children as Element[],
      };
    });
  };
}

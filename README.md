# gene-code

A mermaid for life-science diagrams.

This is a rehype plugin that enables the mermaid-like diagram code visualizations.

Just use `gene-code` as lang parameter on a code block, followed by diagram description:

````
```gene-code
geneDiagram
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
````

Currently supports two types of diagrams:

- Lollipop variants diagram: `geneDiagram`
- Pedigree diagram: `pedigreeDiagram`

## Lollipop variants diagram: `geneDiagram`

The syntax:

```
geneDiagram <-- diagram type
    gene KRAS <-- label of the gene
    length 189 <-- length
    domain 5 166 GTPase <-- protein domain start, end and label
    domain 167 185 HVR
    variant G12D 12 missense <-- variant label, pos ans class
```

## Pedigree diagram: `pedigreeDiagram`

```
pedigreeDiagram
    node gf male unaffected noncarrier  <-- node/individual's ID, sex, phenotype, genotype
    node gm female unaffected carrier
    couple gf gm                        <-- parents node IDs
    node uncle male unknown unknown gf-gm
    node dad male unaffected carrier gf-gm
    node mom female unaffected carrier
    couple dad mom
    node childless_a male unaffected noncarrier gf-gm
    node childless_b female unaffected unknown
    couple childless_a childless_b
    node son male affected carrier dad-mom
    node daughter female unaffected carrier dad-mom
    node baby male unaffected noncarrier dad-mom
```

# Usage in markdown

Use as any other rehype plugins.
See the `example-react` package for basic example.

```tsx
// App.tsx

import rehypeGeneCode from "@gene-code/rehype";
import remarkGfm from "remark-gfm";
import Markdown from "react-markdown";

//... in a component
<Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeGeneCode]}>
  {text}
</Markdown>;
```

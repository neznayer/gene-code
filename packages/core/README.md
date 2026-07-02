# DSL

```
lollipopDiagram
  gene <NAME>
  length <N>              # total track length in coordinate units; optional (else inferred from max position)
  exon <start> <end> [label]
  variant <label> <pos> <class>
```

Variant classes → colors** (standard palette):

class | color | meaning |
|---|---|---|
| missense | green | amino-acid substitution |
| nonsense | red | premature stop |
| frameshift | purple | indel shifting reading frame |
| splice | orange | splice-site |
| synonymous | gray | silent


- Coordinate units - protein/aa


## Real worls examples

```
lollipopDiagram
  gene TP53
  length 393
  exon 94 312 DNA-binding
  variant R175H 175 missense
  variant R248Q 248 missense
  variant R273H 273 missense
  variant R213* 213 nonsense
```
## SVG layout

- width 800, height ~200, padding 40
- pos → padding + (pos/length) * (800 - 2*padding)
-

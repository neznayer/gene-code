import rehypeGeneCode from "@gene-code/rehype";
import remarkGfm from "remark-gfm";

import { useState } from "react";
import { createRoot } from "react-dom/client";
import Markdown from "react-markdown";

import "./styles.css";

const SAMPLES: Record<string, string> = {
  Variants: `# KRAS

Proto-oncogene, GTPase. A **hotspot** for oncogenic mutations, most notably
at codon 12.

| Variant | Codon | Consequence |
| ------- | ----- | ----------- |
| G12D    | 12    | missense    |
| G12C    | 12    | missense    |
| Q61H    | 61    | missense    |

Below is a \`gene-code\` diagram rendered inline from a fenced code block:

\`\`\`gene-code
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
    variant Q61H 61 missense
    variant Q61L 61 missense
\`\`\`

Regular code blocks are untouched:

\`\`\`ts
const answer = 42;
\`\`\`
`,

  Pedigree: `# Family history

A three-generation pedigree. Squares are male, circles female; filled
shapes are affected, a center dot marks a carrier.

\`\`\`gene-code
pedigreeDiagram
    node gf male unaffected noncarrier
    node gm female unaffected carrier
    couple gf gm
    node uncle male unknown unknown gf-gm
    node dad male unaffected carrier gf-gm
    node mom female unaffected carrier
    couple dad mom
    node son male affected carrier dad-mom
    node daughter female unaffected carrier dad-mom
    node baby male unaffected noncarrier dad-mom
\`\`\`
`,
};

const TABS = Object.keys(SAMPLES);

function App() {
  const [tab, setTab] = useState(TABS[0]!);
  const [text, setText] = useState(SAMPLES[TABS[0]!]!);

  const selectTab = (name: string) => {
    setTab(name);
    setText(SAMPLES[name]!);
  };

  return (
    <div className="app">
      <nav className="tabs">
        {TABS.map((name) => (
          <button
            key={name}
            className={name === tab ? "active" : ""}
            onClick={() => selectTab(name)}
          >
            {name}
          </button>
        ))}
      </nav>
      <main>
        <textarea value={text} onChange={(e) => setText(e.target.value)} />
        <article>
          <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeGeneCode]}>
            {text}
          </Markdown>
        </article>
      </main>
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);

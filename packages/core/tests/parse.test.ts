import { describe, expect, it } from "bun:test";

import { parse, splitRows } from "..";

const testText = `geneDiagram
        gene KRAS
        length 189
        exon 5 166 GTPase
        variant G12D 12 missense
        variant G12V 12 missense
        variant G13D 13 missense
        variant Q61H 61 missense`;

describe("parsing", () => {
  it("should cirrectly split rows", () => {
    const split = splitRows(testText);

    expect(split).toEqual([
      "geneDiagram",
      "gene KRAS",
      "length 189",
      "exon 5 166 GTPase",
      "variant G12D 12 missense",
      "variant G12V 12 missense",
      "variant G13D 13 missense",
      "variant Q61H 61 missense",
    ]);
  });

  it("should parse diagramType", () => {
    const parsed = parse(testText);

    expect(parsed.type).toEqual("geneDiagram");
  });

  it("should parse length if present", () => {
    const parsed = parse(testText);
    expect(parsed.length).toEqual(189);
  });
  it("should parse all exons correctly", () => {
    const parsed = parse(testText);
    expect(parsed.exons).toEqual([
      {
        start: 5,
        end: 166,
        label: "GTPase",
      },
    ]);
  }),
    it("should parse all variants correctly", () => {
      const parsed = parse(testText);
      expect(parsed.variants).toEqual([
        {
          label: "G12D",
          pos: 12,
          class: "missense",
        },
        {
          label: "G12V",
          pos: 12,
          class: "missense",
        },
        {
          label: "G13D",
          pos: 13,
          class: "missense",
        },
        {
          label: "Q61H",
          pos: 61,
          class: "missense",
        },
      ]);
    });
});

import { describe, expect, it } from "vitest";
import { renderHtml } from "@tanstack/markdown/html";
import { encodeAttribute } from "@/lib/markdown/attributes";
import {
  highlightCode,
  parseArticle,
  renderOptions,
} from "@/lib/markdown/config";

type Node = {
  type: string;
  tagName?: string;
  properties?: Record<string, string>;
  id?: string;
};
const blocks = (s: string) => parseArticle(s).children as unknown as Node[];

describe("article markdown config", () => {
  it("separate quotes stay separate", () => {
    expect(blocks("> a\n\n> b").filter((n) => n.type === "blockquote")).toHaveLength(2);
    expect(blocks("> a\n> b")).toHaveLength(1);
    expect(blocks("> a\n> b")[0].type).toBe("blockquote");
    const c = blocks("> [!TIP]\n> x")[0];
    expect(c.type).toBe("component");
    expect(c.tagName).toBe("md-callout");
    expect(c.properties?.type).toBe("tip");
  });

  it("callout kinds map", () => {
    const map = { NOTE: "note", IMPORTANT: "note", TIP: "tip", WARNING: "warn", CAUTION: "warn" };
    for (const [k, v] of Object.entries(map)) {
      expect(blocks(`> [!${k}]\n> x`)[0].properties?.type).toBe(v);
    }
  });

  it("comment components map to tags with decoded props", () => {
    expect(blocks('<!-- ::apple-music url="u" -->')[0]).toMatchObject({
      type: "component",
      tagName: "md-apple-music",
      properties: { url: "u" },
    });
    const text = 'a "q" & b\nc --> d';
    const env = blocks(`<!-- ::envelope text="${encodeAttribute(text)}" -->`)[0];
    expect(env.tagName).toBe("md-envelope");
    expect(env.properties?.text).toBe(text);
    expect(blocks('<!-- ::spotify id="x" -->')[0].tagName).toBe("md-unknown");
  });

  it("mermaid fence becomes md-mermaid with height", () => {
    expect(blocks("```mermaid height=520\ngraph TD\n```")[0]).toMatchObject({
      tagName: "md-mermaid",
      properties: { chart: "graph TD", height: "520" },
    });
  });

  it("heading ids use getSlug", () => {
    expect(blocks("### Masalah bagi para *over thinker* akut")[0].id).toBe(
      "masalah-bagi-para-over-thinker-akut",
    );
  });

  it("raw HTML is not rendered", () => {
    expect(renderHtml("<b>x</b>", renderOptions)).toContain("&lt;b&gt;");
  });

  it("aliases highlight", () => {
    expect(highlightCode("const a", "javascript")).toContain("th-token");
    expect(highlightCode("echo", "bash")).toContain("th-token");
  });
});

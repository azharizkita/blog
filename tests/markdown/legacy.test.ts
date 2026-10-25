import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { convertLegacyMarkdown, encodeAttribute } from "@/lib/markdown/legacy";

const convert = (s: string) => convertLegacyMarkdown(s).content;

const dir = path.resolve(__dirname, "../fixtures/posts");
const fixtures = readdirSync(dir)
  .filter((f) => f.endsWith(".md"))
  .map((f) => ({
    slug: f.replace(/\.md$/, ""),
    source: readFileSync(path.join(dir, f), "utf8"),
  }));

describe("convertLegacyMarkdown", () => {
  it("<br /> line ends become backslash breaks", () => {
    expect(convert("a,<br />\nb")).toBe("a,\\\nb");
    expect(convert("a,<br>\nb")).toBe("a,\\\nb");
    expect(convert("a,<br/>\nb")).toBe("a,\\\nb");
  });

  it("two-space hard breaks become backslash", () => {
    expect(convert("one  \ntwo")).toBe("one\\\ntwo");
    expect(convert("one  \n\ntwo")).toBe("one  \n\ntwo");
  });

  it("lazy blockquote continuation gets > prefixes", () => {
    expect(convert("> *a  \nb  \nc*\n\nnext")).toBe(
      "> *a\\\n> b\\\n> c*\n\nnext",
    );
  });

  it("AppleMusic JSX becomes a comment component", () => {
    const url = "https://embed.music.apple.com/id/album/x/1?i=2";
    expect(convert(`<AppleMusic url="${url}" />`)).toBe(
      `<!-- ::apple-music url="${url}" -->`,
    );
    expect(convert(`<AppleMusic url="${url}" title="T" />`)).toBe(
      `<!-- ::apple-music url="${url}" title="T" -->`,
    );
  });

  it("YouTube and Envelope JSX convert", () => {
    expect(convert('<YouTube id="abc" title="T" />')).toBe(
      '<!-- ::youtube id="abc" title="T" -->',
    );
    expect(convert('<Envelope text="say &quot;hi&quot; &amp; bye" />')).toBe(
      '<!-- ::envelope text="say &quot;hi&quot; &amp; bye" -->',
    );
  });

  it("Callout JSX becomes a GitHub alert", () => {
    expect(convert('<Callout type="warn">\nBe careful.\n</Callout>')).toBe(
      "> [!WARNING]\n> Be careful.",
    );
    expect(convert('<Callout type="note">\nx\n</Callout>')).toBe(
      "> [!NOTE]\n> x",
    );
    expect(convert('<Callout type="tip">\nx\n</Callout>')).toBe("> [!TIP]\n> x");
  });

  it("leaves fenced code alone", () => {
    const src =
      '```html\na<br />\n<AppleMusic url="u" />\ntrail  \nx\n```\n\nuse `a<br />` here';
    expect(convertLegacyMarkdown(src)).toEqual({
      content: src,
      changed: false,
      unconvertible: [],
    });
    const tilde = '~~~~\n<YouTube id="a" />\n~~~~';
    expect(convert(tilde)).toBe(tilde);
  });

  it("reports unknown JSX and raw HTML", () => {
    for (const line of ['<Spotify id="x" />', "<div>hi</div>"]) {
      const r = convertLegacyMarkdown(line);
      expect(r.unconvertible).toContain(line);
      expect(r.content).toBe(line);
    }
  });

  it("is idempotent", () => {
    for (const { source } of fixtures) {
      const once = convert(source);
      expect(convert(once)).toBe(once);
    }
  });

  it("changes exactly the four expected fixtures", () => {
    const changed = fixtures
      .filter(({ source }) => convertLegacyMarkdown(source).changed)
      .map((f) => f.slug)
      .sort();
    expect(changed).toEqual(
      [
        "the-astral-omen",
        "the-weight-of-silence",
        "21-guns",
        "hiduplah-dengan-tenang",
      ].sort(),
    );
    for (const { source } of fixtures) {
      expect(convertLegacyMarkdown(source).unconvertible).toEqual([]);
    }
  });
});

describe("fix round 1", () => {
  it("rewrites simple inline strong/em HTML", () => {
    const r = convertLegacyMarkdown("a <strong>b</strong> <i>c</i> `<b>x</b>`");
    expect(r.content).toBe("a **b** *c* `<b>x</b>`");
    expect(r.unconvertible).toEqual([]);
  });

  it("reports other inline HTML and unconverted br", () => {
    for (const line of ["a <span>b</span> c", "a<br />b", "see <Foo /> now"]) {
      expect(convertLegacyMarkdown(line).unconvertible).toContain(line);
    }
    expect(convertLegacyMarkdown("<https://x.y> ok").unconvertible).toEqual([]);
  });

  it("reports embeds with unknown attributes", () => {
    const line = '<YouTube id="a" start="3" />';
    const r = convertLegacyMarkdown(line);
    expect(r.unconvertible).toEqual([line]);
    expect(r.content).toBe(line);
  });

  it("does not turn breaks into backslashes before new blocks", () => {
    expect(convert("one  \n# H")).toBe("one\n# H");
    expect(convert("# H  \ntext")).toBe("# H\ntext");
    expect(convert("one  \n- item")).toBe("one\n- item");
    expect(convertLegacyMarkdown("one<br />\n# H").unconvertible).toEqual([
      "one<br />",
    ]);
  });

  it("does not prefix new blocks as lazy quote continuation", () => {
    expect(convert("> a  \n# H")).toBe("> a\n# H");
    expect(convert("> a  \n> b")).toBe("> a\\\n> b");
  });
});

describe("encodeAttribute", () => {
  it("encodes & \" < > and newline", () => {
    expect(encodeAttribute('&"<>\n')).toBe("&amp;&quot;&lt;&gt;&#10;");
  });
});

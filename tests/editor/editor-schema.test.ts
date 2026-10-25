import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getSchema } from "@tiptap/core";
import { describe, expect, it } from "vitest";
import { createExtensions } from "@/components/editor/wysiwyg/extensions";
import { markdownToDoc } from "@/components/editor/wysiwyg/bridge/to-doc";
import { MARK_ORDER, MARKS, NODES } from "@/components/editor/wysiwyg/bridge/schema-names";
import { checkSave } from "@/components/editor/wysiwyg/save-guard";
import { convertLegacyMarkdown } from "@/lib/markdown/legacy";

// The editor's real schema (extensions.ts) against the bridge contract
// (schema-names.ts): drift here makes the save guard refuse good saves.

const schema = getSchema(createExtensions());

describe("editor schema", () => {
  it("has every contract node and mark", () => {
    for (const name of Object.values(NODES)) expect(schema.nodes[name], name).toBeDefined();
    for (const name of Object.values(MARKS)) expect(schema.marks[name], name).toBeDefined();
  });

  it("ranks marks in MARK_ORDER", () => {
    const rank = Object.keys(schema.marks).filter((m) => (MARK_ORDER as string[]).includes(m));
    expect(rank).toEqual(MARK_ORDER);
  });

  it("holds the contract attrs with null/empty defaults", () => {
    const defaults = (name: string) =>
      Object.fromEntries(
        Object.entries(schema.nodes[name].spec.attrs ?? {}).map(([k, v]) => [k, v.default]),
      );
    expect(defaults(NODES.mermaidBlock)).toEqual({ code: "", height: null });
    expect(defaults(NODES.envelopeBlock)).toEqual({ text: "" });
    expect(defaults(NODES.appleMusicBlock)).toEqual({ url: "", title: null });
    expect(defaults(NODES.youtubeBlock)).toEqual({ id: "", title: null });
    expect(defaults(NODES.rawBlock)).toEqual({ source: "" });
    expect(Object.keys(defaults(NODES.calloutBlock))).toEqual(["kind"]);
    expect(schema.nodes[NODES.calloutBlock].spec.content).toBe("block+");
    expect(defaults(NODES.codeBlock).language).toBeNull();
  });

  it("loads and saves every post unchanged through the save guard", () => {
    const dir = join(__dirname, "..", "fixtures", "posts");
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".md"))) {
      const source = readFileSync(join(dir, file), "utf8");
      for (const markdown of [source, convertLegacyMarkdown(source).content]) {
        const loaded = markdownToDoc(markdown);
        const doc = schema.nodeFromJSON(loaded.doc);
        doc.check();
        const json = doc.toJSON();
        const result = checkSave({
          loaded: loaded.blocks,
          loadedDoc: json.content,
          doc: json,
          definitions: loaded.definitions,
        });
        expect(result.ok, file).toBe(true);
      }
    }
  });
});

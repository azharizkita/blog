import { Extension } from "@tiptap/react";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { codeTokens } from "@/lib/markdown/highlight";
import { NODES } from "./bridge/schema-names";

/** A token's range inside its code block's text, and its class. */
type Span = { from: number; to: number; className: string };

// ProseMirror shares unchanged nodes between states, so a code block nobody
// touched is the same object in the next state and its tokens are reused.
const cache = new WeakMap<PMNode, Span[]>();

function spans(node: PMNode): Span[] {
  const cached = cache.get(node);
  if (cached) return cached;
  const text = node.textContent;
  const tokens = codeTokens(text, node.attrs.language ?? undefined);
  const out: Span[] = [];
  // Only decorate when the tokens cover the text exactly; otherwise the
  // offsets would drift and colour the wrong characters.
  if (tokens.map((t) => t.value).join("") === text) {
    let at = 0;
    for (const token of tokens) {
      const end = at + token.value.length;
      if (token.className && end > at) {
        out.push({ from: at, to: end, className: `th-token th-${token.className}` });
      }
      at = end;
    }
  }
  cache.set(node, out);
  return out;
}

function decorate(doc: PMNode): DecorationSet {
  const decorations: Decoration[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name !== NODES.codeBlock) return true;
    const start = pos + 1;
    for (const span of spans(node)) {
      decorations.push(
        Decoration.inline(start + span.from, start + span.to, { class: span.className }),
      );
    }
    return false;
  });
  return DecorationSet.create(doc, decorations);
}

const key = new PluginKey<DecorationSet>("codeHighlight");

/**
 * Colours code blocks with the article's highlighter (lib/markdown/highlight.ts):
 * the same `th-token th-<class>` classes, coloured by app/code-theme.css for
 * both themes. Decorations live in plugin state and are computed
 * synchronously in `init`/`apply`; the plugin never dispatches (an async
 * dispatch from a plugin view is what broke the old Shiki highlighter, see
 * index.tsx).
 */
export const CodeHighlight = Extension.create({
  name: "codeHighlight",
  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key,
        state: {
          init: (_config, state) => decorate(state.doc),
          apply: (tr, set) => (tr.docChanged ? decorate(tr.doc) : set),
        },
        props: {
          decorations: (state) => key.getState(state),
        },
      }),
    ];
  },
});

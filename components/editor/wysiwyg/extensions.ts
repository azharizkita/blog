import StarterKit from "@tiptap/starter-kit";
import Document from "@tiptap/extension-document";
import Link from "@tiptap/extension-link";
import { Table, TableRow, TableHeader, TableCell } from "@tiptap/extension-table";
import { Placeholder } from "@tiptap/extensions";
import { Extension, type Extensions } from "@tiptap/react";
import { Fragment, Slice, type Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { HEADING_LEVELS, NODES } from "./bridge/schema-names";
import { markdownToDoc } from "./bridge/to-doc";
import { ImageUpload, imageFilesFrom } from "./image-upload";
import { EditorImage } from "./image-view";
import { AppleMusicBlock, IFRAME_PASTE, URL_PASTE } from "./apple-music-block";
import { CalloutBlock } from "./callout-block";
import { CodeHighlight } from "./code-highlight";
import { EnvelopeBlock } from "./envelope-block";
import { MermaidBlock } from "./mermaid-block";
import { RawBlock } from "./raw-block";
import { YoutubeBlock } from "./youtube-block";

// The schema registered here must match bridge/schema-names.ts exactly
// (node/mark names, attrs and their defaults): the bridge reads and writes
// that contract, and the save guard (save-guard.ts) compares the editor's
// JSON against it, so any drift reads as a lossy save.

/**
 * Ghost-style document shape: the first node is always a heading — the
 * article's title. The site's convention makes the document's leading "## "
 * the page h1, and the editor derives the gist's metadata title from it
 * (lib/extract-title.ts), so the title can't be deleted away or preceded by
 * other content.
 */
const TitleDocument = Document.extend({
  content: "heading block+",
});

/**
 * The title heading must serialize as "## " (level 2): if the first node's
 * heading level drifts (toolbar H2/H3 applied to the title line, or pasted
 * content starting with ###), normalize it back to level 2. Only the first
 * node is governed; other headings keep any level in HEADING_LEVELS.
 */
const EnforceTitleLevel = Extension.create({
  name: "enforceTitleLevel",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction(_transactions, _oldState, state) {
          const first = state.doc.firstChild;
          if (first?.type.name === "heading" && first.attrs.level !== 2) {
            return state.tr.setNodeMarkup(0, undefined, {
              ...first.attrs,
              level: 2,
            });
          }
          return null;
        },
      }),
    ];
  },
});

/**
 * Enter/Shift-Enter inside a table cell would create shapes GFM tables
 * can't hold: an Enter that splits a cell's paragraph in two, or a hard
 * break inside a cell. The serializer refuses both (bridge/to-markdown.ts
 * throws UnserializableError, and the save guard stops the save), so the
 * editor keeps them from being made: Enter moves to the next cell (or adds
 * a row at the table's end) instead of splitting the paragraph, and the
 * hard-break keys (Shift-Enter, Mod-Enter) do nothing in a cell.
 */
const TableEnterGuard = Extension.create({
  name: "tableEnterGuard",
  addKeyboardShortcuts() {
    const inTableCell = () =>
      this.editor.isActive("tableCell") || this.editor.isActive("tableHeader");
    return {
      Enter: () => {
        if (!inTableCell()) return false;
        if (this.editor.commands.goToNextCell()) return true;
        // Last cell in the table: add a row and move into it, rather than
        // splitting the current cell's paragraph.
        return this.editor.chain().addRowAfter().goToNextCell().run();
      },
      "Shift-Enter": () => inTableCell(),
      "Mod-Enter": () => inTableCell(),
    };
  },
});

/**
 * A hard break inside a heading has no Markdown form (a heading is one
 * line; the serializer refuses it), so the hard-break keys do nothing there.
 */
const HeadingBreakGuard = Extension.create({
  name: "headingBreakGuard",
  addKeyboardShortcuts() {
    const inHeading = () => this.editor.isActive("heading");
    return {
      "Shift-Enter": () => inHeading(),
      "Mod-Enter": () => inHeading(),
    };
  },
});

/**
 * StarterKit's bundled Strike extension binds ⌘⇧S (Mod-Shift-s); the
 * toolbar's button labels the shortcut ⌘⇧X per spec. Add the labeled
 * binding instead of relabeling the button — ⌘⇧S keeps working too.
 */
const StrikeShortcut = Extension.create({
  name: "strikeShortcut",
  addKeyboardShortcuts() {
    return {
      "Mod-Shift-x": () => this.editor.commands.toggleStrike(),
    };
  },
});

/**
 * Pasted plain text is read as Markdown through the same bridge that loads
 * posts (markdownToDoc), so pasting a post fragment from Source mode, a
 * Markdown file or a VS Code Markdown buffer gives the blocks, marks and
 * embeds it reads as. Left to the defaults: pastes carrying HTML (rich text
 * from a page, or a copy inside the editor, whose HTML holds the exact
 * nodes), image files (ImageUpload), pastes into a code block (literal
 * text), and Apple Music snippets/links (AppleMusicBlock's paste rules).
 */
const MarkdownPaste = Extension.create({
  name: "markdownPaste",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("markdownPaste"),
        props: {
          handlePaste: (view, event) => {
            const data = event.clipboardData;
            if (!data || imageFilesFrom(data).length) return false;
            const text = data.getData("text/plain");
            if (!text.trim()) return false;
            let vscodeMode: string | undefined;
            try {
              vscodeMode = JSON.parse(data.getData("vscode-editor-data") || "{}").mode;
            } catch {
              vscodeMode = undefined;
            }
            if (data.getData("text/html") && vscodeMode !== "markdown") return false;
            if (view.state.selection.$from.parent.type.spec.code) return false;
            IFRAME_PASTE.lastIndex = 0;
            URL_PASTE.lastIndex = 0;
            if (IFRAME_PASTE.test(text) || URL_PASTE.test(text)) return false;

            let slice: Slice;
            try {
              const { doc, blocks } = markdownToDoc(text.replace(/\r\n?/g, "\n"));
              // The synthetic title markdownToDoc adds isn't part of the paste.
              const content = (doc.content ?? []).slice(blocks[0]?.synthetic ? 1 : 0);
              if (!content.length) return false;
              const fragment = Fragment.fromJSON(view.state.schema, content);
              // Open ends merge with the text around the cursor, as a paste
              // of rich text does; but a heading or code block at an end
              // stays a block of its own (the rest of the paragraph would
              // otherwise join the code, or a heading turn into its text).
              const open = Slice.maxOpen(fragment);
              const closed = (node: PMNode | null) =>
                !!node?.isTextblock && node.type.name !== NODES.paragraph;
              slice = new Slice(
                fragment,
                closed(fragment.firstChild) ? 0 : open.openStart,
                closed(fragment.lastChild) ? 0 : open.openEnd,
              );
            } catch {
              return false;
            }
            // uiEvent "paste" lets the paste rules run over the result too.
            view.dispatch(
              view.state.tr
                .replaceSelection(slice)
                .scrollIntoView()
                .setMeta("paste", true)
                .setMeta("uiEvent", "paste"),
            );
            return true;
          },
        },
      }),
    ];
  },
});

/** The full extension set for the WYSIWYG editor. */
export function createExtensions(): Extensions {
  return [
    StarterKit.configure({
      // Replaced by TitleDocument (heading-first document shape).
      document: false,
      heading: { levels: [...HEADING_LEVELS] },
      // Fenced code: the article's pre styling (pre.tm-code), coloured by
      // CodeHighlight below.
      codeBlock: { HTMLAttributes: { class: "tm-code" } },
      // Registered separately below (openOnClick off), after StarterKit so
      // the schema's mark order stays as schema-names.ts MARK_ORDER expects.
      link: false,
      // Not offered by the toolbar and not part of the Markdown contract.
      underline: false,
      // TrailingNode defaults to the doc's first allowed child — under
      // TitleDocument that's a heading, so every transaction on a post not
      // ending in one appended an empty level-1 heading (saved as "#").
      // An empty trailing paragraph writes nothing.
      trailingNode: { node: NODES.paragraph },
    }),
    CodeHighlight,
    Link.configure({ openOnClick: false }),
    TitleDocument,
    EnforceTitleLevel,
    Placeholder.configure({
      // Only the title line (the mandatory first heading) gets a hint; the
      // matching ::before rule lives in globals.css under .wysiwyg.
      placeholder: ({ node, pos }) =>
        pos === 0 && node.type.name === "heading" ? "Title" : "",
    }),
    // Inline, as Markdown defines images. EditorImage = stock Image (inline)
    // + an alt-editing node view.
    EditorImage,
    // Paste/drop uploads; errors reach the screen via the upload-error
    // registry, keyed by editor instance (see WysiwygEditor's sync effect).
    ImageUpload,
    Table,
    TableRow,
    TableHeader,
    TableCell,
    MermaidBlock,
    EnvelopeBlock,
    AppleMusicBlock,
    YoutubeBlock,
    CalloutBlock,
    RawBlock,
    TableEnterGuard,
    HeadingBreakGuard,
    StrikeShortcut,
    MarkdownPaste,
  ];
}

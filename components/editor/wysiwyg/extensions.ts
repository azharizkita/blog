import StarterKit from "@tiptap/starter-kit";
import Document from "@tiptap/extension-document";
import { Table, TableRow, TableHeader, TableCell } from "@tiptap/extension-table";
import { Placeholder } from "@tiptap/extensions";
import { Markdown } from "tiptap-markdown";
import CodeBlockShiki from "tiptap-extension-code-block-shiki";
import { Extension, type Extensions } from "@tiptap/react";
import { Plugin } from "@tiptap/pm/state";
import { ImageUpload } from "./image-upload";
import { EditorImage } from "./image-view";
import { AppleMusicBlock } from "./apple-music-block";
import { EnvelopeBlock } from "./envelope-block";
import { MermaidBlock } from "./mermaid-block";

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
 * content starting with ###), normalize it back to level 2.
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
 * Enter/Shift-Enter inside a table cell can silently corrupt the document.
 * tiptap-markdown's GFM table serializer (see index.tsx's
 * detectLossySerialization for the full trace through tiptap-markdown's
 * source) only round-trips a cell that holds exactly one paragraph — an
 * Enter that splits a cell's paragraph in two, or a header/body shape
 * mismatch, makes the *entire table* fall back to a literal "[table]"
 * placeholder on the next serialize; a Shift-Enter hard break inside a cell
 * similarly falls back to an inline "[hardBreak]" placeholder. Scoping
 * Enter to table navigation (next cell, or a new row at the table's end)
 * instead of the default paragraph split, and swallowing Shift-Enter
 * entirely, means the corrupting shape can never be created through the
 * editor UI in the first place. (index.tsx's detection is the belt, for
 * content that arrives already in this shape — e.g. via paste.)
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
 * The full extension set for the WYSIWYG editor. `theme` is used only as the
 * shiki fallback theme (`defaultTheme`) for the brief moment before a
 * language/theme finishes loading — tiptap-extension-code-block-shiki
 * natively supports dual light/dark themes via its `themes` option, toggled
 * purely by CSS (see the `.dark .wysiwyg .tiptap .shiki` rule appended to
 * globals.css), so code blocks never need re-highlighting or the editor
 * re-mounting when the site theme flips.
 */
export function createExtensions(theme: "light" | "dark"): Extensions {
  return [
    StarterKit.configure({
      // Replaced by TitleDocument (heading-first document shape).
      document: false,
      heading: { levels: [2, 3, 4] },
      // The shiki extension replaces the default code block.
      codeBlock: false,
      link: { openOnClick: false },
      // Not offered by the toolbar and — like `table`/`hardBreak` above —
      // not one of the node/mark types tiptap-markdown can serialize under
      // html:false (it shares the same "[underline]" HTMLMark fallback).
      // Disabling it removes that lossy path from the schema entirely,
      // rather than trying to detect it after the fact.
      underline: false,
    }),
    CodeBlockShiki.configure({
      defaultTheme: theme === "dark" ? "github-dark-dimmed" : "github-light",
      themes: {
        light: "github-light",
        dark: "github-dark-dimmed",
      },
    }),
    TitleDocument,
    EnforceTitleLevel,
    Placeholder.configure({
      // Only the title line (the mandatory first heading) gets a hint; the
      // matching ::before rule lives in globals.css under .wysiwyg.
      placeholder: ({ node, pos }) =>
        pos === 0 && node.type.name === "heading" ? "Title" : "",
    }),
    // MUST stay inline (as markdown defines images): tiptap-markdown's image
    // serializer never closes a block, so a block-level image node glues the
    // following paragraph onto the image line and trips the round-trip
    // guard. EditorImage = stock Image (inline) + an alt-editing node view.
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
    TableEnterGuard,
    StrikeShortcut,
    Markdown.configure({
      html: false,
      bulletListMarker: "-",
      linkify: false,
      breaks: false,
      transformPastedText: true,
    }),
  ];
}

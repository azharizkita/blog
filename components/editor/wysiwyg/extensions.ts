import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Table, TableRow, TableHeader, TableCell } from "@tiptap/extension-table";
import { Markdown } from "tiptap-markdown";
import CodeBlockShiki from "tiptap-extension-code-block-shiki";
import { Extension, type Extensions } from "@tiptap/react";
import { MermaidBlock } from "./mermaid-block";

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
    Image,
    Table,
    TableRow,
    TableHeader,
    TableCell,
    MermaidBlock,
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

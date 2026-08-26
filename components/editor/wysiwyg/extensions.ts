import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Table, TableRow, TableHeader, TableCell } from "@tiptap/extension-table";
import { Markdown } from "tiptap-markdown";
import CodeBlockShiki from "tiptap-extension-code-block-shiki";
import type { Extensions } from "@tiptap/react";
import { MermaidBlock } from "./mermaid-block";

/**
 * The full extension set for the WYSIWYG editor. `theme` is used only as the
 * shiki fallback theme (`defaultTheme`) for the brief moment before a
 * language/theme finishes loading — tiptap-extension-code-block-shiki
 * natively supports dual light/dark themes via its `themes` option, toggled
 * purely by CSS (see the `html.dark .tiptap .shiki` rule appended to
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
    Markdown.configure({
      html: false,
      bulletListMarker: "-",
      linkify: false,
      breaks: false,
      transformPastedText: true,
    }),
  ];
}

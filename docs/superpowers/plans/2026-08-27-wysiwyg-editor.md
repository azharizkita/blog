# WYSIWYG Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the editor's primary surface with a TipTap WYSIWYG document in the article's exact styling (Write mode), keeping CodeMirror (Source) and the exact server preview (Preview) as toggleable modes, with a formatting toolbar and ⌘-shortcuts.

**Architecture:** Markdown stays the single source of truth in `EditorScreen`; `WysiwygEditor` parses it on mode entry and emits serialized markdown (debounced) via `tiptap-markdown`. A round-trip guard falls back to Source mode with a banner when a document wouldn't survive parse→serialize. Custom nodes: shiki-highlighted code blocks (site themes) and a live mermaid node reusing `@/components/mermaid`.

**Tech Stack:** TipTap v3 (`@tiptap/react` 3.30.x), `tiptap-markdown` 0.9.x, `tiptap-extension-code-block-shiki` 1.2.x, `shiki` 4.x, existing Tailwind v4 `prose-*` `@utility` classes.

**Spec:** `docs/superpowers/specs/2026-08-27-wysiwyg-editor-design.md`

## Global Constraints

- No test runner; verification per task = `npm run lint` + `npx tsc --noEmit` (+ `npm run build` in the final task). Interactive behavior is verified in the final task and by the user.
- **NEVER edit `components/ui/`.** New components go in `components/editor/wysiwyg/`.
- **`app/globals.css` changes are additive only** — new `.wysiwyg`-scoped rules; existing `prose-*` utilities and all other rules must be byte-identical. Public pages must render unchanged.
- The code below is a **reference implementation**: TipTap v3 / tiptap-markdown APIs must be verified against the installed packages' README/dist types in `node_modules` before use; adapt where the real API differs and record every adaptation in your report.
- The existing `prose-*` classes are Tailwind v4 `@utility` definitions in `app/globals.css` (lines ~190-240) — they can be `@apply`'d.
- Heading convention: markdown `##`→visual h1 (`prose-h1`), `###`→`prose-h2`, `####`→`prose-h3`. WYSIWYG headings are levels 2/3/4 only.
- Mermaid fences may carry meta: ` ```mermaid height=320 ` — `height` must round-trip (the `Mermaid` component takes `{ chart: string; height?: string }`).
- `tiptap-markdown` must be configured with `html: false` and `bulletListMarker: "-"` — HTML-containing documents are caught by the round-trip guard, never silently rewritten.
- Hydration: any theme-dependent or editor rendering must not mismatch SSR (use TipTap's `immediatelyRender: false`; the repo lint config forbids `setState` directly in `useEffect` — use `useSyncExternalStore` for mounted-gates, see `components/editor/markdown-editor.tsx` for the established pattern).
- Commit after every task. Branch: `feat/editor`.

---

### Task 1: Dependencies, editor styles, markdown bridge (extensions + round-trip)

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `app/globals.css` (additive `.wysiwyg` block at end of file)
- Create: `components/editor/wysiwyg/mermaid-block.tsx`
- Create: `components/editor/wysiwyg/extensions.ts`
- Create: `components/editor/wysiwyg/round-trip.ts`

**Interfaces:**
- Consumes: `Mermaid` default export from `@/components/mermaid` (`{ chart: string; height?: string }`), `prose-*` utilities in globals.css.
- Produces (Task 2 relies on these exactly):
  - `createExtensions(theme: "light" | "dark"): Extensions` from `extensions.ts` — full TipTap extension array including the `Markdown` extension (so `editor.storage.markdown.getMarkdown()` works).
  - `MermaidBlock` TipTap node (name `"mermaidBlock"`, attrs `{ code: string; height: string | null }`).
  - `normalizeMarkdown(md: string): string` and `roundTrips(original: string, serialized: string): boolean` from `round-trip.ts`.

- [ ] **Step 1: Install dependencies**

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-table tiptap-markdown tiptap-extension-code-block-shiki shiki
```

Then check `node_modules/@tiptap/starter-kit` (README or dist types) for what v3's StarterKit bundles (it includes Link in v3 — confirm) and how `@tiptap/extension-table` v3 exports Table/TableRow/TableHeader/TableCell (single package, possibly a `TableKit`). Check `node_modules/tiptap-extension-code-block-shiki/README.md` for its options — specifically whether it supports dual/light-dark themes or a single `defaultTheme`. Check `node_modules/tiptap-markdown/README.md` for configure options and per-node `storage.markdown` serialize/parse contract.

- [ ] **Step 2: Append `.wysiwyg` styles to `app/globals.css`** (end of file, additive only)

```css
/* --- WYSIWYG editor surface (dev-only /editor Write mode) -------------------
   Mirrors ArticleContent's element→prose-* mapping so editing looks exactly
   like the published article. Nothing outside .wysiwyg is affected. */
.wysiwyg .tiptap {
  outline: none;
}
.wysiwyg .tiptap > * + * {
  margin-top: calc(var(--spacing) * 8);
}
.wysiwyg h2 {
  @apply prose-h1;
}
.wysiwyg h3 {
  @apply prose-h2;
}
.wysiwyg h4 {
  @apply prose-h3;
}
.wysiwyg p {
  @apply prose-p;
}
.wysiwyg ul {
  @apply prose-list;
}
.wysiwyg ol {
  @apply prose-list list-decimal;
}
.wysiwyg blockquote {
  @apply prose-blockquote;
}
.wysiwyg :not(pre) > code {
  @apply prose-code;
}
.wysiwyg table {
  @apply prose-table;
}
.wysiwyg img {
  width: 100%;
  height: auto;
  border-radius: 8px;
}
.wysiwyg img.ProseMirror-selectednode,
.wysiwyg .ProseMirror-selectednode {
  @apply ring-2 ring-ring;
}
```

Verify against the real `prose-*` definitions and `ArticleContent`'s spacing (`space-y-8`, heading `mt-8 first:mt-0` / `mt-6` for h3-visual) — if headings need the margin utilities, add them to the `@apply` lines. If `@apply` of a `prose-*` utility fails to compile, copy that utility's declarations verbatim instead and note the deviation.

- [ ] **Step 3: Write `components/editor/wysiwyg/mermaid-block.tsx`**

```tsx
"use client";

import { useSyncExternalStore } from "react";
import {
  Node,
  mergeAttributes,
  ReactNodeViewRenderer,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import Mermaid from "@/components/mermaid";

/**
 * A ```mermaid fenced block as an atomic editor node. Renders the site's
 * real Mermaid component; selecting the node exposes the diagram source in
 * a textarea. The optional height=NNN fence meta is preserved as an attr.
 */
export const MermaidBlock = Node.create({
  name: "mermaidBlock",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      code: { default: "" },
      height: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-mermaid-block]",
        getAttrs: (element) => ({
          code: (element as HTMLElement).getAttribute("data-code") ?? "",
          height:
            (element as HTMLElement).getAttribute("data-height") || null,
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-mermaid-block": "",
        "data-code": node.attrs.code,
        "data-height": node.attrs.height ?? "",
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidBlockView);
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any) {
          const meta = node.attrs.height ? ` height=${node.attrs.height}` : "";
          state.write("```mermaid" + meta + "\n");
          state.text(node.attrs.code, false);
          state.ensureNewLine();
          state.write("```");
          state.closeBlock(node);
        },
        parse: {
          setup(markdownit: any) {
            const defaultFence =
              markdownit.renderer.rules.fence?.bind(markdownit.renderer.rules);
            markdownit.renderer.rules.fence = (
              tokens: any,
              idx: number,
              options: any,
              env: any,
              self: any,
            ) => {
              const token = tokens[idx];
              const info = String(token.info ?? "").trim();
              if (info === "mermaid" || info.startsWith("mermaid ")) {
                const height = /height=(\d+)/.exec(info)?.[1] ?? "";
                const code = markdownit.utils.escapeHtml(token.content);
                return `<div data-mermaid-block data-code="${code}" data-height="${height}"></div>`;
              }
              return defaultFence
                ? defaultFence(tokens, idx, options, env, self)
                : self.renderToken(tokens, idx, options);
            };
          },
        },
      },
    };
  },
});

function MermaidBlockView({ node, updateAttributes, selected }: NodeViewProps) {
  // The textarea edits the attr directly; Mermaid re-renders on chart change
  // (its own effect keys on `chart`), so no extra debounce state is needed —
  // but updates are applied on change with the component's cost being an
  // async dynamic import + render that Mermaid already tolerates.
  return (
    <NodeViewWrapper
      data-mermaid-block
      className={selected ? "rounded-md ring-2 ring-ring" : undefined}
    >
      <Mermaid
        chart={node.attrs.code}
        height={node.attrs.height ?? undefined}
      />
      {selected && (
        <textarea
          className="mt-2 w-full rounded-md border bg-background p-2 font-mono text-sm"
          rows={Math.min(12, Math.max(4, node.attrs.code.split("\n").length))}
          value={node.attrs.code}
          onChange={(event) => updateAttributes({ code: event.target.value })}
        />
      )}
    </NodeViewWrapper>
  );
}
```

(The `useSyncExternalStore` import is only needed if you end up gating rendering on hydration — remove it if unused. Type the `storage.markdown` members per tiptap-markdown's real contract; use its exported types if any, `any` only where the package provides none.)

- [ ] **Step 4: Write `components/editor/wysiwyg/extensions.ts`**

```ts
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
// Verify the v3 table exports in node_modules — adjust to TableKit or
// individual Table/TableRow/TableHeader/TableCell as the package provides.
import { Table, TableRow, TableHeader, TableCell } from "@tiptap/extension-table";
import { Markdown } from "tiptap-markdown";
import CodeBlockShiki from "tiptap-extension-code-block-shiki";
import { MermaidBlock } from "./mermaid-block";

/**
 * The full extension set for the WYSIWYG editor. `theme` picks the shiki
 * theme matching the site's article pipeline (github-light /
 * github-dark-dimmed). If tiptap-extension-code-block-shiki supports dual
 * themes natively, configure both instead and ignore the parameter at the
 * call site.
 */
export function createExtensions(theme: "light" | "dark") {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3, 4] },
      // The shiki extension replaces the default code block.
      codeBlock: false,
      link: { openOnClick: false },
    }),
    CodeBlockShiki.configure({
      defaultTheme: theme === "dark" ? "github-dark-dimmed" : "github-light",
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
```

(If v3 StarterKit does not bundle Link, add `@tiptap/extension-link` to the install and the array. Confirm each `Markdown.configure` key against tiptap-markdown 0.9's README; drop unknown keys.)

- [ ] **Step 5: Write `components/editor/wysiwyg/round-trip.ts`**

```ts
/**
 * Canonicalizes markdown so that parse→serialize through the WYSIWYG editor
 * can be compared against the original without false alarms from
 * whitespace/bullet-marker style. Conservative on purpose: a false MISMATCH
 * only costs a source-mode fallback; a false MATCH silently rewrites a gist.
 */
export function normalizeMarkdown(md: string): string {
  return md
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/^([ \t]*)[*+] /gm, "$1- ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function roundTrips(original: string, serialized: string): boolean {
  return normalizeMarkdown(original) === normalizeMarkdown(serialized);
}
```

- [ ] **Step 6: Verify**

Run: `npm run lint && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json app/globals.css components/editor/wysiwyg/
git commit -m "feat: wysiwyg foundation — deps, editor prose styles, mermaid node, markdown bridge"
```

---

### Task 2: WysiwygEditor component + toolbar

**Files:**
- Create: `components/editor/wysiwyg/toolbar.tsx`
- Create: `components/editor/wysiwyg/index.tsx`

**Interfaces:**
- Consumes: `createExtensions`, `roundTrips` (Task 1), `Button` (`@/components/ui/button`), lucide-react icons, `useTheme` (next-themes).
- Produces (Task 3 relies on this exactly):
  - `WysiwygEditor` from `@/components/editor/wysiwyg` with props
    `{ value: string; onChange: (markdown: string) => void; onRoundTripFail: (serialized: string) => void }`.
    Parses `value` as markdown on mount; emits serialized markdown ~300ms
    debounced on edits; calls `onRoundTripFail` once from the initial
    round-trip check if the document doesn't survive.

- [ ] **Step 1: Write `components/editor/wysiwyg/toolbar.tsx`**

```tsx
"use client";

import type { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  List,
  ListOrdered,
  Link as LinkIcon,
  SquareCode,
  Workflow,
  Image as ImageIcon,
  Table as TableIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ToolbarProps {
  editor: Editor;
}

/** Markdown heading levels: ## = visual H1, ### = H2, #### = H3. */
const HEADINGS = [
  { level: 2 as const, icon: Heading1, label: "Heading 1 (##)" },
  { level: 3 as const, icon: Heading2, label: "Heading 2 (###)" },
  { level: 4 as const, icon: Heading3, label: "Heading 3 (####)" },
];

function ToolbarButton({
  onClick,
  active,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      aria-pressed={active}
      className={cn(active && "bg-muted text-foreground")}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

export function Toolbar({ editor }: ToolbarProps) {
  const chain = () => editor.chain().focus();

  const setLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previous ?? "");
    if (url === null) return;
    if (url === "") {
      chain().extendMarkRange("link").unsetLink().run();
      return;
    }
    chain().extendMarkRange("link").setLink({ href: url }).run();
  };

  const insertImage = () => {
    const src = window.prompt("Image URL");
    if (!src) return;
    const alt = window.prompt("Alt text (site convention allows size metadata)") ?? "";
    chain().setImage({ src, alt }).run();
  };

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 rounded-md border bg-background/95 p-1 backdrop-blur">
      <ToolbarButton label="Bold (⌘B)" active={editor.isActive("bold")} onClick={() => chain().toggleBold().run()}>
        <Bold />
      </ToolbarButton>
      <ToolbarButton label="Italic (⌘I)" active={editor.isActive("italic")} onClick={() => chain().toggleItalic().run()}>
        <Italic />
      </ToolbarButton>
      <ToolbarButton label="Strikethrough (⌘⇧X)" active={editor.isActive("strike")} onClick={() => chain().toggleStrike().run()}>
        <Strikethrough />
      </ToolbarButton>
      <ToolbarButton label="Inline code (⌘E)" active={editor.isActive("code")} onClick={() => chain().toggleCode().run()}>
        <Code />
      </ToolbarButton>

      <span className="mx-1 h-5 w-px bg-border" />

      {HEADINGS.map(({ level, icon: Icon, label }) => (
        <ToolbarButton
          key={level}
          label={label}
          active={editor.isActive("heading", { level })}
          onClick={() => chain().toggleHeading({ level }).run()}
        >
          <Icon />
        </ToolbarButton>
      ))}

      <span className="mx-1 h-5 w-px bg-border" />

      <ToolbarButton label="Blockquote" active={editor.isActive("blockquote")} onClick={() => chain().toggleBlockquote().run()}>
        <Quote />
      </ToolbarButton>
      <ToolbarButton label="Bullet list" active={editor.isActive("bulletList")} onClick={() => chain().toggleBulletList().run()}>
        <List />
      </ToolbarButton>
      <ToolbarButton label="Numbered list" active={editor.isActive("orderedList")} onClick={() => chain().toggleOrderedList().run()}>
        <ListOrdered />
      </ToolbarButton>
      <ToolbarButton label="Link (⌘K)" active={editor.isActive("link")} onClick={setLink}>
        <LinkIcon />
      </ToolbarButton>

      <span className="mx-1 h-5 w-px bg-border" />

      <ToolbarButton label="Code block" active={editor.isActive("codeBlock")} onClick={() => chain().toggleCodeBlock().run()}>
        <SquareCode />
      </ToolbarButton>
      <ToolbarButton
        label="Mermaid diagram"
        active={editor.isActive("mermaidBlock")}
        onClick={() =>
          chain()
            .insertContent({
              type: "mermaidBlock",
              attrs: { code: "graph TD;\n  A-->B;", height: null },
            })
            .run()
        }
      >
        <Workflow />
      </ToolbarButton>
      <ToolbarButton label="Image" onClick={insertImage}>
        <ImageIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Table"
        active={editor.isActive("table")}
        onClick={() => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
      >
        <TableIcon />
      </ToolbarButton>
    </div>
  );
}
```

In TipTap v3, `editor.isActive` reads in the render path may need `useEditorState({ editor, selector })` to re-render on selection changes — check `node_modules/@tiptap/react` docs and wire active states through it if plain reads don't update (record which you used). ⌘K for link is not a StarterKit default: add a keyboard shortcut for it (an extension `addKeyboardShortcuts` returning `{ "Mod-k": () => { setLink(); return true } }` or an equivalent hook in the editor component).

- [ ] **Step 2: Write `components/editor/wysiwyg/index.tsx`**

```tsx
"use client";

import { useEffect, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { useTheme } from "next-themes";
import { createExtensions } from "./extensions";
import { roundTrips } from "./round-trip";
import { Toolbar } from "./toolbar";

const CHANGE_DEBOUNCE_MS = 300;

export interface WysiwygEditorProps {
  value: string;
  onChange: (markdown: string) => void;
  onRoundTripFail: (serialized: string) => void;
}

export function WysiwygEditor({
  value,
  onChange,
  onRoundTripFail,
}: WysiwygEditorProps) {
  const { resolvedTheme } = useTheme();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor(
    {
      extensions: createExtensions(resolvedTheme === "dark" ? "dark" : "light"),
      content: value,
      // SSR safety: render nothing on the server; mount client-side only.
      immediatelyRender: false,
      onCreate({ editor }) {
        const serialized = editor.storage.markdown.getMarkdown();
        if (!roundTrips(value, serialized)) {
          onRoundTripFail(serialized);
        }
      },
      onUpdate({ editor }) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          onChange(editor.storage.markdown.getMarkdown());
        }, CHANGE_DEBOUNCE_MS);
      },
    },
    // Recreate when the theme flips so shiki blocks re-highlight with the
    // matching theme; content is preserved because `value` stays current.
    [resolvedTheme],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  if (!editor) return null;

  return (
    <div className="space-y-4">
      <Toolbar editor={editor} />
      <div className="wysiwyg mx-auto w-full max-w-3xl px-4 py-6">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
```

Check `useEditor`'s v3 signature for the deps-array recreate pattern (it exists in v3; confirm) and that `editor.storage.markdown.getMarkdown()` is tiptap-markdown 0.9's accessor. On recreate via deps, `content: value` uses the prop captured at that render — verify the parent keeps `value` current (it does: Task 3 wires `onChange` into `EditorScreen`'s `content`). If parsing markdown via `content` requires a `contentType`/Markdown-extension option in 0.9, configure it per its README.

- [ ] **Step 3: Verify**

Run: `npm run lint && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add components/editor/wysiwyg/
git commit -m "feat: wysiwyg editor component with toolbar and shortcuts"
```

---

### Task 3: EditorScreen mode integration

**Files:**
- Modify: `components/editor/editor-screen.tsx`

**Interfaces:**
- Consumes: `WysiwygEditor` (Task 2), existing `MarkdownEditor`, `PreviewPane`, actions, `Button`.
- Produces: the user-facing three-mode editor. No new exports.

- [ ] **Step 1: Rework `editor-screen.tsx`**

Keep ALL existing state and handlers (content, entry, save/publish, preview request-id guard, validation). Add:

```tsx
type EditorMode = "write" | "source" | "preview";
const [mode, setMode] = useState<EditorMode>("write");
const [roundTripBroken, setRoundTripBroken] = useState(false);
```

Changes, precisely:

1. **Preview effect gating:** the existing debounced `renderPreview` effect only runs when `mode === "preview"` (add `mode` to the effect deps; keep the stale-response request-id guard exactly as is). Entering preview with existing content triggers it because the effect re-runs on `mode` change.
2. **Round-trip fallback:** pass to `WysiwygEditor`:
   ```tsx
   onRoundTripFail={() => {
     setRoundTripBroken(true);
     setMode("source");
   }}
   ```
   When `roundTripBroken`, render a banner above the editor area:
   ```tsx
   {roundTripBroken && (
     <div className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
       <p className="flex-1">
         This document contains formatting the visual editor would rewrite.
         Editing in Source mode to keep it intact.
       </p>
       <Button
         variant="outline"
         size="sm"
         onClick={() => {
           setRoundTripBroken(false);
           setMode("write");
         }}
       >
         Edit visually anyway
       </Button>
     </div>
   )}
   ```
   "Edit visually anyway" clears the flag so the guard's next failure callback is ignored for this session: guard against repeat callbacks by only acting in `onRoundTripFail` when `!roundTripBroken` has never been user-dismissed — simplest: keep a `const forceWriteRef = useRef(false)`, set it true on "Edit visually anyway", and make `onRoundTripFail` a no-op when `forceWriteRef.current` is true.
3. **Mode toggle UI** (replaces nothing; sits above the editor area, next to or in line with the metadata bar):
   ```tsx
   <div className="flex items-center gap-1">
     {(["write", "source", "preview"] as const).map((m) => (
       <Button
         key={m}
         variant={mode === m ? "secondary" : "ghost"}
         size="sm"
         onClick={() => setMode(m)}
       >
         {m === "write" ? "Write" : m === "source" ? "Source" : "Preview"}
       </Button>
     ))}
   </div>
   ```
4. **Editor area** replaces the current `grid lg:grid-cols-2` two-pane block:
   ```tsx
   {mode === "write" && (
     <WysiwygEditor
       value={content}
       onChange={setContent}
       onRoundTripFail={...}
     />
   )}
   {mode === "source" && (
     <MarkdownEditor value={content} onChange={setContent} />
   )}
   {mode === "preview" && (
     <PreviewPane
       node={preview}
       error={previewError}
       isPending={isPreviewPending}
       version={previewVersion}
     />
   )}
   ```
   Keep the full-bleed wrapper; Write and Preview center themselves internally at `max-w-3xl` (WysiwygEditor already does; PreviewPane already does).
   IMPORTANT: `WysiwygEditor` parses `value` only on mount, so re-mounting it per mode switch (which this conditional render does) is exactly the desired "entering write parses current markdown" behavior. Do not add a `key` gymnastics layer.
5. **Content-required and compose validation, save handlers, status line: unchanged.** Saving in write mode works because `onChange` keeps `content` current (300ms debounce; a save click races at most one debounce tick — acceptable for a dev tool, note it in the report if you observe it).

- [ ] **Step 2: Verify**

Run: `npm run lint && npx tsc --noEmit`
Expected: clean. Then `npm run dev` (or use the already-running dev server on :3000 if present — do NOT kill it) and confirm `/editor/new` returns 200 and the response HTML includes the mode toggle labels Write/Source/Preview.

- [ ] **Step 3: Commit**

```bash
git add components/editor/editor-screen.tsx
git commit -m "feat: three-mode editor screen (write/source/preview) with round-trip guard"
```

---

### Task 4: Verification

**Files:** none. Prereq: dev server available on :3000 (reuse the user's running one; do not kill it).

- [ ] **Step 1: Static + build**

`npm run lint && npx tsc --noEmit && npm run build` — all clean; `/editor` routes still present and the build output unchanged for public routes.

- [ ] **Step 2: Production gate**

`npm run start` on the fresh build (use a different port if :3000 is busy: `PORT=3100 npm run start`), then `/editor`, `/editor/new` → 404; `/` → 200. Kill only the server you started.

- [ ] **Step 3: Scripted dev checks**

Against the dev server: `/editor/new` → 200 and contains "Write", "Source", "Preview" strings. `/editor` → 200.

- [ ] **Step 4: Report the manual checklist for the user** (things only a human in a browser can verify)

1. Open a published article in the editor — Write mode shows it in article styling (headings, shiki-colored code, live mermaid, tables, images); round-trip guard passes, or falls back to Source with the banner.
2. ⌘B/⌘I/⌘E/⌘K and every toolbar button produce correct markdown (verify via Source toggle).
3. Write → Source → Write retains content; Preview shows the exact server render.
4. Save/publish from Write mode writes correct markdown to the gist.

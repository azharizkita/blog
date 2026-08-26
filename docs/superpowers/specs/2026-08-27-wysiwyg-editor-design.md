# WYSIWYG Editor — Design Spec

**Date:** 2026-08-27
**Status:** Approved (design discussed and accepted in-session)
**Builds on:** `2026-08-27-blog-editor-design.md` (the shipped `/editor` feature on branch `feat/editor`)

## Goal

Replace the editor's primary surface with a true WYSIWYG document editor that
renders content in the article's exact styling (`prose-*` classes, shiki code
themes, live mermaid), with a formatting toolbar and keyboard shortcuts
(⌘B, ⌘I, …). Markdown stays the single source of truth (gist storage is
unchanged); the raw-markdown CodeMirror pane and the exact server-rendered
preview remain available as modes.

## Non-goals

- No storage changes: gists, metadata bar, save/publish/deploy-hook flow are
  untouched.
- No changes to the published article rendering pipeline or public pages.
- No image uploads — images are inserted by URL, as they are authored today.
- No collaborative editing, autosave, or version history.

## Decisions made with the user

1. **Layout:** single full-width WYSIWYG document ("Write" mode, default)
   with a toggle to the exact server-rendered preview. No side-by-side.
2. **Escape hatch:** the existing CodeMirror markdown editor stays as
   "Source" mode.
3. **Code blocks:** highlighted in-editor with client-side **shiki** using
   the article pipeline's exact themes (`github-dark-dimmed` /
   `github-light`).
4. **Engine:** **TipTap** (ProseMirror) with `tiptap-markdown` for
   parse/serialize. Chosen over Milkdown (styling/custom-renderer friction)
   and Lexical (weak markdown export) because React node views are needed
   for shiki code blocks and live mermaid.

## Architecture

### Modes

`EditorScreen` owns `mode: "write" | "source" | "preview"` (default
`"write"`) and continues to own the canonical `content: string` (markdown).

- **write** → `<WysiwygEditor value onChange>` (new). Parses markdown into
  a TipTap document on mount/mode-entry; emits serialized markdown via
  debounced `onChange` (~300ms). The markdown string in `EditorScreen`
  remains the single source of truth; the TipTap doc is never fed back
  into the editor while the user is typing (no cursor resets).
- **source** → existing `MarkdownEditor` (CodeMirror), unchanged.
- **preview** → existing `PreviewPane` + `renderPreview` server action on
  the current markdown, requested on mode entry (reuse the existing
  debounce/stale-guard plumbing or a direct call on entry).

Mode switching always goes through the markdown string: leaving write
serializes; entering write parses. Save/publish serialize implicitly because
they read `content`, which write mode keeps current via `onChange`.

### Round-trip guard (protects existing articles)

On entering write mode (including initial open): parse the markdown to a
doc, immediately serialize back, normalize both sides, and compare.
Normalization: trim trailing whitespace per line, collapse 3+ consecutive
newlines to 2, normalize list bullets `*`/`+` → `-` at line starts.

- **Match** → write mode proceeds.
- **Mismatch** → the screen falls back to **source mode** with a dismissible
  warning banner: the document contains constructs the visual editor would
  rewrite. The user can still force write mode from the banner (explicit
  opt-in to the rewrite), or stay in source.

The guard runs client-side (TipTap parsing needs the DOM).

### WYSIWYG document model

TipTap extensions (pinned to the major version `tiptap-markdown` supports —
verify peer deps at install; TipTap v2 if v3 is unsupported):

- StarterKit with `heading.levels: [2, 3, 4]` (matching the site's
  authoring convention: markdown `##` is the article's visual h1).
- Link, Image, Table (+ row/cell/header) extensions.
- `tiptap-markdown` configured for GFM (tables, strikethrough); serializer
  must emit ATX headings, `-` bullets, and fenced code blocks.
- **Custom code block** with a React node view: editable code content,
  highlighted via client-side shiki (`github-dark-dimmed`/`github-light`,
  `keepBackground: false` semantics — the block keeps the site's chrome),
  with a small language field. Unknown/missing language falls back to plain
  text. Prefer an existing maintained shiki code-block extension if
  compatible; otherwise a node view that renders the highlighted HTML when
  unfocused and a plain editable surface when focused.
- **Custom mermaid node**: parsed from/serialized to ` ```mermaid ` fences
  (attrs: `{ code }`). Node view renders the existing `@/components/mermaid`
  client component (debounced re-render on edit ~500ms); selecting/focusing
  the node exposes the code for editing. Mirrors what `remark-mermaid` does
  at publish time.
- **Images**: rendered as a plain `<img>` (width 100%, border-radius 8px —
  the article's visual), `src`/`alt` editable via the toolbar's image
  action. The site's alt-size-metadata convention is preserved verbatim as
  the alt string (not parsed in-editor).

### Styling

The editable surface sits in the article column (`max-w-3xl`, article
spacing) inside a container class (e.g. `.wysiwyg`). `app/globals.css`
gains **additive-only** descendant rules mapping editor elements to the
article's exact styles: `h2`→`prose-h1` visuals, `h3`→`prose-h2`,
`h4`→`prose-h3`, `p`→`prose-p`, `ul/ol`→`prose-list`,
`blockquote`→`prose-blockquote`, inline `code`→`prose-code`,
`table`→`prose-table`. Implementation may reuse the existing `prose-*`
declarations (e.g. via Tailwind v4 `@utility`/`@apply` or shared custom
properties) but MUST NOT change how article pages render — additive only.
Dark mode follows the existing `.dark` class mechanism.

### Toolbar and shortcuts

Sticky toolbar above the document (lucide icons, existing `Button`
variants; active states from `editor.isActive`):

bold, italic, strikethrough, inline code · H1/H2/H3 (levels 2/3/4) ·
blockquote, bullet list, ordered list · link (prompt/popover for URL) ·
code block, mermaid block, image (URL + alt prompt), table (insert 3×3).

Shortcuts: ⌘B bold, ⌘I italic, ⌘⇧X strikethrough, ⌘E inline code, ⌘K link,
⌘⌥1/2/3 headings (from StarterKit defaults where available). Markdown input
rules while typing (`**`, `##` + space, `- `, `> `, ``` ` ``` fences) come
from StarterKit/extensions.

### Files

| File | Change |
| --- | --- |
| `components/editor/wysiwyg/shiki.ts` | new — client shiki highlighter singleton (dual themes, lazy languages, plain-text fallback) |
| `components/editor/wysiwyg/extensions.ts` | new — TipTap extension list + tiptap-markdown config + mermaid node + markdown mappings |
| `components/editor/wysiwyg/code-block.tsx` | new — shiki code block node view (or config of a maintained extension) |
| `components/editor/wysiwyg/mermaid-block.tsx` | new — mermaid node view using `@/components/mermaid` |
| `components/editor/wysiwyg/toolbar.tsx` | new — toolbar component |
| `components/editor/wysiwyg/index.tsx` | new — `WysiwygEditor` (`{ value, onChange, onRoundTripFail }`) |
| `components/editor/wysiwyg/round-trip.ts` | new — normalize + `roundTrips(markdown): { ok, serialized }` helper |
| `components/editor/editor-screen.tsx` | modify — mode state, mode toggle UI, round-trip fallback banner |
| `app/globals.css` | modify — additive `.wysiwyg` descendant styles |
| `package.json` | + `@tiptap/react`, `@tiptap/starter-kit`, link/image/table extensions, `tiptap-markdown`, `shiki` (+ shiki code-block extension if used) |

Unchanged: metadata bar, actions, gist layer, preview pane, article
pipeline, all public pages.

## Error handling

- Shiki highlight failure (unknown lang, load error) → plain-text block,
  never a crash.
- Mermaid render failure while editing → the existing `Mermaid` component's
  error behavior inside the node view; code remains editable.
- Round-trip mismatch → source-mode fallback with banner (never a silent
  rewrite).
- Serialization throwing on save → save is blocked with an inline error;
  content is still reachable via source mode.

## Testing

No test runner (unchanged constraint): `npm run lint` + `npx tsc --noEmit`
+ `npm run build` per task, plus manual verification in dev:

1. Open each of the user's real published articles in write mode — the
   round-trip guard must pass (or correctly fall back to source with the
   banner) and the document must look like the published article (headings,
   code with shiki colors, mermaid rendered, tables, images).
2. Toolbar buttons and ⌘B/⌘I/⌘K etc. produce correct markdown (check via
   Source toggle).
3. Write → Source → Write retains content; Preview shows the exact
   server render; save from write mode publishes correct markdown to the
   gist.
4. Production build: `/editor` still 404s; public pages unaffected.

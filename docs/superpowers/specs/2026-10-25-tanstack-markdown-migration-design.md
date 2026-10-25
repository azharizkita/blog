# TanStack Markdown Migration — Design Spec

**Date:** 2026-10-25
**Status:** Reviewed (builder check done) — pending user approval
**Branch:** `feat/tanstack-markdown` (cut from `chore/update-deps`, which carries the in-range dependency update)
**Mockups:** https://claude.ai/artifact/Hv89bjpCKEQnNn3qeVC4Ky (approved: "everything looks allright")
**Replaces parts of:** `2026-08-27-wysiwyg-editor-design.md` (engine/serializer and code-highlighting decisions)

## Intent

Writing posts is fragile today, and that fragility comes from MDX:

- Any post containing JSX (`<AppleMusic/>`, `<Envelope/>`, …) is bounced from
  Write to Source mode by the round-trip guard. `hiduplah-dengan-tenang` opens
  in Source with the "formatting the visual editor would rewrite" banner, and
  the page also throws `Runtime RangeError: Applying a mismatched transaction`
  in the dev overlay.
- Ordinary prose characters (`<`, `{`) can break the MDX compile.
- Link serialization had to be patched (`80f8a19`, never emit `<url>`) purely
  to keep MDX parsing.
- `tiptap-markdown` (0.9, pinned) is end-of-life and is the load-bearing
  serializer; the editor parses with markdown-it while the site renders with
  remark — two dialects.

The goal is a pipeline where none of that can happen: posts are plain
Markdown in **TanStack Markdown's formats**, one parser (`@tanstack/markdown`)
reads every post in Write mode, Preview and the live site, and content is
never executed.

## Goals

1. All 23 posts render on the public site **exactly as they do now**
   (layout, styling, components, heading anchors, URLs). Content is
   converted to TanStack-acceptable formats; the reader sees no change except
   the code-theme note below.
2. **Every post opens in Write mode**, embeds included. Source mode stays as an
   optional raw editor, never a forced fallback.
3. **Saving never silently loses or changes content or embeds** (the user's
   explicit "what would make you wince").
4. One parser everywhere: Write, Source diagnostics, Preview, live article.
5. No code in post content ever executes.

## Non-goals

- No visual redesign of public article pages (user: "keep them exactly as
  they are now").
- No storage/schema changes beyond the content rewrite and file-name rename
  below. Postgres (Neon) stays the store; the gist-shaped export contract in
  `repositories/gist/index.ts` stays.
- No new reader-facing features (TOC, footnote styling, etc.).
- The editor stays dev-only (`app/editor/dev-only.ts` unchanged).

## Anti-goals (failure even if it "works")

- An embed, block, or attribute disappearing or changing on save without the
  author explicitly confirming it.
- A post whose public rendering changes unintentionally.
- Any existing `#anchor` link or post URL breaking.

## Decisions made with the user

1. **Follow TanStack's formats** for everything:
   - Callouts: GitHub-style alerts `> [!NOTE]`, `> [!TIP]`, `> [!WARNING]`
     (TanStack `calloutsExtension`).
   - Embeds: TanStack comment components, one per line:
     `<!-- ::apple-music url="…" -->`, `<!-- ::youtube id="…" title="…" -->`,
     `<!-- ::envelope text="…" -->` (TanStack `commentComponentsExtension`).
   - Mermaid: a normal ```` ```mermaid ```` fence; optional `height=N` fence
     meta keeps working (TanStack records `meta` on the code node).
2. **Keep TipTap** as the Write-mode editor; **replace `tiptap-markdown`**
   with a Markdown↔ProseMirror bridge built on TanStack's parser and a
   serializer that writes TanStack syntax.
3. **Syntax highlighting: TanStack Highlight** (`@tanstack/highlight`), not
   Shiki — on the article page, in Preview, and in Write-mode code blocks.
   Shiki, `rehype-pretty-code` and `tiptap-extension-code-block-shiki` are
   removed.
4. **One-time rewrite** of the posts that differ, with a `post_revisions` row
   per changed post so each can be rolled back.
5. Mockups approved as drawn: Write, Source, Save guard, Preview boards.

## Calls made by me (Claude) — check these

- **Code themes:** TanStack Highlight has no GitHub Dark Dimmed. Use
  **GitHub Light** + **GitHub Dark**, switched by the `.dark` class
  (`createThemeCss({ light, dark, darkSelector: ".dark", codeBlockSelector: "pre.tm-code" })`).
  This is the one accepted visible change on article pages (code colors only).
- **Language aliases:** posts use `js`, `javascript`, `ts`/`typescript`,
  `css`, `json`, `bash`. Register exactly what's needed and map
  `javascript→js`, `typescript→ts`, `bash`/`sh`→`shell`. Unknown languages
  fall back to plaintext (library default).
- **Callout kind mapping** to the existing `Callout` visuals
  (`components/article-content/mdx-components.tsx`): `NOTE`/`IMPORTANT`→note,
  `TIP`→tip, `WARNING`/`CAUTION`→warn. No current post uses a callout.
- **Content key rename:** new saves write `index.md` instead of `index.mdx`.
  Reads still go through `lib/gist-file.ts` `getContentFile`, which must
  accept `index.md`, `index.mdx` and legacy names.
- **Rollout of the content rewrite:** run on a Neon branch first; run on the
  production branch only after the user checks the result (mirrors how
  schema changes are already done).
- New toolbar buttons for **Callout** and **YouTube** (the YouTube component
  exists but had no toolbar entry), the header **"round-trip safe"** dot, and
  the save-guard's **"I deleted it on purpose — save"** override were my
  additions in the mockups; the user approved the mockups as a whole.

## Current state (facts the builder can rely on)

- Rendering: `components/article-content/index.tsx` — `evaluate()` from
  `@mdx-js/mdx` with `remark-gfm`, `remarkMermaid`, `rehype-pretty-code`;
  a `components` map does all styling (heading promotion `##→h1`, `###→h2`
  with `id=getSlug(text)` + link icon, `####→h3`; `a`→`next/link`, external
  `target=_blank`; `img`→`next/image` using the `alt|WxH[|cover]` convention
  via `lib/get-image-size.ts`; `table` wrapped in `overflow-x-auto`; inline vs
  block `code` styling). `ArticleContentUncached` (preview action) vs cached
  `ArticleContent` (`"use cache"`, `cacheLife("max")`) split **must stay**.
- Whitelisted components: `components/article-content/mdx-components.tsx`
  (AppleMusic, Envelope, Mermaid, Callout, YouTube). Props:
  `AppleMusic {url, title?}`, `YouTube {id, title?}`, `Envelope {text}`,
  `Mermaid {chart, height?}`.
- Editor: `components/editor/` — `editor-screen.tsx` (modes, save flow),
  `wysiwyg/` (TipTap + `tiptap-markdown`, block node views for apple-music,
  envelope, mermaid, image upload, `round-trip.ts` string-normalizing guard),
  `markdown-editor.tsx` (CodeMirror Source mode), `preview-pane.tsx`.
- Hard-won constraints in the project memory note (`blog-editor-architecture`)
  still apply: `"use cache"` can't run inside a server action render; the
  editor pages' side-effect `import "@/components/article-content"` keeps
  client components in the page's Client Manifest; WysiwygEditor is
  "controlled-once" with an imperative flush; no setState-in-effect lint.
- Content: 23 published posts in Postgres `posts.content` (~82K chars).

### Measured compatibility (all 23 posts, MDX vs TanStack 1.0.0)

18 render identically after normalization. The rest:

| Post | Problem under TanStack | Fix |
|---|---|---|
| `the-astral-omen`, `the-weight-of-silence` | `<br />` escaped as text (raw HTML is off) | rewrite to trailing `\` hard breaks |
| `21-guns` | lazy blockquote continuation lines + two-space hard breaks unsupported | prefix every line with `>`; two-space breaks → `\` |
| `life-update` | blank-line-separated `>` quotes merge into one blockquote | parser extension (below) — no content change |
| `hiduplah-dengan-tenang` | `<AppleMusic url="…" />` escaped as text | rewrite to `<!-- ::apple-music url="…" -->` |

Also verified: TanStack does **not** support `<https://…>` autolinks or bare-URL
autolinks; no current post relies on either. The serializer must always write
`[url](url)` (it already does).

## Design

### 1. Shared Markdown config (`lib/markdown/`)

One module exports the parse options used by every surface:

- `extensions`: a **blockquote-boundary extension** first (see below), then
  `calloutsExtension()`, then `commentComponentsExtension()`. Not the full
  docs preset (tabs/framework/package-manager are irrelevant).
- `headingIds: (text) => getSlug(text)` so ids match today's anchors exactly.
  (Today only `###` headings carry an id/link; the renderer keeps that rule.)
- `allowHtml: false` (default). Content is never trusted as HTML.
- The highlighter instance (`@tanstack/highlight/core` + registered
  languages) and `createTanStackMarkdownHighlighter(highlighter)`.

**Blockquote-boundary extension.** TanStack merges `> a` / blank / `> b` into
one blockquote; CommonMark (and today's site) renders two. A `parseBlock`
extension that consumes a run of `>`-prefixed lines, stops at the first blank
or non-`>` line, and returns a `blockquote` node with
`parseBlocks(strippedLines)` restores today's behavior. It must defer to the
callouts extension for `> [!KIND]` openers. Gate: `life-update` matches MDX.

### 2. Article rendering (`components/article-content/`)

- Replace `evaluate()` with `parseMarkdown(content, options)` +
  `<Markdown components={…}>` from `@tanstack/markdown/react` (a server
  component; no client JS added).
- Port the existing `components` map unchanged in output (map is keyed by
  emitted tag names: `a`, `p`, `h2`, `h3`, `img`, `table`, `code`, `pre`, …).
- **Mermaid:** a `transformDocument` extension turns `code` nodes with
  `lang === "mermaid"` into a `component` node (`tagName: "md-mermaid"`,
  attributes `chart`, optional `height` from meta), mapped to `<Mermaid>`.
  Replaces `remark-mermaid.ts`.
- **Comment components:** map component names → existing components:
  `apple-music`→`AppleMusic`, `youtube`→`YouTube`, `envelope`→`Envelope`
  (via `transformComponent` giving each a stable `tagName`). Unknown names
  render nothing on the public site.
- **Callouts:** map TanStack's callout output to the existing `Callout`
  component visuals (kind mapping above).
- **Code blocks:** TanStack Highlight via `highlighter` render option; theme
  CSS generated once and added to `app/globals.css` (or a generated CSS file
  imported there). Blocks must keep today's look: no background override
  (`keepBackground: false` equivalent), same radius/padding/inline-code style.
- Keep the cached/uncached split and the preview action unchanged in shape.

### 3. Editor bridge (replaces `tiptap-markdown`)

- **Parse:** `parseMarkdown(source, options)` → convert TanStack AST →
  ProseMirror JSON for the existing TipTap schema (paragraph, headings,
  lists incl. task items if used, blockquote, code block, table, image,
  hard break, marks: bold/italic/strike/code/link) plus custom nodes:
  `callout` (new), `appleMusic`, `youtube` (new), `envelope`, `mermaid`, and
  `rawBlock` (new).
- **Serialize:** ProseMirror doc → Markdown in TanStack syntax: `\` hard
  breaks (never two spaces), `[url](url)` links, `>` on every quoted line,
  `> [!KIND]` callouts, one-line comment components with escaped attributes,
  fences with preserved `meta` (mermaid `height=N`).
- **`rawBlock`:** any top-level block the bridge can't represent faithfully
  (including unknown comment components like `::spotify`) is kept as a locked
  block holding its **exact source text**, serialized back verbatim. This is
  what replaces "bounce the whole post to Source mode". Locating a block's
  source lines: TanStack's AST carries no positions; one workable approach is
  a no-op `parseBlock` extension that records `context.index` at each
  top-level block start. Builder's choice.
- **Load-time fidelity check (per block):** for each top-level block,
  serialize(toPM(block)) re-parsed must equal the original block's AST;
  blocks that fail become `rawBlock`s. The post always opens in Write.
- Remove `round-trip.ts` string normalization, `detectLossySerialization`,
  `TableEnterGuard` placeholder workarounds once the new serializer has no
  lossy fallbacks (those existed for `tiptap-markdown`'s `[table]`/`[hardBreak]`
  placeholders). Keep the "controlled-once" + imperative-flush contract.
- **Write-mode code highlighting:** ProseMirror decorations from TanStack
  Highlight tokens, same theme CSS as the article. Fix today's missing inner
  padding on Write-mode code blocks.
- **Fix** the `Applying a mismatched transaction` error on
  `hiduplah-dengan-tenang` (root-cause it; likely a node view dispatching
  during mount).

### 4. Save guard (board 3 of the mockups)

At every save/publish, before any write:

1. Serialize the editor doc, re-parse with TanStack, convert back to
   ProseMirror JSON, and compare with the current editor JSON. Any
   difference means the serializer would lose or alter content.
2. Every block still marked unchanged since load must serialize to an AST
   equal to its originally loaded AST.

On any mismatch: **nothing is written**; show the red panel with the
offending block's "Loaded" vs "About to save" Markdown side by side and the
actions *Restore block & save*, *Keep editing*, *I deleted it on purpose —
save*. Formatting-only spellings (`_x_` vs `*x*`, `*` vs `-` bullets,
trailing spaces) are compared at AST level, so they pass silently. Source
mode saves run check 2's AST comparison only for diagnostics (Source is
author-edited text, saved as typed).

### 5. Source mode

CodeMirror stays. Add a lint pass using the shared parser: unknown comment
components get an amber warning line ("kept exactly as written and shown as
a locked block in Write mode"). The "forced into Source" banner and
"Edit visually anyway" path are removed.

### 6. Content migration

A one-off script (`scripts/`, run with `node --env-file=.env.local`):

- Scope: the `posts` table holds exactly 23 rows, all `published`/`post`
  (verified by query 2026-10-25); no drafts or pages exist. The converter is
  strict: it asserts that exactly the four posts in the compatibility table
  change (`life-update` is fixed by the parser extension, not content) and
  fails the run on anything it can't convert (JSX, `{…}` expressions, raw
  HTML other than `<br />`).
- For each changed post: insert a `post_revisions` row holding the **old**
  content, then update `posts.content`. *(My call:)* the script does **not**
  reuse `updateGist`. It writes its own SQL that **preserves `updated_at`**
  (it's public: the "Updated at" toggle, JSON-LD `dateModified`, sitemap
  `lastModified`), recomputes `reading_time_minutes` and the
  `feature_image*` fields only if they change, and does **not** fire the
  deploy hook or IndexNow.
- Dry-run mode prints per-post diffs. Run on a Neon branch first; production
  only after the user approves.

**Rollout order — compatibility step (user's decision).** The code deploy and
the content rewrite can't land atomically: the live MDX site can't compile
`<!-- … -->`, pages re-render on a 12h ISR window, and preview builds share
the production database. So the new code ships with a temporary **legacy
read shim**: every content read (article render, preview, editor load,
`llms-full.txt`) passes the source through the *same* converter the
migration uses, in memory, before parsing. Order is then:

1. Merge and deploy the new code (shim active). Every post renders correctly
   from unmigrated content.
2. Run the migration (Neon branch, then production after approval).
3. Confirm 0 posts still need conversion (converter dry-run reports none);
   remove the shim in a follow-up commit and deploy.

The shim is idempotent (already-converted content passes through unchanged)
and the editor always saves the converted form.
- Convert any `<Envelope …/>`, `<YouTube …/>`, `<Callout …>` usage too
  (none exist today; the converter should still handle them).

### 7. Parity check (permanent)

Promote `compare.mjs` (scratchpad prototype) into the repo as a script that
renders every post from the database through the new pipeline and checks it
against a stored snapshot of today's MDX output (captured once, before MDX is
removed). Normalization: strip attributes/classes, React image preload
`<link>`s, trailing whitespace in code. Expected diffs only: code token
markup. All 23 must pass before merge.

### 8. Dependencies

Add: `@tanstack/markdown@1.0.0`, `@tanstack/highlight@1.1.0` (pin exact
versions; both are new — 1.0 shipped 2026-10).
Remove: `@mdx-js/mdx`, `remark-gfm`, `rehype-pretty-code`,
`unist-util-visit`, `shiki`, `tiptap-extension-code-block-shiki`,
`tiptap-markdown` (and `@types/mdast` usage). Keep TipTap, CodeMirror,
mermaid.

## Verification (end-to-end, by the builder)

- `npm run lint` and `npm run build` pass.
- Parity script: 23/23.
- `npm run dev`, then in Chrome (Claude in Chrome):
  - every post opens in Write mode with no banner and no dev-overlay errors;
  - edit and save one post per embed type (apple-music, youtube, envelope,
    mermaid, callout, image, table, code) and confirm the saved Markdown and
    Preview;
  - trigger the save guard deliberately (e.g. a test-only serializer fault)
    and confirm nothing is written;
  - Preview equals the live article page for the same post;
  - light and dark themes for code blocks.
- Public pages for all 23 posts visually unchanged (spot-check screenshots
  before/after, including `#anchor` links).

## Left to the builder

- Module layout under `lib/markdown/` and `components/editor/wysiwyg/`.
- How block source spans are recovered for `rawBlock`.
- Exact ProseMirror decoration strategy for Write-mode highlighting.
- Whether the parity snapshot lives in the repo or is regenerated from a
  pinned commit.

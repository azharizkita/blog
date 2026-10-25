# TanStack Markdown Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace MDX (`@mdx-js/mdx` + remark/rehype + `tiptap-markdown` + Shiki) with TanStack Markdown + TanStack Highlight for the public article pages and the dev-only editor, with every post opening in Write mode and saves that can never silently lose content.

**Architecture:** One shared module (`lib/markdown/`) owns parse options, custom extensions, the legacy-syntax converter and the highlighter. The article page renders through `@tanstack/markdown/react` with the existing components map. The editor gets a pure-function bridge (TanStack AST ⇄ TipTap JSON) that replaces `tiptap-markdown`, plus a save guard that compares at the AST level. A legacy read shim at the repository boundary makes deploy order and content migration independent.

**Tech Stack:** Next.js 16.4 App Router, React 19.2, TypeScript strict, TipTap 3, CodeMirror 6, `@tanstack/markdown@1.0.0`, `@tanstack/highlight@1.1.0`, Vitest (new, unit tests only), Neon Postgres, Claude in Chrome for E2E.

**Spec:** `docs/superpowers/specs/2026-10-25-tanstack-markdown-migration-design.md` — read it first; this plan argues from it.

## Global Constraints

- Branch: `feat/tanstack-markdown`. Commit per task. End every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Never edit `components/ui/`** (shadcn-generated). New components go under `components/`.
- Read `node_modules/next/dist/docs/` before writing framework code (Next 16 differs from training data).
- Pin exact versions: `@tanstack/markdown@1.0.0`, `@tanstack/highlight@1.1.0`.
- Public article pages must render exactly as today, apart from code token colours (GitHub Light / GitHub Dark under `.dark`).
- Parse options everywhere: `allowHtml: false`; `headingIds: (text) => getSlug(text)`; extensions in order: blockquote-boundary, callouts, comment components, mermaid transform, component mapping.
- Embed syntax (one line each): `<!-- ::apple-music url="…" -->`, `<!-- ::youtube id="…" title="…" -->`, `<!-- ::envelope text="…" -->`. Callouts: `> [!NOTE]` / `> [!TIP]` / `> [!WARNING]` (also accept `IMPORTANT`→note, `CAUTION`→warn).
- Attribute values are always double-quoted, with `&` `"` `<` `>` and newlines written as `&amp;` `&quot;` `&lt;` `&gt;` `&#10;`, and decoded on read. TanStack's `parseAttributes` does no entity decoding and can't read a `"` inside a double-quoted value.
- Hard breaks are always written as a trailing `\`, never two spaces. Links are always written as `[text](url)`, never `<url>`.
- Language aliases: `javascript→js`, `typescript→ts`, `bash`/`sh`→`shell`. Registered: `js`, `ts`, `tsx`, `jsx`, `css`, `json`, `shell`, `html`, `markdown`, `yaml`, `diff`, `plaintext`.
- Keep the `ArticleContentUncached` / cached `ArticleContent` (`"use cache"`, `cacheLife("max")`) split, and the editor pages' side-effect `import "@/components/article-content"`.
- WysiwygEditor stays controlled-once with an imperative flush. Lint forbids setState-in-effect.
- The migration script preserves `updated_at`, never calls `updateGist`, never fires the deploy hook or IndexNow, and writes a `post_revisions` row with the **old** content first.
- Production database writes only after the user approves the Neon-branch result.

## Review Focus

1. **Embed attributes with quotes, `&` or newlines** (Envelope text is free prose): must round-trip byte-exact through serialize → parse → component props. Pinned in Task 3 (`attributes.test.ts`) and Task 8 (`round-trip.test.ts`, envelope fixture with `"`, `&` and a newline).
2. **Code fences containing ```` ``` ```` or `<!-- ::x -->` lines**: must never be converted by the legacy converter or parsed as components. Pinned in Task 2 (`legacy.test.ts` "leaves fenced code alone") and Task 8 (fence-length test).
3. **A post that starts without a `## ` title, or uses `#`/`#####` headings**: the editor must still open in Write mode (unrepresentable blocks become `rawBlock`), with no crash and no rewrite. Pinned in Task 7 (`to-doc.test.ts` "level-1 heading becomes rawBlock").
4. **Editing next to a `rawBlock`, then saving**: the raw source must come back verbatim. Pinned in Task 9 (`save-guard.test.ts` "rawBlock source survives").
5. **Pasting Markdown or HTML into Write mode** (no longer handled by tiptap-markdown's `transformPastedText`): pasted Markdown must become structured nodes, not literal text. Pinned in Task 10 (paste handler test via `markdownToDoc`) and the Task 13 E2E checklist.

---

## File Structure

| Path | Responsibility |
|---|---|
| `vitest.config.ts` | Unit-test runner, `@` alias → repo root |
| `lib/markdown/legacy.ts` | `convertLegacyMarkdown` — MDX-era → TanStack syntax. **No imports** (the migration script runs it with Node type stripping) |
| `lib/markdown/attributes.ts` | Encode/decode comment-component attribute values |
| `lib/markdown/extensions.ts` | blockquote-boundary, mermaid transform, component + callout mapping extensions |
| `lib/markdown/highlight.ts` | Highlighter instance, aliases, `highlightCode`, `codeTokens` |
| `lib/markdown/config.ts` | `parseOptions`, `renderOptions`, `parseArticle(source)` |
| `lib/markdown/blocks.ts` | `splitTopLevelBlocks(source)` — top-level blocks with exact source text |
| `app/code-theme.css` | Generated TanStack Highlight theme CSS (committed) |
| `scripts/gen-code-theme.ts` | Regenerates `app/code-theme.css` |
| `scripts/parity.ts` | Capture/check public article HTML against snapshots |
| `scripts/export-fixtures.ts` | Dumps post sources to `tests/fixtures/posts/` |
| `scripts/migrate-content.ts` | One-off content migration (dry-run / apply) |
| `components/article-content/index.tsx` | Renders via `<Markdown>`; same components map |
| `components/article-content/article-components.tsx` | Renamed from `mdx-components.tsx`; tag → component map |
| `components/editor/wysiwyg/bridge/to-doc.ts` | `markdownToDoc` (TanStack AST → TipTap JSON, rawBlock fallback) |
| `components/editor/wysiwyg/bridge/to-markdown.ts` | `docToMarkdown` (TipTap JSON → TanStack Markdown) |
| `components/editor/wysiwyg/save-guard.ts` | `checkSave` |
| `components/editor/wysiwyg/code-highlight.ts` | ProseMirror decoration plugin using `codeTokens` |
| `components/editor/wysiwyg/callout-block.tsx`, `youtube-block.tsx`, `raw-block.tsx` | New node views |
| `components/editor/save-guard-panel.tsx` | Red "Save stopped" panel (mockup board 3) |
| `components/editor/source-lint.ts` | CodeMirror linter for unknown components |
| `tests/**` | Vitest unit tests, fixtures, parity snapshots |

---

### Task 1: Tooling, dependencies, baseline snapshots and fixtures

**Files:**
- Create: `vitest.config.ts`, `scripts/parity.ts`, `scripts/export-fixtures.ts`, `tests/parity/snapshots/*.html`, `tests/fixtures/posts/*.md`, `tests/smoke.test.ts`
- Modify: `package.json` (scripts `test`, `parity:capture`, `parity:check`; deps)

**Interfaces:**
- Produces: `npm test` (vitest run); `npm run parity:capture` / `npm run parity:check` (needs `npm run dev` on :3000); fixtures `tests/fixtures/posts/<slug>.md` (exact `posts.content`) and `tests/fixtures/posts/index.json` (`[{ slug, type, url }]`).

- [ ] **Step 1:** `npm i -E @tanstack/markdown@1.0.0 @tanstack/highlight@1.1.0 @codemirror/lint` and `npm i -D -E vitest`. Add `"test": "vitest run"`. Create `vitest.config.ts` (node environment, alias `@` → `path.resolve(__dirname)`, include `tests/**/*.test.ts`).
- [ ] **Step 2:** Write `tests/smoke.test.ts`: it imports `parseMarkdown` from `@tanstack/markdown/parser` and asserts `parseMarkdown('# a').children[0].type === 'heading'`. Run `npm test`. Expected: 1 passed.
- [ ] **Step 3:** Write `scripts/export-fixtures.ts` (run: `node --env-file=.env.local scripts/export-fixtures.ts`). It reads `id, slug, content` plus the primary tag via the `posts`/`posts_tags`/`tags` join used in `repositories/gist/index.ts`, writes one `.md` per post, and writes `index.json` with `url = /<type lowercased>/<slug>`. Exclude `Beep` posts from `index.json` URLs, because Beep pages 404 (`app/[type]/[slug]/page.tsx`); still export their `.md`. Run it. Expected: 23 `.md` files.
- [ ] **Step 4:** Write `scripts/parity.ts`, which works in two modes.
  - **`capture`:** for each URL in `index.json`, GET `http://localhost:3000<url>`, extract the outer HTML of `<article id="article">…</article>`, normalize it and save it to `tests/parity/snapshots/<slug>.html`.
  - **`check`:** normalizes the same way, compares, prints a 200-character window around the first difference for each failing post, and exits 1 on any mismatch.
  - **Normalization:**
    - drop `<link rel="preload"…>`
    - replace the inner content of every `<pre>` with its text content (code token markup is allowed to differ)
    - strip `class`, `style` and `data-*` attributes from `<pre>` and `<code>`
    - collapse whitespace between tags
    - remove trailing whitespace inside the code text
- [ ] **Step 5:** With the current MDX pipeline running (`npm run dev`), run `npm run parity:capture`, then `npm run parity:check`. Expected: one snapshot per non-Beep post; check passes against itself.
- [ ] **Step 6: Commit** `chore: add vitest, TanStack deps, parity snapshots and post fixtures`.

### Task 2: Legacy converter

**Files:**
- Create: `lib/markdown/legacy.ts`, `tests/markdown/legacy.test.ts`

**Interfaces:**
- Produces: `convertLegacyMarkdown(source: string): { content: string; changed: boolean; unconvertible: string[] }`. It is pure, idempotent and has no imports. `unconvertible` holds the offending source lines.

- [ ] **Step 1: Write failing tests** (`legacy.test.ts`). Each `it` names its case:
  - `"<br /> line ends become backslash breaks"`: `'a,<br />\nb'` → `'a,\\\nb'`; also `<br>` and `<br/>`.
  - `"two-space hard breaks become backslash"`: `'one  \ntwo'` → `'one\\\ntwo'`; a line ending in two spaces before a blank line is left alone.
  - `"lazy blockquote continuation gets > prefixes"`: `'> *a  \nb  \nc*\n\nnext'` → `'> *a\\\n> b\\\n> c*\n\nnext'`.
  - `"AppleMusic JSX becomes a comment component"`: `'<AppleMusic url="https://embed.music.apple.com/id/album/x/1?i=2" />'` → `'<!-- ::apple-music url="https://embed.music.apple.com/id/album/x/1?i=2" -->'`; the `title` attribute is kept when present.
  - `"YouTube and Envelope JSX convert"`: `<YouTube id="abc" title="T" />` → `<!-- ::youtube id="abc" title="T" -->`. For Envelope, a JSX `text` holding `&quot;` → `<!-- ::envelope text="…" -->` with the value re-encoded per the attribute rules.
  - `"Callout JSX becomes a GitHub alert"`: `'<Callout type="warn">\nBe careful.\n</Callout>'` → `'> [!WARNING]\n> Be careful.'`. Map `note`→`NOTE`, `tip`→`TIP`, `warn`→`WARNING`.
  - `"leaves fenced code alone"`: a ```` ```html ```` fence containing `<br />`, `<AppleMusic …/>` and a line with two trailing spaces is unchanged; so are inline code spans.
  - `"reports unknown JSX and raw HTML"`: `'<Spotify id="x" />'` and `'<div>hi</div>'` → `unconvertible` contains those lines and `content` is unchanged for them.
  - `"is idempotent"`: `convert(convert(x).content).content === convert(x).content` for every fixture in `tests/fixtures/posts/`.
  - `"changes exactly the four expected fixtures"`: across the fixtures, `changed === true` only for `the-astral-omen`, `the-weight-of-silence`, `21-guns` and `hiduplah-dengan-tenang`, and `unconvertible` is empty for all of them.
- [ ] **Step 2:** `npm test -- legacy`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement** `convertLegacyMarkdown` in `lib/markdown/legacy.ts`. Work line by line, tracking fenced-code state (the fence char and length per CommonMark). Mask inline code spans before applying the regexes. Duplicate the encode function from `attributes.ts` here, since this file must stay import-free; Task 3 has a test asserting both encoders give the same output.
- [ ] **Step 4:** `npm test -- legacy`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(markdown): legacy MDX-to-TanStack syntax converter`.

### Task 3: Shared Markdown config, extensions and highlighter

**Files:**
- Create: `lib/markdown/attributes.ts`, `lib/markdown/extensions.ts`, `lib/markdown/highlight.ts`, `lib/markdown/config.ts`, `scripts/gen-code-theme.ts`, `app/code-theme.css`, `tests/markdown/config.test.ts`, `tests/markdown/attributes.test.ts`
- Modify: `app/globals.css` (`@import "./code-theme.css";`)

**Interfaces:**
- Consumes: `getSlug` (`lib/get-slug.ts`).
- Produces:
  - `encodeAttribute(value: string): string`, `decodeAttribute(value: string): string`
  - `ARTICLE_COMPONENTS = { "apple-music": "md-apple-music", youtube: "md-youtube", envelope: "md-envelope" } as const` — component name → emitted tag
  - The emitted tags `"md-mermaid"` (props `chart`, `height?`), `"md-callout"` (prop `type: "note" | "tip" | "warn"`, children), `"md-apple-music"` (`url`, `title?`), `"md-youtube"` (`id`, `title?`), `"md-envelope"` (`text`). Unknown component names → `tagName: "md-unknown"` (props `name`).
  - `blockquoteBoundaryExtension(): MarkdownExtension`, `mermaidExtension(): MarkdownExtension`, `articleComponentsExtension(): MarkdownExtension` (wraps `commentComponentsExtension({ transformComponent })` with decoding), `calloutComponentExtension(): MarkdownExtension` (a `transformDocument` that turns `callout` nodes into `md-callout` component nodes)
  - `highlighter` (`createHighlighter` with the registered languages), `normalizeLang(lang?: string): string`, `highlightCode: CodeHighlighter` (the `createTanStackMarkdownHighlighter` output, alias-normalized), `codeTokens(code: string, lang?: string): Array<{ value: string; className?: string }>`
  - `parseOptions: ParseOptions`, `renderOptions: RenderOptions` (`parseOptions` + `highlighter: highlightCode`), `parseArticle(source: string): MarkdownDocument`

- [ ] **Step 1: Write failing tests.**
  - `attributes.test.ts`: `decodeAttribute(encodeAttribute(s)) === s` for `'He said "hi" & left\nnext'`, `'a --> b'` and `''`. The encoded value contains no `"`, newline or `-->`. Also assert that `legacy.ts`'s internal encoder output matches by converting an Envelope JSX case.
  - `config.test.ts`:
    - `"separate quotes stay separate"`: `parseArticle('> a\n\n> b').children` has 2 `blockquote` nodes. `'> a\n> b'` gives 1. `'> [!TIP]\n> x'` gives a `component` node with `tagName === 'md-callout'` and `properties.type === 'tip'`.
    - `"callout kinds map"`: NOTE/IMPORTANT → note, TIP → tip, WARNING/CAUTION → warn.
    - `"comment components map to tags with decoded props"`: `<!-- ::apple-music url="u" -->` → `{ type: 'component', tagName: 'md-apple-music', properties: { url: 'u' } }`. Envelope `text` is decoded. `::spotify` → `md-unknown`.
    - `"mermaid fence becomes md-mermaid with height"`: ```` ```mermaid height=520\ngraph TD\n``` ```` → `tagName 'md-mermaid'`, `properties { chart: 'graph TD', height: '520' }`.
    - `"heading ids use getSlug"`: `### Masalah bagi para *over thinker* akut` → id `masalah-bagi-para-over-thinker-akut`.
    - `"raw HTML is not rendered"`: `renderHtml('<b>x</b>', renderOptions)` contains `&lt;b&gt;`.
    - `"aliases highlight"`: `highlightCode('const a', 'javascript')` and `highlightCode('echo', 'bash')` contain `th-token`.
- [ ] **Step 2:** `npm test -- markdown`. Expected: FAIL.
- [ ] **Step 3: Implement** the modules.
  - The blockquote extension's `parseBlock` consumes consecutive lines matching `/^ {0,3}>/`, stops at a blank or non-`>` line, and returns `{ type: 'blockquote', children: context.parseBlocks(stripped) }`. It returns `undefined` when the first line is `> [!KIND]`, so the callouts extension handles that case. Put the callouts extension **before** it in the extensions array.
  - Mermaid is a `transformDocument` that recurses into children. Parse `height` with the same regex as `components/article-content/remark-mermaid.ts`.
  - `scripts/gen-code-theme.ts` writes `createThemeCss({ light: githubLightTheme, dark: githubDarkTheme, darkSelector: '.dark', codeBlockSelector: 'pre.tm-code' })` to `app/code-theme.css`, minus any `--th-background`/`background` declarations, because code blocks keep `bg-card`.
- [ ] **Step 4:** `npm test`. Expected: PASS. Then run `node scripts/gen-code-theme.ts` and confirm the CSS file is written.
- [ ] **Step 5: Commit** `feat(markdown): shared TanStack config, extensions and highlighter`.

### Task 4: Legacy read shim and content filename

**Files:**
- Modify: `repositories/gist/index.ts` (`toGistShape`, and any list mapper that reads `row.content`), `lib/gist-file.ts`
- Test: `tests/markdown/gist-file.test.ts`

**Interfaces:**
- Consumes: `convertLegacyMarkdown` (Task 2).
- Produces: every `content` returned by the repository has passed through `convertLegacyMarkdown(...).content`. `CONTENT_FILENAME = "index.md"`; `getContentFile` accepts `index.md`, then `index.mdx`.

- [ ] **Step 1: Test** `gist-file.test.ts`: `getContentFile({ 'index.mdx': f })` returns it; `getContentFile({ 'index.md': g, 'index.mdx': f })` returns `g`; `CONTENT_FILENAME === 'index.md'`.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement. In `toGistShape`, wrap `row.content` as `convertLegacyMarkdown(row.content).content`. Add a comment marking it `LEGACY SHIM — remove after production migration (spec §6)`. Update the doc comment in `lib/gist-file.ts`. Writes are unchanged.
- [ ] **Step 4:** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(content): legacy read shim and index.md content key`.

### Task 5: Article rendering on TanStack Markdown

**Files:**
- Modify: `components/article-content/index.tsx`, `app/globals.css` (code block rules)
- Rename: `components/article-content/mdx-components.tsx` → `article-components.tsx`
- Delete: `components/article-content/remark-mermaid.ts`

**Interfaces:**
- Consumes: `parseArticle`, `renderOptions` (Task 3); the shim (Task 4).
- Produces: `ArticleContentUncached({ content })` and the default `ArticleContent`, with unchanged signatures.

- [ ] **Step 1:** Replace `evaluate()` with `<Markdown components={components} {...renderOptions}>{parseArticle(content)}</Markdown>` (from `@tanstack/markdown/react`).
  - Port every entry of the current components map with identical output: `a`, `p`, `h1`–`h4` promotion with the `###` link/id rule, `ul`, `ol`, `blockquote`, `table`, `img`.
  - Map the custom tags: `md-mermaid` → `Mermaid` (`chart`, `height`), `md-callout` → `Callout` (`type`), `md-apple-music` → `AppleMusic`, `md-youtube` → `YouTube`, `md-envelope` → `Envelope`, `md-unknown` → `() => null`.
  - The `code` component tells inline from block by the presence of `dangerouslySetInnerHTML` / a `language-` class; only inline code gets `prose-code`.
  - The `h3` link uses the node's `id` prop when present; fall back to `getSlug(toText(children))`.
- [ ] **Step 2: CSS.** Keep the existing `pre` base rule. Replace the `span[data-line]` and `code[data-theme]` rules with `pre.tm-code { padding-inline: 0.5rem }` (matching today's `px-2` per line) and token colours from `code-theme.css`. Remove the Shiki rules only after Task 10 also stops using them.
- [ ] **Step 3: Verify** with `npm run dev`, then `npm run parity:check`. Expected: all posts pass. If one fails, fix the component mapping, not the snapshot.
- [ ] **Step 4:** Run `npm run lint` and `npm run build`. Expected: both succeed.
- [ ] **Step 5: Commit** `feat(article): render posts with TanStack Markdown and Highlight`.

### Task 6: Top-level block splitter

**Files:**
- Create: `lib/markdown/blocks.ts`, `tests/markdown/blocks.test.ts`

**Interfaces:**
- Produces: `splitTopLevelBlocks(source: string): Array<{ source: string; node: BlockNode }>`. Each `source` is the exact text of that block, without the surrounding blank lines. `parseArticle(b.source).children[0]` deep-equals `b.node`.

- [ ] **Step 1: Tests:**
  - `"splits a mixed post"`: heading, paragraph, comment component, fence and quote yield 5 blocks, each with the exact text.
  - `"every fixture's blocks rejoin to the same AST"`: `parseArticle(blocks.map(b => b.source).join('\n\n'))` deep-equals `parseArticle(source)` for all fixtures.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3: Implement.** Use a recording extension placed first in the extensions array. Its `parseBlock` pushes `context.index` (a line index) when the parse depth is the top level, then returns `undefined`. Top level means `context.lines` is the document's own lines array (compare by identity). Slice the source lines between consecutive starts and trim blank lines.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5: Commit** `feat(markdown): top-level block splitter with exact source spans`.

### Task 7: Bridge — Markdown → TipTap JSON

**Files:**
- Create: `components/editor/wysiwyg/bridge/to-doc.ts`, `components/editor/wysiwyg/bridge/schema-names.ts`, `tests/editor/to-doc.test.ts`

**Interfaces:**
- Consumes: `splitTopLevelBlocks`, `parseArticle`.
- Produces:
  - `markdownToDoc(source: string): { doc: JSONContent; blocks: LoadedBlock[] }`, where `LoadedBlock = { source: string; node: BlockNode; raw: boolean }` and `doc.content[i]` corresponds to `blocks[i]`. A new or empty source gives an empty level-2 heading.
  - Node and mark names in `schema-names.ts`: existing `heading` (levels 2–4), `paragraph`, `bulletList`, `orderedList` (`start`), `listItem`, `blockquote`, `codeBlock` (`language`), `horizontalRule`, `table`, `tableRow`, `tableHeader`, `tableCell`, `image` (inline; `src`, `alt`, `title`), `hardBreak`, `mermaidBlock` (`code`, `height`), `envelopeBlock` (`text`), `appleMusicBlock` (`url`, `title`). New: `youtubeBlock` (`id`, `title`), `calloutBlock` (`kind: "note" | "tip" | "warn"`, content `block+`), `rawBlock` (`source`). Marks: `bold`, `italic`, `strike`, `code`, `link` (`href`, `title`).
- Fidelity: a block whose `docToMarkdown` output (Task 8) does not re-parse to an equal AST becomes `rawBlock`. Task 7 ships with an injectable `fidelity?: (block, json) => boolean` parameter defaulting to `() => true`; Task 8 wires in the real check.

- [ ] **Step 1: Tests:**
  - `"maps every node type"`: one `it` per node type, each with a minimal Markdown source and its expected JSON.
  - `"embeds become blocks"`: apple-music, youtube and envelope (decoded text), mermaid with height, and a TIP callout with a nested paragraph.
  - `"unknown component becomes rawBlock"`: the `::spotify` line gives `{ type: 'rawBlock', attrs: { source: '<!-- ::spotify id="x" -->' } }`.
  - `"level-1 heading becomes rawBlock"`.
  - `"every fixture opens"`: `markdownToDoc(fixture)` doesn't throw for any fixture, and the first node is a level-2 heading.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3: Implement** a recursive mapper that handles every TanStack `BlockNode`/`InlineNode` type in `@tanstack/markdown`'s `types.d.ts`. Anything unmapped at the top level becomes `rawBlock`. Inline `html`, footnotes and `inlineComponent` make the whole top-level block raw.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5: Commit** `feat(editor): TanStack AST to TipTap JSON bridge`.

### Task 8: Bridge — TipTap JSON → Markdown, plus round-trip

**Files:**
- Create: `components/editor/wysiwyg/bridge/to-markdown.ts`, `tests/editor/round-trip.test.ts`
- Modify: `components/editor/wysiwyg/bridge/to-doc.ts` (wire the real fidelity check)

**Interfaces:**
- Produces:
  - `docToMarkdown(doc: JSONContent): string`. Blocks are separated by `\n\n`; `rawBlock` is written verbatim. It throws `UnserializableError(message)` for shapes Markdown can't hold: a table cell with more than one paragraph, or a hard break inside a table cell. The messages are the current ones from `detectLossySerialization`.
  - `blockToMarkdown(node: JSONContent): string`.
  - Formats: `-` bullets, `1.` ordered with `start`, `*em*`, `**strong**`, `~~strike~~`, backtick spans sized to their content, fences one backtick longer than the longest run inside (minimum 3), mermaid meta `height=N`, `>` on every quote line, `> [!KIND]` callouts, comment components via `encodeAttribute`, `\` hard breaks, `[text](href "title")` links, `![alt](src "title")` images, GFM tables with alignment.

- [ ] **Step 1: Tests (`round-trip.test.ts`):**
  - `"every fixture round-trips at AST level"`: for each fixture, `parseArticle(docToMarkdown(markdownToDoc(src).doc))` deep-equals `parseArticle(src)`.
  - `"no fixture gains raw blocks"`: `markdownToDoc(fixture).blocks.every(b => !b.raw)`, with the fixtures already passed through `convertLegacyMarkdown`.
  - `"envelope attribute with quotes, & and newline round-trips"`.
  - `"fence containing triple backticks"`: the serializer uses a 4-backtick fence and the value is unchanged.
  - `"link whose text equals its href is never <url>"`.
  - `"table cell with two paragraphs throws UnserializableError"`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3: Implement** `docToMarkdown`, then replace the `fidelity` default in `to-doc.ts` with: `deepEqual(parseArticle(blockToMarkdown(json)).children[0], block.node)`.
- [ ] **Step 4:** `npm test`. Expected: PASS (all suites).
- [ ] **Step 5: Commit** `feat(editor): TipTap JSON to TanStack Markdown serializer`.

### Task 9: Save guard

**Files:**
- Create: `components/editor/wysiwyg/save-guard.ts`, `tests/editor/save-guard.test.ts`

**Interfaces:**
- Consumes: `markdownToDoc`, `docToMarkdown`, `blockToMarkdown`, `LoadedBlock`.
- Produces:
  - `checkSave(args: { loaded: LoadedBlock[]; loadedDoc: JSONContent[]; doc: JSONContent }): SaveCheck`
  - `type SaveCheck = { ok: true; markdown: string } | { ok: false; reason: "lossy" | "unserializable"; blockIndex: number; loadedSource: string | null; savingSource: string | null; message: string }`
  - `loadedDoc` is the top-level JSON nodes captured at load.
  - Check A: `markdownToDoc(markdown).doc` deep-equals `doc`, ignoring `rawBlock` vs structured equivalence.
  - Check B: every top-level node that still deep-equals its `loadedDoc[i]` counterpart serializes to the same AST as `loaded[i].node`.
  - On failure, report the first differing top-level index. `UnserializableError` maps to `reason: "unserializable"`.

- [ ] **Step 1: Tests:**
  - `"unchanged doc passes and returns markdown"`.
  - `"user edit passes"`: change one paragraph's text, still ok.
  - `"rawBlock source survives"`: edit the paragraph next to a rawBlock; the markdown contains the raw source byte-exact.
  - `"serializer that drops an embed is caught"`: inject a faulty serializer through an optional `serialize` parameter that drops `appleMusicBlock`. Expect `{ ok: false, reason: 'lossy', blockIndex: <its index>, savingSource: null }`.
  - `"formatting-only differences pass"`: load `_x_` and `* item`, save unchanged, ok.
  - `"unserializable table reports"`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3: Implement.** Add an optional `serialize = docToMarkdown` parameter so the fault-injection test works.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5: Commit** `feat(editor): AST-level save guard`.

### Task 10: Wire the editor onto the bridge

**Files:**
- Modify: `components/editor/wysiwyg/extensions.ts`, `index.tsx`, `apple-music-block.tsx`, `envelope-block.tsx`, `mermaid-block.tsx`, `image-view.tsx`, `image-upload.ts` (only if it references `tiptap-markdown`), `toolbar.tsx`, `app/globals.css`
- Create: `components/editor/wysiwyg/callout-block.tsx`, `youtube-block.tsx`, `raw-block.tsx`, `code-highlight.ts`, `tests/editor/paste.test.ts`
- Delete: `components/editor/wysiwyg/round-trip.ts`

**Interfaces:**
- Consumes: `markdownToDoc`, `checkSave`, `codeTokens`, the schema names (Task 7).
- Produces: `WysiwygEditorProps` minus `onRoundTripFail`. The `flushRef` result becomes `WysiwygFlushResult = { ok: true; markdown: string } | { ok: false; error: string; guard?: Extract<SaveCheck, { ok: false }> }`.

- [ ] **Step 1: Test** `paste.test.ts`: `markdownToDoc('**b** and <!-- ::youtube id="x" -->').doc` yields `bold` and `youtubeBlock`. This pins the paste path.
- [ ] **Step 2: Extensions.**
  - Remove `Markdown` (tiptap-markdown), `CodeBlockShiki` and `MdxSafeLink`'s markdown storage (keep plain `Link`).
  - Re-enable StarterKit `codeBlock` with `code-highlight.ts`, a plugin decorating each `codeBlock` from `codeTokens(text, node.attrs.language)` using the `th-token th-<className>` classes.
  - Add `CalloutBlock` (content `block+`, a kind selector in its node view, styled like `Callout`), `YoutubeBlock` (atom, edits `id`/`title`) and `RawBlock` (atom, locked, shows source in monospace with the label "Kept exactly as written").
  - Delete every `addStorage().markdown` from the block nodes.
  - Keep `TableEnterGuard`, `EnforceTitleLevel`, `TitleDocument`, `Placeholder`, `ImageUpload` and `StrikeShortcut`.
  - Add a `handlePaste` that converts `text/plain` Markdown with `markdownToDoc` and inserts the result.
- [ ] **Step 3: `index.tsx`.**
  - At mount, set `content` to `markdownToDoc(value).doc` and keep `blocks` and `loadedDoc` in refs.
  - `onUpdate`'s debounce and the flush serialize through `checkSave`. On `ok: false`, don't call `onChange`: flush returns the guard, and `onUpdate` calls `onSerializeError(message)`.
  - Delete `detectLossySerialization`, `getMarkdownSafe` and the round-trip `onCreate`, but keep the `blob:` pending-upload check as a pre-check in flush.
  - Find and fix the root cause of `Runtime RangeError: Applying a mismatched transaction`, which reproduces on `/editor/fe6fe05ced6e4add8a016b28fd48550d`. Note the cause in the commit message.
- [ ] **Step 4: Toolbar.** Add a Callout button (lucide `Lightbulb`, inserts a TIP callout with an empty paragraph) and a YouTube button (lucide `Youtube`, prompts for an id or URL and extracts the id with the parser `components/youtube-embed` uses, if it has one).
- [ ] **Step 5: CSS.** Remove the `.dark .wysiwyg .tiptap .shiki` rules. Give Write-mode code blocks the same `pre` padding as the article.
- [ ] **Step 6:** Run `npm test`, `npm run lint` and `npm run build`. Expected: all pass.
- [ ] **Step 7: Commit** `feat(editor): Write mode on the TanStack bridge; callout, youtube and raw blocks`.

### Task 11: Editor screen — save guard panel, safe dot, Source lint

**Files:**
- Create: `components/editor/save-guard-panel.tsx`, `components/editor/source-lint.ts`, `tests/editor/source-lint.test.ts`
- Modify: `components/editor/editor-screen.tsx`, `components/editor/markdown-editor.tsx`

**Interfaces:**
- Consumes: the `WysiwygFlushResult.guard` (Task 10), `parseArticle`, `ARTICLE_COMPONENTS`.
- Produces:
  - `SaveGuardPanel({ guard, onRestore, onKeepEditing, onForceSave })`
  - `unknownComponentDiagnostics(source: string): Array<{ line: number; name: string }>`
  - `sourceLinter` (a CodeMirror `linter` extension)

- [ ] **Step 1: Test** `source-lint.test.ts`: `unknownComponentDiagnostics('a\n\n<!-- ::spotify id="x" -->')` → `[{ line: 3, name: 'spotify' }]`. Known names and fenced lines give `[]`.
- [ ] **Step 2: `editor-screen.tsx`.**
  - Remove `roundTripBroken`, `forceWriteRef`, the "would rewrite" banner and `onRoundTripFail`.
  - When the flush returns a `guard`, render `SaveGuardPanel` with this copy, exactly as in mockup board 3:
    - title: "Save stopped — nothing was written"
    - body: "Saving would change what readers see in 1 place. The editor compares what it's about to save against what it loaded, block by block, using the same parser as the live site."
    - column labels: "Loaded · block N" and "About to save · block N"; `(missing)` when the source is null
    - buttons: "Restore block & save" (replace that top-level node with `loadedDoc[i]`, then save again), "Keep editing" (dismiss), "I deleted it on purpose — save" (save `docToMarkdown(doc)` without check B)
  - Add the header indicator "Round-trip safe" (a green dot) when the editor is in Write mode and the last check passed.
- [ ] **Step 3: `markdown-editor.tsx`.** Add `sourceLinter`. Its message is "Unknown component ::NAME — kept exactly as written and shown as a locked block in Write mode. Known: apple-music, youtube, envelope."
- [ ] **Step 4:** Run `npm test`, `npm run lint` and `npm run build`. Expected: all pass.
- [ ] **Step 5: Commit** `feat(editor): save guard panel, safe indicator, Source lint`.

### Task 12: Content migration script

**Files:**
- Create: `scripts/migrate-content.ts`

**Interfaces:**
- Consumes: `convertLegacyMarkdown` (imported by relative path `../lib/markdown/legacy.ts`; the file has no imports).
- Produces: `node --env-file=<env> scripts/migrate-content.ts [--apply]`. Without `--apply` it is a dry run.

- [ ] **Step 1: Implement.**
  - Select `id, slug, title, content` from `posts` and convert each one.
  - Abort with exit code 1 if any `unconvertible` lines exist, or if the changed set isn't exactly `{the-astral-omen, the-weight-of-silence, 21-guns, hiduplah-dengan-tenang}`. The set check is skipped when zero posts change, so a re-run after migration prints "0 to convert" and exits 0.
  - The dry run prints a unified line diff per changed post.
  - `--apply` does one transaction per post: `insert into post_revisions (post_id, title, content) values ($1, $2, <old content>)`, then `update posts set content = $2 where id = $1`. Recompute `reading_time_minutes` with the same formula as `lib/reading-time.ts` (inline it) only when it differs. No other columns are touched, `updated_at` included.
  - Print the `DATABASE_URL` host before running and require `--apply` to be accompanied by `--confirm-host=<host>`.
- [ ] **Step 2: Verify** on a Neon branch.
  - Create a branch (`neon branches create --name migrate-tanstack` or the Neon MCP), pull its URL into `.env.migrate.local`, and run a dry run: expect 4 diffs.
  - Run `--apply` against the branch, then re-run the dry run: expect "0 to convert".
  - Point `npm run dev` at the branch and run `npm run parity:check`: expect it to pass.
- [ ] **Step 3: Commit** `feat(scripts): one-off TanStack content migration`.
- [ ] **Step 4: STOP.** Report the branch results to the user. Production `--apply` waits for their approval (Global Constraints).

### Task 13: Remove MDX-era dependencies; full verification

**Files:**
- Modify: `package.json`, `package-lock.json`, `app/globals.css` (leftover Shiki/pretty-code rules), and any file still importing a removed package
- Update memory note `blog-editor-architecture` (outside the repo) to describe the new bridge, the save guard and the removed constraints

- [ ] **Step 1:** `npm uninstall @mdx-js/mdx remark-gfm rehype-pretty-code unist-util-visit shiki tiptap-extension-code-block-shiki tiptap-markdown`. Then `grep -rn "mdx\|shiki\|tiptap-markdown\|rehype\|remark" app components lib repositories scripts` should print nothing except the shim comment and the legacy converter's JSX handling.
- [ ] **Step 2:** Run `npm test`, `npm run lint` and `npm run build`. Expected: all pass. Then, with `npm run dev`, run `npm run parity:check`. Expected: all pass.
- [ ] **Step 3: E2E in Claude in Chrome** (dev server, Browser 1). Record `editor_e2e.gif` and check each item:
  - every post's `/editor/<id>` opens in Write mode, with no banner and no dev-overlay issues;
  - `hiduplah-dengan-tenang` shows an Apple Music block; edit its URL, save the draft and confirm the stored Markdown in Source;
  - insert and save one of each: callout, YouTube, envelope (text with `"` and a newline), mermaid with height, image, table, code block, all of which render correctly in Preview;
  - paste Markdown and check it becomes structure;
  - add `<!-- ::spotify id="x" -->` in Source: the warning appears, Write shows a locked block, and saving keeps the line;
  - temporarily inject the save-guard fault (a dev-only query flag `?guardFault=1` read by `index.tsx`, removed before commit) and confirm the red panel shows and nothing is written (`updated_at` unchanged);
  - Preview matches the public page for 3 posts;
  - code blocks render in both light and dark themes.
- [ ] **Step 4: Commit** `chore: remove MDX, Shiki and tiptap-markdown`.

### Task 14 (after production migration is approved and run): Remove the shim

- [ ] **Step 1:** Run `node --env-file=.env.local scripts/migrate-content.ts` against production. Expected: "0 to convert".
- [ ] **Step 2:** Remove the `convertLegacyMarkdown` call from `repositories/gist/index.ts`. Keep `legacy.ts` and its tests, since the converter is still useful for pastes of old content. Run `npm test`, `npm run build`, and `npm run parity:check` with dev on production data. Expected: all pass.
- [ ] **Step 3: Commit** `chore(content): remove legacy read shim`.

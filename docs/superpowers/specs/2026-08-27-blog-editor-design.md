# Blog Editor — Design Spec

**Date:** 2026-08-27
**Status:** Approved (design discussed and accepted in-session)

## Goal

A local, dev-only content editor for the blog: a markdown/MDX editor with a
side-by-side preview that renders through the *exact* production article
pipeline, storing articles as GitHub gists (the site's existing storage), and
triggering a Vercel production rebuild on publish (the site is fully statically
generated).

## Non-goals

- No editor in production. The routes and actions 404 outside `npm run dev`.
- No new rendering pipeline. The preview reuses `components/article-content`
  as-is; zero preview drift by construction.
- No auth system, no database, no test runner.
- No deployment-status polling inside the editor (the Vercel dashboard covers
  that).

## Context (existing system)

- Articles are gists owned by `config.github.username`, fetched with Octokit
  (`lib/octokit.ts`, auth via `GITHUB_PAT` env var).
- Gist **description** encodes metadata as a ` - `-delimited string parsed by
  `lib/parse-entry.ts`: e.g. `Blog - Title - Description`,
  `Sharing - <langTag> - Title - Description`. Types: Blog, Poem, Sharing,
  Beep, Literature.
- Article body is the gist file **`index.md`** (see
  `app/[type]/[slug]/page.tsx`).
- Rendering (`components/article-content/index.tsx`): `@mdx-js/mdx` `evaluate`
  with `remark-gfm`, custom `remarkMermaid`, `rehype-pretty-code` (shiki,
  `github-dark-dimmed` / `github-light`), and custom component mappings to
  `prose-*` classes, including heading promotion (`##` → `h1`, `###` → `h2`
  with anchor links, `####` → `h3`).
- The public site caches gist lists/details for 12h (`"use cache"` +
  `cacheTag("gists")` in `repositories/gist/index.ts`).
- Everything public is statically generated (`generateStaticParams`, sitemap,
  RSS feed, llms.txt), so production only reflects gist changes after a
  rebuild or cache expiry.

## Architecture

### Routes (all dev-gated)

Every editor page and server action first checks
`process.env.NODE_ENV !== "development"` and returns `notFound()` (pages) or
throws (actions). Production builds ship no reachable editor surface.

- **`/editor`** — gist list: drafts (secret gists) + published (public gists),
  fetched fresh (uncached), newest first, with type/title metadata parsed from
  descriptions. "New article" button. "Rebuild site" button (manual deploy
  hook trigger for out-of-band gist edits).
- **`/editor/new`** — editor screen with empty state.
- **`/editor/[gistId]`** — editor screen loaded from an existing gist
  (`index.md` content + parsed description metadata).

### Editor screen

```
┌─ Type ▾ ─ Title ──── Description ── [lang] ─┐  ← metadata bar
├──────────────────────┬──────────────────────┤
│  CodeMirror          │  <ArticleContent />  │
│  (raw MDX of         │  exact render,       │
│   index.md)          │  debounced ~600ms    │
├──────────────────────┴──────────────────────┤
│  MDX compile errors surface here inline     │
└─────────────────────────────────────────────┘
        [Save draft]  [Publish]  (+ status)
```

- **Editor pane:** CodeMirror 6 via `@uiw/react-codemirror` +
  `@codemirror/lang-markdown`. Client component in `components/editor/`
  (never `components/ui/`, per repo rules).
- **Preview pane:** debounced (~600ms) call to a `renderPreview(content)`
  server action that runs `<ArticleContent content={...} />` and returns the
  rendered JSX (React 19 server actions can return JSX). Wrapped in the same
  article column constraints (`max-w-3xl`, article spacing) as the real page.
  MDX compile errors are caught and returned as a structured error, shown in
  the preview pane instead of a blank screen; the last good render stays
  visible alongside the error.
- **Metadata bar:** type select (Blog / Poem / Sharing / Beep / Literature;
  Sharing reveals a language-tag field), title, description. Composes the
  ` - `-delimited gist description for `parse-entry.ts`. Shows the derived
  slug (`lib/get-slug.ts`). Validates that title/description fields do not
  contain ` - ` (the delimiter), and that title is non-empty before save.

### Storage layer (`repositories/gist/index.ts` additions)

New exported functions using the existing `octokit` client. The existing
cached `getGistList` / `getGistDetails` are untouched.

- `listAllGistsUncached()` — paginated `gists.list` for the authenticated
  user (includes secret gists), no `"use cache"`. Editor list only.
- `getGistById(id)` — uncached single-gist fetch.
- `createGist({ description, content, isPublic })` — file is always
  `index.md`.
- `updateGist(id, { description, content })` — updates description +
  `index.md`.
- `deleteGist(id)` — used only by the publish-from-draft flow.

### Draft / publish workflow

- **Save draft** → create or update a **secret** gist. Secret gists never
  appear in the public site's `gists.listForUser` call, so drafts are
  invisible by construction. No rebuild triggered.
- **Publish** (new or from draft) → GitHub cannot change gist visibility
  after creation, so publishing a secret draft = create a new **public** gist
  with the same description/content, then delete the secret one (single
  `publishGist` server action; the editor navigates to the new gist id). The
  new gist's fresh `created_at` becomes the publish date — intended.
- **Update published** → `updateGist` on the public gist, then rebuild.

### Cache + rebuild

- After any successful write, the action calls `updateTag("gists")` so the
  local dev site reflects changes immediately.
- **Production rebuild:** a Vercel **Deploy Hook** (created once in the
  dashboard: Project → Settings → Git → Deploy Hooks, branch `main`), stored
  in `.env.local` as `VERCEL_DEPLOY_HOOK_URL`. A `triggerRebuild()` action
  POSTs it. Fired after **publish** and **update-published** writes, and by
  the manual "Rebuild site" button. Not fired for draft saves. Vercel
  de-dupes queued builds from the same hook; the UI just disables the button
  while a request is in flight and confirms "rebuild triggered". If the env
  var is unset, publishing still works and the UI notes that no rebuild was
  triggered.

## Error handling

- Octokit failures (bad PAT, rate limit, network) surface as inline error
  messages on the editor screen; no partial UI state is lost (content stays
  in the client).
- MDX compile errors: caught in `renderPreview`, returned as
  `{ ok: false, error: string }`, rendered in the error strip.
- Publish-from-draft is create-then-delete: if the delete fails after a
  successful create, the action reports it (leftover secret draft is
  harmless; user deletes it manually) rather than attempting rollback.
- Deploy hook failure after a successful gist write: reported as a warning
  ("published, but rebuild trigger failed") with the manual rebuild button as
  the retry path.

## Files

| File | Change |
| --- | --- |
| `app/editor/page.tsx` | new — gist list, dev-gated |
| `app/editor/new/page.tsx` | new — empty editor, dev-gated |
| `app/editor/[gistId]/page.tsx` | new — load + edit existing gist, dev-gated |
| `app/editor/actions.ts` | new — `renderPreview`, `saveDraft`, `publishGist`, `updatePublished`, `triggerRebuild` server actions, each dev-gated |
| `components/editor/*` | new client components: split pane, CodeMirror wrapper, metadata bar, save/publish controls |
| `repositories/gist/index.ts` | add uncached list/get + create/update/delete |
| `package.json` | + `@uiw/react-codemirror`, `@codemirror/lang-markdown` |
| `.env.local` | + `VERCEL_DEPLOY_HOOK_URL` (user creates the hook in Vercel dashboard) |

Nothing public-facing changes. `ArticleContent` is reused unmodified (its
`"use cache"` makes repeated identical previews instant in dev).

## Testing

Manual, in dev, against real gists (drafts are secret, so safe to exercise):

1. New draft → appears in `/editor` list, not on the site.
2. Edit draft, preview shows shiki code blocks, mermaid, headings identical
   to a published article page.
3. Invalid MDX shows the compile error, last good preview retained.
4. Publish draft → public gist exists, secret one deleted, deploy hook fired
   (observe Vercel dashboard), article renders on local site after
   `updateTag`.
5. Edit published article → save → hook fired.
6. `npm run build` + `npm run start` → `/editor` and `/editor/*` return 404;
   build clean.

# Dawn Theme Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recreate Ghost Dawn's UX (cover, featured carousel, calendar-row feed with load-more, Dawn single posts with prev/next + related, tag-style type pages, logo-left header with ⌘K search, Dawn footer) with shadcn on the gist data layer, preserving all SEO surfaces.

**Architecture:** Data layer grows `featured` (a `!` marker on the description's type segment) and `readingTimeMinutes` (raw-content fetch inside the existing cached list). Presentation is rebuilt in `components/` (feed, cover, carousel card, search, nav, footer) with shadcn `command` + `carousel` added via CLI. `ArticleContent` and all `prose-*` styles are untouched (shared with the editor).

**Tech Stack:** Next.js 16 App Router, existing gist repository layer, shadcn (`command`, `carousel` new), lucide-react, next-themes (unchanged), Inter (unchanged).

**Spec:** `docs/superpowers/specs/2026-08-27-dawn-theme-design.md`

## Global Constraints

- No test runner; per task verify `npm run lint && npx tsc --noEmit`; the final task runs `npm run build` + curl checks against the dev server on :3000 (the user's — never kill it, never start another on :3000).
- **NEVER edit `components/ui/`** — new shadcn components arrive ONLY via `npx shadcn@latest add <name>`. Custom components live in `components/<name>/`.
- **NEVER touch** `components/article-content/**`, `components/mermaid/**`, the `prose-*` utilities in `app/globals.css`, or anything under `components/editor/wysiwyg/` (except the one metadata-bar change Task 1 specifies) — these are shared with the editor.
- All existing SEO surfaces (JSON-LD helpers, canonicals, OG images, sitemap, feed, llms, robots) keep working; pages keep exactly one `h1`.
- Featured marker: type segment suffix `!` (`Blog!`). Reading time: `Math.max(1, Math.ceil(words / 275))`.
- Code below is a reference implementation: verify shadcn-generated component APIs (carousel/command) against the files the CLI actually produces in `components/ui/` before using them; adapt and record deviations.
- The site brand accent is the existing `--primary` token — no new colors.
- Commit after each task with the exact message given. Branch: `feat/dawn-theme`.

---

### Task 1: Data layer — featured flag, reading time, editor star

**Files:**
- Modify: `lib/parse-entry.ts`
- Modify: `lib/compose-entry.ts`
- Create: `lib/reading-time.ts`
- Modify: `repositories/gist/index.ts` (the cached `getGistList` only)
- Modify: `components/editor/metadata-bar.tsx` (star toggle)
- Modify: `app/editor/page.tsx` (star in the list rows)

**Interfaces:**
- Consumes: existing `parseEntry`/`composeEntry` shapes, `octokit` list data (`files["index.md"].raw_url`).
- Produces: every parsed `Entry` gains `featured: boolean`; `EntryInput` gains `featured?: boolean`; `getGistList` entries gain `readingTimeMinutes: number | null`; `readingTime(markdown: string): number` default export from `lib/reading-time.ts`. Tasks 2–4 rely on these exact names.

- [ ] **Step 1: `lib/parse-entry.ts`** — add `featured: boolean` to every entry interface, and parse the `!` suffix:

```ts
export default function parseEntry(entry: string): Entry {
  const parts = entry.split(" - ");
  const rawType = parts[0]?.trim() ?? "";
  // A trailing "!" on the type segment marks the entry as featured
  // (e.g. "Blog! - Title - Description"). Absent = not featured, so every
  // existing gist description keeps parsing unchanged.
  const featured = rawType.endsWith("!");
  const type = (featured ? rawType.slice(0, -1) : rawType) as EntryType;
  // ... existing part() helper unchanged; every case's returned object
  // gains `featured` (e.g. { type: "Blog", featured, title: part(1), ... }).
}
```

- [ ] **Step 2: `lib/compose-entry.ts`** — `EntryInput` gains `featured?: boolean`; the first part becomes `type + (featured ? "!" : "")`; the round-trip guard's expectation compares `parsed.featured === Boolean(featured)` alongside the existing field checks.

- [ ] **Step 3: `lib/reading-time.ts`**

```ts
const WORDS_PER_MINUTE = 275; // Ghost's convention

/** Whole minutes, never below 1. */
export default function readingTime(markdown: string): number {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}
```

- [ ] **Step 4: `repositories/gist/index.ts`** — inside `getGistList`, after `_data` is built, enrich concurrently (still within the `"use cache"` scope, so this cost is per-revalidation):

```ts
const enriched = await Promise.all(
  _data.map(async (gist) => {
    // Reading time needs the markdown; the list API exposes raw_url but not
    // content. A failed fetch degrades to null — one bad gist must never
    // take down the whole list.
    let readingTimeMinutes: number | null = null;
    const rawUrl = gist.files?.["index.md"]?.raw_url;
    if (rawUrl) {
      try {
        const response = await fetch(rawUrl);
        if (response.ok) readingTimeMinutes = readingTime(await response.text());
      } catch {}
    }
    return { ...gist, readingTimeMinutes };
  }),
);
```

The subsequent beeps/articles/topic filters operate on `enriched`. Import `readingTime` at top. Do not touch `getGistDetails` or the editor-only helpers.

- [ ] **Step 5: editor star toggle** — in `components/editor/metadata-bar.tsx`, after the type `<select>` add:

```tsx
<Button
  variant="ghost"
  size="icon-sm"
  aria-pressed={Boolean(value.featured)}
  aria-label={value.featured ? "Unmark as featured" : "Mark as featured"}
  onClick={() => set({ featured: !value.featured })}
>
  <Star className={cn(value.featured && "fill-primary text-primary")} />
</Button>
```

(`Star` from lucide-react, `Button` from ui, `cn` from lib/utils.) In `app/editor/page.tsx`'s list rows, render a small filled `Star` icon next to the title when `gist.entry.featured`.

- [ ] **Step 6: Verify** — `npm run lint && npx tsc --noEmit` clean. Type errors from `Entry`/`EntryInput` consumers (editor screen, gist pages) indicate a missed `featured` propagation — `featured` must be optional in `EntryInput` and always-present in parsed `Entry`.

- [ ] **Step 7: Commit** — `feat: featured flag, reading time, editor star toggle`

---

### Task 2: Chrome — shadcn additions, Dawn header, footer, ⌘K search

**Files:**
- Modify: `package.json`/`components/ui/` via `npx shadcn@latest add command carousel`
- Modify: `lib/config.ts` (add `social`)
- Create: `components/search/index.tsx`
- Rewrite: `components/navigation-bar/index.tsx`
- Rewrite: `components/footer/index.tsx`
- Modify: `app/layout.tsx` (footer slot semantics if needed — keep column widths as-is)

**Interfaces:**
- Consumes: `getGistList`, `CONTENT_TOPICS`, shadcn `command` (+ its dialog), `Sheet` (already present), `buttonVariants`.
- Produces: `SiteSearch` client component with props `{ items: SearchItem[] }` where `SearchItem = { title: string; description: string | null; type: string; slug: string }` — renders its own trigger icon button AND the dialog, self-contained. Nav renders it. Footer reads `config.social`.

- [ ] **Step 1:** `npx shadcn@latest add command carousel` — then READ the generated `components/ui/command.tsx` and `components/ui/carousel.tsx` to learn their real exports (base-ui variants may differ from Radix docs). Record the API you found in your report.

- [ ] **Step 2: `lib/config.ts`** — append to the config object (keep everything else byte-identical):

```ts
social: [
  { label: "GitHub", href: `https://github.com/${process.env.GITHUB_USERNAME || "azharizkita"}` },
  { label: "RSS", href: "/feed.xml" },
],
```

- [ ] **Step 3: `components/search/index.tsx`** — client component: nav icon button (lucide `Search`, ghost icon button) + `CommandDialog`; ⌘K/ctrl-K keydown listener toggles; items grouped by `type` (`CommandGroup heading={type}`), each `CommandItem` shows title + muted line-clamped description, `onSelect` → `router.push(\`/${type.toLowerCase()}/${slug}\`)` and close. Empty state via `CommandEmpty` ("No results."). Cleanup the key listener on unmount.

- [ ] **Step 4: Dawn header** — rewrite `components/navigation-bar/index.tsx` as a server component: one row, `flex items-center justify-between gap-4`: left = site name (`Link` to `/`, `font-extrabold tracking-tight`); center (hidden below `md`) = flat links Home + each topic that has entries (`text-sm text-muted-foreground hover:text-foreground transition-colors`); right = `<SiteSearch items={…} />` + mobile burger (client subcomponent `components/navigation-bar/mobile-menu.tsx` using the existing `Sheet`, listing the same links). Fetch `getGistList("articles")` in try/catch exactly like the current nav (layout safety); pass search items derived from it. Delete the dropdown/`navigation-menu` usage (leave `components/ui/navigation-menu.tsx` in place — CLI-owned).

- [ ] **Step 5: Dawn footer** — rewrite `components/footer/index.tsx`:

```tsx
import Link from "next/link";
import { config } from "@/lib/config";

export function Footer() {
  return (
    <footer className="space-y-6 border-t pt-8">
      <p className="prose-small prose-muted">{/* keep the existing blurb text verbatim */}</p>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="prose-muted text-xs">
          {config.site.name} © {new Date().getFullYear()}
        </p>
        <nav aria-label="Social links" className="flex items-center gap-4">
          {config.social.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              {...(item.href.startsWith("http") && { target: "_blank", rel: "noopener" })}
              className="prose-muted text-xs transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
```

- [ ] **Step 6: Verify** — lint + tsc clean; `curl -s localhost:3000/ | grep -o "Search\|GitHub\|RSS"` shows the new chrome (dev server may need a moment to recompile).

- [ ] **Step 7: Commit** — `feat: dawn chrome — logo-left header, command-palette search, dawn footer`

---

### Task 3: Home + type pages — cover, featured carousel, calendar feed with load-more

**Files:**
- Create: `components/feed/index.tsx` (server: `FeedRow`, `Feed`)
- Create: `components/feed/feed-reveal.tsx` (client load-more)
- Create: `components/featured-carousel/index.tsx`
- Rewrite: `app/page.tsx`
- Modify: `app/[type]/page.tsx` (swap the list for the feed; header becomes `#type`)

**Interfaces:**
- Consumes: `getGistList` (now with `readingTimeMinutes` + `entry.featured`), `formatDate`, shadcn `carousel` (API as found in Task 2), `/api/og` endpoint.
- Produces: `Feed({ gists, pageSize? })` server component (sorted by caller); `FeedRow({ gist })`; `FeaturedCarousel({ gists })`.

- [ ] **Step 1: `components/feed/index.tsx`** — the Dawn signature row. Reference:

```tsx
import Link from "next/link";
import { ChevronRight, Star } from "lucide-react";
import type { GistList } from "@/repositories/gist";
import { FeedReveal } from "./feed-reveal";

export function FeedRow({ gist }: { gist: GistList[number] }) {
  const date = gist.created_at ? new Date(gist.created_at) : null;
  const type = gist.entry.type.toLowerCase();
  return (
    <article className="group relative flex items-center gap-4 border-b py-5 last:border-b-0">
      {date && (
        <time
          dateTime={date.toISOString().slice(0, 10)}
          className="w-10 flex-none text-center font-extrabold text-primary"
        >
          <span className="block text-lg leading-none">
            {String(date.getDate()).padStart(2, "0")}
          </span>
          <span className="block text-[10px] tracking-wide uppercase">
            {date.toLocaleString("en-US", { month: "short" })}
          </span>
        </time>
      )}
      <h2 className="min-w-0 flex-1 truncate font-semibold transition-[opacity] group-hover:opacity-80">
        {gist.entry.title}
      </h2>
      <div className="flex flex-none items-center gap-3 transition-transform group-hover:-translate-x-4">
        {gist.entry.featured && (
          <Star aria-label="Featured" className="size-3.5 fill-primary text-primary" />
        )}
        {gist.readingTimeMinutes != null && (
          <span className="prose-muted text-xs whitespace-nowrap">
            {gist.readingTimeMinutes} min read
          </span>
        )}
      </div>
      <ChevronRight
        aria-hidden
        className="absolute right-0 size-4 translate-x-6 text-muted-foreground opacity-0 transition-[transform,opacity] group-hover:translate-x-0 group-hover:opacity-100"
      />
      <Link
        href={`/${type}/${gist.slug}`}
        aria-label={gist.entry.title}
        className="absolute inset-0"
      />
    </article>
  );
}

export function Feed({ gists, pageSize = 5 }: { gists: GistList; pageSize?: number }) {
  if (gists.length === 0) return <p className="prose-muted">No entries yet.</p>;
  return (
    <FeedReveal pageSize={pageSize} total={gists.length}>
      {gists.map((gist) => (
        <FeedRow key={gist.id} gist={gist} />
      ))}
    </FeedReveal>
  );
}
```

- [ ] **Step 2: `components/feed/feed-reveal.tsx`** — client. ALL rows are server-rendered and stay in the DOM (SEO: crawlers see everything); reveal toggles a `hidden` class:

```tsx
"use client";

import { Children, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FeedReveal({
  children,
  pageSize,
  total,
}: {
  children: React.ReactNode;
  pageSize: number;
  total: number;
}) {
  const [visible, setVisible] = useState(pageSize);
  const rows = Children.toArray(children);
  return (
    <div>
      {rows.map((row, index) => (
        <div key={index} className={cn(index >= visible && "hidden")}>
          {row}
        </div>
      ))}
      {visible < total && (
        <div className="flex justify-center pt-8">
          <Button variant="outline" onClick={() => setVisible((v) => v + pageSize)}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
```

(The `border-b last:border-b-0` on rows interacts with the wrapper divs — adapt the divider so the LAST VISIBLE row still reads correctly; e.g. put `border-b` on the wrapper div instead, `[&:last-child]:border-b-0`, or accept the trailing hairline. Note what you chose.)

- [ ] **Step 3: `components/featured-carousel/index.tsx`** — uses the CLI-generated carousel; each item `basis-full md:basis-1/2 lg:basis-1/3`; card = `Link` wrapping a rounded next/image of `/api/og?title=<encoded title>` (1200×630, `alt={title}`, `sizes` matched to the column) with the title beneath (`font-semibold`, two-line clamp) and type label above it (`prose-muted text-xs uppercase`). Include `CarouselPrevious/Next` (hidden when items ≤ visible count is fine to skip — keep arrows always, embla disables them at bounds). Render nothing when `gists.length === 0` (the caller also guards).

- [ ] **Step 4: `app/page.tsx`** — keep the JSON-LD + metadata exactly; new body:

```tsx
const articles = await getGistList("articles");
const sorted = [...articles].sort(byCreatedDesc);
const featured = sorted.filter((gist) => gist.entry.featured);
```

Render: cover section (centered column `mx-auto max-w-[520px] text-center space-y-4 pt-8`: the site icon `app/icon.svg` via `next/image` or inline at 96px, `h1` = site name, `prose-lead` description) → `{featured.length > 0 && <section>` with `h2` "Featured" + `<FeaturedCarousel gists={featured} />` `</section>}` → `<section>` with sr-only `h2` "Latest" + `<Feed gists={sorted} />`. Home shows ALL articles (not 3).

- [ ] **Step 5: `app/[type]/page.tsx`** — keep ALL metadata/JSON-LD/breadcrumbs; replace the header + list: `h1` becomes Dawn tag style — `<h1 className="prose-h1"><span className="text-primary">#</span>{topic.toLowerCase()}</h1>` with the existing `TYPE_LEADS` lead below and a `prose-muted text-xs` entry count; the `<ul>` list is replaced with `<Feed gists={sorted} />`.

- [ ] **Step 6: Verify** — lint/tsc; `curl -s localhost:3000/ | grep -c "min read"` ≥ 1; `curl -s localhost:3000/blog | grep -o "#blog"`.

- [ ] **Step 7: Commit** — `feat: dawn home and type pages — cover, featured carousel, calendar feed`

---

### Task 4: Article single — Dawn header, share, prev/next, related

**Files:**
- Create: `components/share-button/index.tsx`
- Modify: `app/[type]/[slug]/page.tsx`

**Interfaces:**
- Consumes: `getGistDetails`, `getGistList` (topic-filtered), `readingTime` (from content, exact), `FeedRow`, `buttonVariants`.
- Produces: none consumed later.

- [ ] **Step 1: `components/share-button/index.tsx`** — client:

```tsx
"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ShareButton({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Abort (user closed the sheet) or clipboard denial — do nothing.
    }
  };
  return (
    <Button variant="outline" size="sm" onClick={share}>
      {copied ? <Check /> : <Share2 />}
      {copied ? "Link copied" : "Share"}
    </Button>
  );
}
```

- [ ] **Step 2: `app/[type]/[slug]/page.tsx`** — keep every data/SEO block (`generateStaticParams`, `generateMetadata`, JSON-LD, breadcrumbs, `wordCount`). Changes:
  - Compute `minutes = readingTime(content)`; find `siblingsSorted` (existing siblings query but WITHOUT `.slice(0, 4)` yet); locate `self` position in the full same-type chronological list to derive `prevPost`/`nextPost` (older/newer neighbors); related = up to 5 non-self entries (the existing sibling logic, `.slice(0, 5)`).
  - New pre-content header (before `<ArticleContent>`): centered `single-header` — meta row `flex justify-center gap-3 prose-muted text-xs uppercase tracking-wide`: `<time>` formatted date · `{minutes} min read` · `<Link href={/${type}}>{entryType}</Link>`; description as `prose-lead text-center` when present; `<ShareButton title={title} url={url} />` centered. NOTE: the article's visual title comes from the content's own `##` heading (site convention) — do NOT add another `h1` here; the meta header sits above `ArticleContent` and contains no heading element.
  - After `<TimeAgo>`: Dawn single-footer — `flex items-center justify-between border-t pt-8`: prev arrow link (older post: `buttonVariants({variant:"outline", size:"icon"})` + `ArrowLeft`, `aria-label` = its title, absent if none), center `prose-muted text-xs` "Published in {entryType}", next arrow (newer). Then the related section replaces the "More in" list: `h2 prose-h3` "Related" + the 5 `FeedRow`s (plain, no reveal).

- [ ] **Step 3: Verify** — lint/tsc; curl an article page: contains `min read`, `Share`, and exactly one `<h1`.

- [ ] **Step 4: Commit** — `feat: dawn article layout — meta header, share, prev/next, related feed`

---

### Task 5: Verification

**Files:** none.

- [ ] **Step 1:** `npm run lint && npx tsc --noEmit && npm run build` — clean; build route list unchanged for public routes (plus no new dynamic routes).
- [ ] **Step 2:** Against the dev server (:3000, do not kill): home 200 + contains the cover description, `min read`, "Load more" (when >5 entries); `/blog` 200 + `#blog`; an article 200 + `Share` + one `<h1`; `/editor/new` still 200 (editor untouched beyond Task 1's toggle).
- [ ] **Step 3:** SEO surfaces: `curl -s localhost:3000/sitemap.xml | grep -c "<loc>"` equals the pre-change count (compare against `git stash`-free main if needed — or just assert every `/blog|poem|sharing|literature/` slug present); feed.xml + llms.txt still 200 and non-empty; `robots.txt` unchanged.
- [ ] **Step 4:** Report the browser checklist: cover/carousel/feed hover chevron look, mobile burger, ⌘K palette, share button, prev/next, editor star toggle round-trips (star a draft, save, reload, star persists; feed shows the star).

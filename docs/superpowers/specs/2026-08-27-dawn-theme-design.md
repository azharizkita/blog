# Dawn Theme Migration — Design Spec

**Date:** 2026-08-27
**Status:** Approved (design discussed and accepted in-session)
**Source studied:** `/Users/azhari/Downloads/Dawn-main` (Ghost Foundation's Dawn theme). Much of Dawn's behavior lives in `@tryghost/shared-theme-assets` (not vendored there); this migration recreates the UX with shadcn/Tailwind on the existing gist data layer — it ports no Ghost code.

## Goal

Rebuild the public site's presentation to feel like Ghost's Dawn theme —
cover intro, featured carousel, calendar-row feed with hover chevron,
load-more, Dawn-style single posts with prev/next + related, tag-style type
pages, logo-left header with ⌘K search, Dawn footer — using shadcn/ui and
the repo's conventions, preserving every existing SEO surface.

## User decisions

1. **Members/subscribe surfaces and comments: skipped entirely.** RSS stays
   the follow mechanism.
2. **Featured** is real curation: a metadata marker in the gist description
   (`Blog! - Title - …` = featured Blog) + a star toggle in `/editor`.
3. **Typography: Inter stays** (no Mulish/Lora). Roboto Mono stays for code.
4. **Search: ⌘K command palette** over titles/descriptions/types.

## Non-goals (v1)

- No PhotoSwipe-style lightbox (would touch the shared article image
  pipeline; follow-up).
- No serif font option, no alternate nav layouts (logo-left only).
- No comments, no member/paid surfaces, no newsletter forms.
- **Article body rendering and `prose-*` styles are untouched** — they are
  shared with the editor's WYSIWYG. Dawn's identity is applied to the
  chrome (nav, feeds, headers, footers), never to `ArticleContent`.
- Beeps surfaces unchanged.
- Editor unchanged except the featured toggle.

## Architecture

### Data layer

- **`lib/parse-entry.ts`**: the type segment may carry a trailing `!`
  (e.g. `Blog!`, `Sharing!`) meaning featured. Every `Entry` variant gains
  `featured: boolean`. Unknown types still throw; existing descriptions
  (no `!`) parse as `featured: false` — fully backward compatible.
- **`lib/compose-entry.ts`**: `EntryInput` gains `featured?: boolean`;
  compose emits the `!` suffix on the type when set. The round-trip guard
  in `composeEntry` (parse-back comparison) must compare `featured` too.
- **`lib/reading-time.ts`** (new): `readingTime(markdown): number` —
  minutes, Ghost's convention: `Math.max(1, Math.ceil(words / 275))`,
  words = whitespace-split count.
- **`repositories/gist/index.ts`**: `getGistList` entries gain
  `readingTimeMinutes`. Implementation: inside the existing `"use cache"`
  list function, fetch each gist's `files["index.md"].raw_url` (plain
  `fetch`, concurrent, failures degrade to `null` minutes — never take the
  list down) and compute. Cached under the existing `gists` tag/12h life,
  so the cost is per-revalidation, not per-request. `featured` arrives via
  `parseEntry` automatically.
- **Prev/next**: derived on the article page from the (already fetched)
  type-filtered list: chronological neighbors by `created_at` within the
  same type. **Related**: up to 5 same-type entries excluding self (the
  existing "More in" data, re-presented).

### Site chrome

- **Header** (`components/navigation-bar`, rewritten): Dawn logo-left —
  site name left; flat topic links (Home, Blog, Poem, Sharing, Literature)
  center; right: search icon button (opens palette) and the existing theme
  behavior. Mobile: burger opens the existing shadcn `Sheet` with the same
  links + search. Sticky-capable but non-sticky (match current site).
- **Footer**: Dawn's three-part row — `© {year} {site name}` left; social
  icon links center (config-driven: GitHub + RSS at minimum, easily
  extended via a new `config.social` array); the existing footer blurb
  moves above it or is retired in favor of the cover description (design
  choice at implementation, keep the copy somewhere sensible).

### Pages

- **Home (`app/page.tsx`)**:
  1. **Cover**: centered column (max-w ~520px): site icon, description,
     — no CTA buttons (members skipped).
  2. **Featured carousel**: only when featured entries exist. shadcn
     `carousel` (embla): 1/2/3 items at <768/<992/≥992px, nav arrows, no
     dots. Card = feature-image-less variant: type + title on a muted
     panel (gists have no feature images; use the OG-image endpoint
     `/api/og?title=…` as the card visual so cards match the site's link
     previews).
  3. **Feed**: all articles (not beeps), newest first, Dawn rows:
     brand-colored calendar block (`DD` over uppercase `MMM`), truncating
     title, right side = star icon (featured only) + `N min read`,
     chevron sliding in from the right on hover, hairline dividers
     between rows. Entire row is one link. **Load more** reveals 5 at a
     time (client-side chunked reveal over the statically shipped list;
     button hidden when exhausted).
- **Type pages (`app/[type]/page.tsx`)**: Dawn tag-page header —
  `#blog`-style title (type name), entry count/short description — then
  the same feed component (all entries of the type, load-more).
- **Article (`app/[type]/[slug]/page.tsx`)**: keep all data/SEO logic;
  re-skin the shell to Dawn's single: centered meta row
  (`<time>` date · `N min read` · type link), large centered title,
  description as excerpt, **Share** button (Web Share API,
  copy-link fallback with confirmation), then `ArticleContent`
  (unchanged), then Dawn's single-footer: prev/next arrow links
  (chronological within type, tooltips with titles) and the related feed
  (same row component, up to 5). Breadcrumbs/JSON-LD stay.
- **Search**: `components/search` — shadcn `command` in its dialog form;
  server passes the article list (title, description, type, slug, date);
  opens via nav button and ⌘K; selecting navigates. Grouped by type.

### shadcn additions (CLI only, per repo rules)

`npx shadcn@latest add command carousel` (command brings dialog). New
custom components live under `components/` (e.g. `components/feed/`,
`components/cover/`, `components/search/`), never in `components/ui/`.

### Editor integration

`MetadataBar` gains a star toggle (featured) beside the type select;
`EntryInput.featured` flows through existing save paths untouched. The
editor list page shows a star on featured entries.

### Visual language

Existing OKLCH tokens and Inter; Dawn's structural signatures are
recreated with them: `--primary` plays Dawn's `--brand-color` role
(calendar block, star, focus accents). Animations follow the repo's
transition idiom (150–250ms ease-out); the feed chevron slide is CSS
transform on group-hover. Dark mode is the existing next-themes
class+system hybrid — the same model Dawn implements.

## SEO

- All existing surfaces preserved byte-compatible in intent: JSON-LD
  graph, canonicals, OG/twitter, sitemap, RSS, llms/llms-full, IndexNow,
  robots (+ the editor shielding).
- Improvements shipped with the redesign: feed rows are `<article>` with
  `<time datetime>`; every page keeps exactly one `h1`; carousel/OG
  images carry composed alt text; no new client JS on article bodies;
  load-more/search are progressive enhancements on top of fully
  server-rendered lists (all entries are in the HTML — reveal is
  presentation state, so crawlers see everything without JS).

## Error handling

- Reading-time fetch failures → `null` minutes → the row simply omits
  "min read"; the list never fails for one bad fetch.
- Web Share unavailable → clipboard copy with visible confirmation; both
  unavailable → the button hides.
- Carousel with one item renders without nav arrows; zero featured →
  section absent entirely.
- Search with empty query shows grouped recent entries; no results state
  uses the command component's built-in empty slot.

## Testing

No test runner (unchanged): `npm run lint` + `npx tsc --noEmit` +
`npm run build` per task; behavior verified against the live dev server
(curl for structure/SEO tags) plus the user's browser pass. Final checks:
sitemap/feed/llms outputs unchanged in URL set; article pages still render
identically inside the content column; editor round-trip corpus still
passes (featured marker only touches descriptions, not content).

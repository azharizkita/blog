# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Start development server
- `npm run build` — Production build
- `npm run start` — Start production server
- `npm run lint` — Run ESLint

No test framework is configured.

## Architecture

Next.js 16 App Router blog using **GitHub Gists as a headless CMS** — no database. Content is fetched via Octokit, cached with `unstable_cache` (12-hour TTL), and rendered as static pages.

### Content Model

Gist descriptions encode content metadata: `Type - Title - Description`. Parsing logic lives in `lib/parse-entry.ts`.

Content types and their description formats:
- **Blog/Beep/Literature**: `Type - Title - Description`
- **Poem**: `Poem - Title` (description optional)
- **Sharing**: `Sharing - LanguageTag - Title - Description`

Markdown content is stored in `index.md` within each gist.

### Data Flow

```
GitHub Gists API → repositories/ (data access + caching) → Server Components → Static HTML
```

- **`repositories/`** — Data access layer wrapping Octokit calls with `unstable_cache`. Modules: `gist/`, `about/`, `stats/`, `pinned-repos/`.
- **`lib/octokit.ts`** — Shared GitHub API client authenticated via `GITHUB_PAT`.
- **`lib/config.ts`** — Centralized config (GitHub credentials, site metadata, author info).

### Routing

- `/articles/[slug]` — Dynamic article pages (static params generated from gist list)
- `/articles/blog`, `/articles/poem`, `/articles/sharing`, `/articles/literature` — Category filters
- `/beeps` — Short-form content
- `/stats` — GitHub language stats and pinned repos
- `/who-am-i` — Profile (fetches GitHub profile README)
- `/api/og` — Dynamic Open Graph image generation

Most pages use `export const dynamic = "force-static"`.

### Components

- **`components/ui/`** — shadcn/ui components (New York style, RSC-enabled, Lucide icons)
- **`components/article-content/`** — MDX rendering with custom element handlers and syntax highlighting via rehype-pretty-code
- Client components used sparingly: search, theme toggle, navigation context

### Key Utilities

- **`lib/metadata.ts`** — SEO metadata factory for pages
- **`lib/cache.ts`** — Wrapper around `unstable_cache`
- **`lib/utils.ts`** — `cn()` helper (clsx + tailwind-merge)

## Conventions

- TypeScript strict mode; path alias `@/*` maps to project root
- File naming: kebab-case; component naming: PascalCase
- Server components by default; `"use client"` only when interactivity is needed
- Git commits: conventional commits (`feat:`, `fix:`, `chore:`)
- Styling: Tailwind CSS 4 with CSS variables for theming (light/dark via next-themes)

## Environment Variables

- `GITHUB_PAT` — GitHub Personal Access Token (required)
- `GITHUB_USERNAME` — GitHub username (defaults to `azharizkita`)

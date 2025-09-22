# Personal Blog Platform

A modern static blog platform built with Next.js that uses GitHub Gists as a headless CMS. This project demonstrates practical architectural patterns for content management without traditional database overhead.

## Architecture Overview

### Core Technologies

- **Next.js 15** with App Router for file-based routing and server components
- **React 19** for modern UI patterns and server-side rendering
- **TypeScript** for type safety across the entire application
- **Tailwind CSS** with shadcn/ui component system
- **GitHub API** as the primary data source

### Content Management Strategy

The main architectural decision is using GitHub Gists as a headless CMS instead of a traditional database or CMS platform.

**Why GitHub Gists?**

1. **No infrastructure overhead** - No database to manage, migrate, or host
2. **Built-in version control** - Content changes are tracked automatically
3. **Familiar editing experience** - Write in GitHub's Markdown editor
4. **Reliable API** - GitHub's proven infrastructure and uptime
5. **Zero cost** - Leverages existing GitHub account

**Content Structure**

Content follows a structured format in gist descriptions:
```
Type - Title - Description
```

Supported content types:
- `Blog` - Long-form articles
- `Poem` - Poetry and creative writing
- `Sharing` - Code snippets and technical sharing
- `Beep` - Short-form thoughts and updates

Markdown content is stored in `index.md` files within each gist.

### Data Flow

```
GitHub Gists API → Repository Layer → Server Components → Static Pages
```

1. **Data fetching** happens server-side during build time
2. **Repository pattern** abstracts GitHub API calls
3. **Server components** render content without client-side JavaScript
4. **Static generation** pre-renders all pages for performance

### Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── articles/          # Article listing and categories
│   │   ├── [slug]/        # Dynamic article routes
│   │   ├── blog/          # Blog category page
│   │   ├── poem/          # Poetry category page
│   │   └── sharing/       # Code sharing category
│   ├── beeps/             # Short-form content
│   ├── stats/             # GitHub profile statistics
│   └── api/og/            # Dynamic Open Graph images
├── components/            # Reusable UI components
│   ├── ui/               # Base shadcn/ui components
│   ├── article-content/  # MDX rendering components
│   ├── category-tab/     # Content filtering UI
│   └── head-bar/         # Navigation and search
├── repositories/         # Data access layer
│   ├── gist/            # GitHub Gists API calls
│   ├── stats/           # Profile statistics
│   └── about/           # Profile information
├── lib/                 # Utility functions
│   ├── config.ts        # Centralized configuration
│   ├── metadata.ts      # SEO metadata helpers
│   └── parse-entry.ts   # Content parsing logic
└── constants/           # Application constants
```

### Component Architecture

**Repository Pattern**
Data access is abstracted through repository modules that handle GitHub API interactions and caching logic.

**Server Components First**
Most components are server components that fetch data during build time, reducing client-side JavaScript.

**Compound Components**
UI components follow composition patterns for flexibility and reusability.

### Performance Strategy

**Static Site Generation**
```typescript
export const dynamic = "force-static";
```

All pages are pre-rendered at build time for optimal performance.

**Caching Strategy**
```typescript
const cache = unstable_cache(cb, keyParts, {
  revalidate: 3600 * 12, // 12 hours
});
```

GitHub API calls are cached for 12 hours to balance content freshness with API rate limits.

**Image Optimization**
Next.js Image component with Sharp optimization for responsive, optimized images.

### SEO and Social Features

- **Structured data** with Schema.org markup for better search engine understanding
- **Dynamic Open Graph images** generated per article
- **Semantic HTML** with proper heading hierarchy
- **Sitemap generation** for search engine indexing
- **RSS-like content structure** through consistent metadata

### Development Workflow

**Getting Started**
```bash
npm install
npm run dev
```

**Environment Variables**
```env
GITHUB_PAT=your_github_personal_access_token
GITHUB_USERNAME=your_github_username
```

**Content Creation Process**
1. Create a new GitHub Gist
2. Set description following the format: `Type - Title - Description`
3. Add content in `index.md` file
4. Content appears automatically on next build

### Build and Deployment

**Static Export**
The application generates static HTML/CSS/JS that can be deployed to any static hosting service.

**Incremental Static Regeneration**
Pages revalidate every 12 hours to fetch new content while maintaining static performance.

**Error Monitoring**
Sentry integration for both build-time and runtime error tracking.

### Technical Decisions and Trade-offs

**GitHub API as Single Source of Truth**
- **Pro**: No database complexity, version control included
- **Con**: Dependent on GitHub API availability and rate limits

**Static Generation Over SSR**
- **Pro**: Better performance, lower hosting costs, better SEO
- **Con**: Content updates require rebuilds (mitigated by ISR)

**TypeScript Throughout**
- **Pro**: Better developer experience, fewer runtime errors
- **Con**: Slightly more complex setup and build process

**Server Components Over Client Components**
- **Pro**: Less JavaScript, better performance, better SEO
- **Con**: Limited interactivity (addressed with strategic client components)

### Monitoring and Analytics

- **Vercel Analytics** for user behavior tracking
- **Speed Insights** for Core Web Vitals monitoring
- **Sentry** for error tracking and performance monitoring
- **GitHub API rate limit monitoring** through response headers

## Why This Architecture?

This architecture prioritizes simplicity, performance, and maintainability over complex features. It's designed for a personal blog where:

1. **Content creation should be simple** - GitHub's interface is familiar
2. **Performance should be excellent** - Static generation provides instant loading
3. **Maintenance should be minimal** - No databases or servers to manage
4. **Costs should be low** - Static hosting is cheap or free
5. **Development should be productive** - TypeScript and modern tooling

import { cacheLife } from "next/cache";
import Link from "next/link";
import { config } from "@/lib/config";

// `new Date()` is synchronous IO and cacheComponents' prerender validation
// rejects it in an uncached scope (every page renders this via the root
// layout, so it would block the whole app from prerendering). Confining the
// call to its own "use cache" scope makes it a cached value that revalidates
// daily instead of a build-blocking dynamic read — see next/dist/docs
// .../03-api-reference/04-functions/cacheLife.md's "Using preset profiles"
// example, which caches an async component the same way.
async function copyrightYear(): Promise<number> {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

/** Site-wide footer, rendered at the bottom of every page via the root layout. */
export async function Footer() {
  const year = await copyrightYear();

  return (
    <footer className="space-y-6 border-t pt-8">
      <p className="prose-small prose-muted">
        This is a curated personal archive of my mind&mdash;from life updates,
        late-night thoughts, random realizations, or just rants about whatever&apos;s
        on my plate. It&apos;s not for everyone, but if you&apos;re here, maybe
        you&apos;ll find something that resonates.
      </p>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="prose-muted text-xs">
          {config.site.name} © {year}
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

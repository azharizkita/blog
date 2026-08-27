import Link from "next/link";
import { config } from "@/lib/config";

/** Site-wide footer, rendered at the bottom of every page via the root layout. */
export function Footer() {
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

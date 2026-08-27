import Link from "next/link";
import { config } from "@/lib/config";
import { CONTENT_TOPICS } from "@/lib/content-types";
import { getGistList, type GistList } from "@/repositories/gist";
import { SiteSearch, type SearchItem } from "@/components/search";
import { MobileMenu } from "./mobile-menu";

export async function NavigationBar() {
  // The nav lives in the root layout, so a throw here would escape the page
  // error boundary. Degrade to the shell (just Home) if the API is unavailable.
  let articles: GistList = [];
  try {
    articles = await getGistList("articles");
  } catch {
    articles = [];
  }

  const topicsWithEntries = CONTENT_TOPICS.filter((type) =>
    articles.some((gist) => gist.entry.type === type),
  );

  const links = [
    { label: "Home", href: "/" },
    ...topicsWithEntries.map((type) => ({
      label: type,
      href: `/${type.toLowerCase()}`,
    })),
  ];

  const searchItems: SearchItem[] = articles.map((gist) => ({
    title: gist.entry.title,
    description: gist.entry.description ?? null,
    type: gist.entry.type,
    slug: gist.slug,
  }));

  return (
    <div className="flex w-full items-center justify-between gap-4 px-1.5">
      <Link href="/" className="font-extrabold tracking-tight">
        {config.site.name}
      </Link>

      <nav className="hidden items-center gap-6 md:flex">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-1">
        <SiteSearch items={searchItems} />
        <div className="md:hidden">
          <MobileMenu links={links} />
        </div>
      </div>
    </div>
  );
}

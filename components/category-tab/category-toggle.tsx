"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { usePathname } from "next/navigation";
import Link from "next/link";

export function CategoryToggle() {
  const pathname = usePathname();

  // Don't show on individual article pages
  if (pathname.includes("/articles/") && pathname.split("/").length > 3) {
    return null;
  }

  const currentValue = (() => {
    if (pathname === "/articles") return "All";
    if (pathname === "/articles/blog") return "Blog";
    if (pathname === "/articles/poem") return "Poem";
    if (pathname === "/articles/sharing") return "Sharing";
    if (pathname === "/articles/literature") return "Literature";
    return "All";
  })();

  return (
    <ToggleGroup type="single" variant="outline" value={currentValue}>
      <ToggleGroupItem value="All" aria-label="Toggle all" asChild>
        <Link href="/articles">All</Link>
      </ToggleGroupItem>
      <ToggleGroupItem
        value="Literature"
        aria-label="Toggle literature"
        asChild
      >
        <Link href="/articles/literature">Literature</Link>
      </ToggleGroupItem>
      <ToggleGroupItem value="Blog" aria-label="Toggle blog" asChild>
        <Link href="/articles/blog">Blog</Link>
      </ToggleGroupItem>
      <ToggleGroupItem value="Poem" aria-label="Toggle poem" asChild>
        <Link href="/articles/poem">Poem</Link>
      </ToggleGroupItem>
      <ToggleGroupItem value="Sharing" aria-label="Toggle sharing" asChild>
        <Link href="/articles/sharing">Sharing</Link>
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

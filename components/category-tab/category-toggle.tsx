"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { usePathname, useRouter } from "next/navigation";

export function CategoryToggle() {
  const pathname = usePathname();
  const router = useRouter();

  // Don't show on individual article pages
  if (pathname.includes("/articles/") && pathname.split("/").length > 3) {
    return null;
  }

  const currentValue = (() => {
    if (pathname === "/articles") return "All";
    if (pathname === "/articles/blog") return "Blog";
    if (pathname === "/articles/poem") return "Poem";
    if (pathname === "/articles/sharing") return "Sharing";
    return "All";
  })();

  return (
    <ToggleGroup
      type="single"
      variant="outline"
      value={currentValue}
    >
      <ToggleGroupItem
        value="All"
        aria-label="Toggle all"
        onClick={() => {
          router.push("/articles");
        }}
      >
        All
      </ToggleGroupItem>
      <ToggleGroupItem
        value="Blog"
        aria-label="Toggle blog"
        onClick={() => {
          router.push("/articles/blog");
        }}
      >
        Blog
      </ToggleGroupItem>
      <ToggleGroupItem
        value="Poem"
        aria-label="Toggle poem"
        onClick={() => {
          router.push("/articles/poem");
        }}
      >
        Poem
      </ToggleGroupItem>
      <ToggleGroupItem
        value="Sharing"
        aria-label="Toggle sharing"
        onClick={() => {
          router.push("/articles/sharing");
        }}
      >
        Sharing
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

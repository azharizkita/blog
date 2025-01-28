"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { createQueryString } from "@/lib/create-query-string";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function CategoryToggle() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const type = searchParams.get("type");

  if (pathname.includes("/article/")) {
    return null;
  }

  return (
    <ToggleGroup
      type="single"
      defaultValue="All"
      variant="outline"
      value={type ?? "All"}
    >
      <ToggleGroupItem
        value="All"
        aria-label="Toggle all"
        onClick={() => {
          router.push(
            pathname + "?" + createQueryString("type", "", searchParams)
          );
        }}
      >
        All
      </ToggleGroupItem>
      <ToggleGroupItem
        value="Blog"
        aria-label="Toggle blog"
        onClick={() => {
          router.push(
            pathname + "?" + createQueryString("type", "Blog", searchParams)
          );
        }}
      >
        Blog
      </ToggleGroupItem>
      <ToggleGroupItem
        value="Poetry"
        aria-label="Toggle poetry"
        onClick={() => {
          router.push(
            pathname + "?" + createQueryString("type", "Poetry", searchParams)
          );
        }}
      >
        Poetry
      </ToggleGroupItem>
      <ToggleGroupItem
        value="Sharing"
        aria-label="Toggle sharing"
        onClick={() => {
          router.push(
            pathname + "?" + createQueryString("type", "Sharing", searchParams)
          );
        }}
      >
        Sharing
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

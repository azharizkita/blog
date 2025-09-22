"use client";

import { Tabs } from "../ui/tabs";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useCallback, useMemo, useRef } from "react";

export function TabWrapper({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const isBeepsPage = useMemo(() => pathname.includes("/beeps"), [pathname]);

  const tabValue = useMemo(() => {
    if (isBeepsPage) return "Beep";
    if (pathname === "/articles") return "All";
    if (pathname === "/articles/blog") return "Blog";
    if (pathname === "/articles/poem") return "Poem";
    if (pathname === "/articles/sharing") return "Sharing";
    return "All";
  }, [pathname, isBeepsPage]);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleTabChange = useCallback(
    (v: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        if (v === "Beep") {
          router.push("/beeps");
          return;
        }

        if (v === "All") {
          router.push("/articles");
          return;
        }

        if (v === "Blog") {
          router.push("/articles/blog");
          return;
        }

        if (v === "Poem") {
          router.push("/articles/poem");
          return;
        }

        if (v === "Sharing") {
          router.push("/articles/sharing");
          return;
        }
      }, 100);
    },
    [router]
  );

  // Only hide on home page and individual article pages (with slug)
  if (pathname === "/" || (pathname.includes('/articles/') && pathname.split("/").length > 3)) return null;

  return (
    <Tabs
      value={tabValue}
      className="flex flex-col gap-2 w-full self-center"
      onValueChange={handleTabChange}
    >
      {children}
    </Tabs>
  );
}

"use client";

import { Tabs } from "@/shadcn/components/ui/tabs";
import { usePathname, useParams } from "next/navigation";
import type { ReactNode } from "react";

export function TabWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const params = useParams();

  const isBeepsPage =
    pathname.includes("/beeps") ||
    pathname.includes("/who-am-i") ||
    pathname.includes("/stats");

  const tabValue = (() => {
    if (isBeepsPage) return "Beep";
    if (pathname === "/articles") return "All";
    if (pathname === "/articles/blog") return "Blog";
    if (pathname === "/articles/poem") return "Poem";
    if (pathname === "/articles/sharing") return "Sharing";
    if (pathname === "/articles/literature") return "Literature";
    return "All";
  })();

  // Hide on home page and individual article pages (when slug param exists)
  if (pathname === "/" || params.slug || isBeepsPage) return null;

  return (
    <Tabs value={tabValue} className="flex flex-col gap-2 w-full self-center">
      {children}
    </Tabs>
  );
}

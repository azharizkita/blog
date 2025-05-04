"use client";

import { Tabs } from "../ui/tabs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createQueryString } from "@/lib/create-query-string";
import type { ReactNode } from "react";
import { useCallback, useMemo, useRef } from "react";

export function TabWrapper({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isAll = useMemo(() => pathname.includes("/articles"), [pathname]);

  const tabValue = useMemo(() => (isAll ? "Articles" : "Beep"), [isAll]);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleTabChange = useCallback(
    (v: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        if (v === "Beep") {
          router.push("/beeps");
          return;
        }

        if (v === "Articles") {
          router.push("/articles");
          return;
        }

        router.push(
          pathname +
            "?" +
            createQueryString("type", v === "Articles" ? "" : v, searchParams)
        );
      }, 100);
    },
    [pathname, router, searchParams]
  );

  if (pathname === "/") return null;

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

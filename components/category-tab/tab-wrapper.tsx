"use client";

import { Tabs } from "../ui/tabs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createQueryString } from "@/lib/create-query-string";
import type { ReactNode } from "react";

export function TabWrapper({ children }: { children: ReactNode; }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isAll = (() => {
    if (pathname === "/" || pathname.includes("/article/")) {
      return true;
    }

    return false;
  })();

  return (
    <Tabs
      value={isAll ? "All" : "Beep"}
      defaultValue="All"
      className="flex flex-col gap-2 w-full self-center pt-4 bg-background z-10"
      onValueChange={(v) => {
        if (v === "Beep") {
          router.push("/beeps");
          return;
        }
        if (v === "All") {
          router.push("/");
          return;
        }
        router.push(
          pathname +
          "?" +
          createQueryString("type", v === "All" ? "" : v, searchParams)
        );
      }}
    >
      {children}
    </Tabs>
  );
}

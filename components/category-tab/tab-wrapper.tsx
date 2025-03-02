"use client";

import { Tabs } from "../ui/tabs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createQueryString } from "@/lib/create-query-string";
import type { ReactNode } from "react";

export function TabWrapper({
  children,
  pathname: _pathname,
}: {
  children: ReactNode;
  pathname: string;
}) {
  const router = useRouter();
  const pathname = usePathname() ?? _pathname;
  const searchParams = useSearchParams();

  if (pathname === "/") return null;

  const isAll = (() => {
    if (pathname.includes("/articles")) {
      return true;
    }

    return false;
  })();

  return (
    <Tabs
      value={isAll ? "Articles" : "Beep"}
      defaultValue="Articles"
      className="flex flex-col gap-2 w-full self-center pt-4 bg-background z-10"
      onValueChange={(v) => {
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
      }}
    >
      {children}
    </Tabs>
  );
}

"use client";

import { createQueryString } from "@/lib/create-query-string";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { CategoryToggle } from "./category-toggle";

export function CategoryTab() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

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
      <TabsList className="w-full">
        <TabsTrigger className="w-full" value="All">
          Articles
        </TabsTrigger>
        <TabsTrigger className="w-full" value="Beep">
          Beeps
        </TabsTrigger>
      </TabsList>
      <TabsContent value="All" className="self-start">
        <CategoryToggle />
      </TabsContent>
      <TabsContent value="Blog" className="self-start">
        <CategoryToggle />
      </TabsContent>
      <TabsContent value="Poetry" className="self-start">
        <CategoryToggle />
      </TabsContent>
      <TabsContent value="Sharing" className="self-start">
        <CategoryToggle />
      </TabsContent>
    </Tabs>
  );
}

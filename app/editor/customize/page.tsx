import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CustomizeForm } from "@/components/editor/customize-form";
import { buttonVariants } from "@/components/ui/button";
import { getSiteCopyFresh, listTags } from "@/repositories/settings";
import { assertDevEditorPage } from "../dev-only";

export const metadata: Metadata = {
  title: "Customize",
  robots: { index: false, follow: false },
};

// Same instant-navigation opt-out as the sibling editor pages (uncached IO
// outside Suspense under cacheComponents).
export const instant = false;

export default async function CustomizePage() {
  assertDevEditorPage();

  // Always fresh: this page edits the live copy.
  await connection();

  const [copy, tags] = await Promise.all([getSiteCopyFresh(), listTags()]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1.5">
        <Link
          href="/editor"
          aria-label="Back to editor"
          className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
        >
          <ArrowLeft />
        </Link>
        <h1 className="prose-h1">
          <span className="text-primary">#</span>customize
        </h1>
      </div>

      <CustomizeForm initial={copy} tags={tags} />
    </div>
  );
}

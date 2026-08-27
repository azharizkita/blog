import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { EditorScreen } from "@/components/editor/editor-screen";
import type { EntryInput } from "@/lib/compose-entry";
import parseEntry from "@/lib/parse-entry";
import { getGistById } from "@/repositories/gist";
import { assertDevEditorPage } from "../dev-only";
// Registers ArticleContent's client components (Mermaid, next/image, …) in
// this page entry's React Client Manifest so the preview server action can
// serialize them — see the same import in app/editor/new/page.tsx for the
// full explanation.
import "@/components/article-content";

export const metadata: Metadata = {
  title: "Edit article",
  robots: { index: false, follow: false },
};

// Deliberately-uncached IO (getGistById) runs outside Suspense here; opt
// this dev-only page out of instant-navigation validation instead of
// restructuring it around Suspense/`use cache`. See instant route segment
// config docs.
export const instant = false;

export default async function EditGistPage({
  params,
}: {
  params: Promise<{ gistId: string }>;
}) {
  assertDevEditorPage();

  // Always request-time: the gist must be fresh, and this keeps
  // cacheComponents' prerender validation out of the uncached Octokit call
  // (see the same note in app/editor/page.tsx).
  await connection();

  const { gistId } = await params;
  const gist = await getGistById(gistId).catch(() => null);
  if (!gist) notFound();

  let parsed: ReturnType<typeof parseEntry>;
  try {
    parsed = parseEntry(gist.description ?? "");
  } catch {
    // Not an article gist (code snippet etc.) — nothing to edit here.
    notFound();
  }

  const initialEntry: EntryInput = {
    type: parsed.type,
    featured: parsed.featured,
    title: parsed.title,
    description:
      ("description" in parsed ? parsed.description : "") ?? "",
    languageTag: "languageTag" in parsed ? parsed.languageTag : undefined,
  };

  return (
    <EditorScreen
      gistId={gistId}
      isPublic={!!gist.public}
      initialContent={gist.files?.["index.md"]?.content ?? ""}
      initialEntry={initialEntry}
    />
  );
}

import type { Metadata } from "next";
import { EditorScreen } from "@/components/editor/editor-screen";
import { assertDevEditorPage } from "../dev-only";
// The preview server action serializes ArticleContent's tree, whose client
// components (Mermaid, next/image, …) must exist in THIS page entry's React
// Client Manifest. actions.ts is only imported from client components (an
// RPC stub, invisible to this page's server module graph), so without this
// side-effect import a previewed article containing a mermaid block fails
// with "Could not find the module …/components/mermaid… in the React Client
// Manifest" server-side and a cryptic Flight TypeError client-side.
import "@/components/article-content";

export const metadata: Metadata = {
  title: "New article",
  robots: { index: false, follow: false },
};

// Sibling editor routes opt out of instant-navigation validation (see
// app/editor/page.tsx); applied here too for consistency across the
// dev-only editor route group.
export const instant = false;

export default function NewArticlePage() {
  assertDevEditorPage();
  return <EditorScreen />;
}

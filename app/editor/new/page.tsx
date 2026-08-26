import type { Metadata } from "next";
import { EditorScreen } from "@/components/editor/editor-screen";
import { assertDevEditorPage } from "../dev-only";

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

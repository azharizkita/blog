import type { Metadata } from "next";
import { EditorScreen } from "@/components/editor/editor-screen";
import { assertDevEditorPage } from "../dev-only";

export const metadata: Metadata = {
  title: "New article",
  robots: { index: false, follow: false },
};

export default function NewArticlePage() {
  assertDevEditorPage();
  return <EditorScreen />;
}

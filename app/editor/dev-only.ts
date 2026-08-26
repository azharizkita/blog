import { notFound } from "next/navigation";

/**
 * The editor is a local authoring tool only. In production builds every
 * editor page 404s; the server actions in actions.ts throw independently,
 * so there is no reachable write path even if a page gate were missed.
 */
export function assertDevEditorPage(): void {
  if (process.env.NODE_ENV !== "development") notFound();
}

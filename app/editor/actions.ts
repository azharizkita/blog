"use server";

import type { ReactNode } from "react";
import { updateTag } from "next/cache";
import { ArticleContentUncached } from "@/components/article-content";
import { createGist, deleteGist, updateGist } from "@/repositories/gist";

export type PreviewResult =
  | { ok: true; node: ReactNode }
  | { ok: false; error: string };

export type RebuildResult = { triggered: boolean; message: string };

export type SaveResult =
  | { ok: true; gistId: string; warnings: string[]; rebuild?: RebuildResult }
  | { ok: false; error: string };

function assertDevAction(): void {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("The editor only runs in development.");
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function renderPreview(content: string): Promise<PreviewResult> {
  assertDevAction();
  try {
    // The uncached pipeline keeps the preview byte-identical to the published
    // article while staying callable from an action ("use cache" functions
    // can't execute during a server-action render). MDX compile errors throw
    // here and are surfaced as a structured error.
    const node = await ArticleContentUncached({ content });
    return { ok: true, node };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function saveDraft(input: {
  gistId?: string;
  description: string;
  content: string;
}): Promise<SaveResult> {
  assertDevAction();
  try {
    const gist = input.gistId
      ? await updateGist(input.gistId, {
          description: input.description,
          content: input.content,
        })
      : await createGist({
          description: input.description,
          content: input.content,
          isPublic: false,
        });
    updateTag("gists");
    const gistId = gist.id ?? input.gistId;
    if (!gistId) return { ok: false, error: "GitHub returned no gist id." };
    return { ok: true, gistId, warnings: [] };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function updatePublished(input: {
  gistId: string;
  description: string;
  content: string;
}): Promise<SaveResult> {
  assertDevAction();
  try {
    await updateGist(input.gistId, {
      description: input.description,
      content: input.content,
    });
    updateTag("gists");
    const rebuild = await triggerRebuild();
    return { ok: true, gistId: input.gistId, warnings: [], rebuild };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function publishGist(input: {
  draftGistId?: string;
  description: string;
  content: string;
}): Promise<SaveResult> {
  assertDevAction();
  let created;
  try {
    created = await createGist({
      description: input.description,
      content: input.content,
      isPublic: true,
    });
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
  if (!created.id) return { ok: false, error: "GitHub returned no gist id." };

  const warnings: string[] = [];
  if (input.draftGistId) {
    // Gist visibility can't be flipped, so publish = new public gist + delete
    // the secret draft. A failed delete is harmless — just report it.
    try {
      await deleteGist(input.draftGistId);
    } catch {
      warnings.push(
        "Deleting the secret draft failed — remove it manually on gist.github.com.",
      );
    }
  }
  updateTag("gists");
  const rebuild = await triggerRebuild();
  return { ok: true, gistId: created.id, warnings, rebuild };
}

export async function triggerRebuild(): Promise<RebuildResult> {
  assertDevAction();
  const url = process.env.VERCEL_DEPLOY_HOOK_URL;
  if (!url) {
    return {
      triggered: false,
      message: "VERCEL_DEPLOY_HOOK_URL is not set — no rebuild triggered.",
    };
  }
  try {
    const response = await fetch(url, { method: "POST" });
    if (!response.ok) {
      return {
        triggered: false,
        message: `Deploy hook responded ${response.status} — trigger the rebuild manually.`,
      };
    }
    return { triggered: true, message: "Production rebuild triggered." };
  } catch (error) {
    return {
      triggered: false,
      message: `Deploy hook request failed: ${errorMessage(error)}`,
    };
  }
}

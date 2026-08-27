# Blog Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A dev-only `/editor` route: markdown editor + exact-pipeline server-rendered preview, gists as storage (secret = draft, public = published), Vercel deploy-hook rebuild on publish.

**Architecture:** New pages under `app/editor/` are gated to `NODE_ENV === "development"`. The preview is a server action that invokes the existing `ArticleContent` server component and returns its JSX (React 19 supports JSX in action results), so preview fidelity is guaranteed by construction. Gist writes extend `repositories/gist/index.ts` with uncached Octokit calls.

**Tech Stack:** Next.js 16 App Router, React 19, Octokit (existing `lib/octokit.ts`), CodeMirror 6 (`@uiw/react-codemirror` + `@codemirror/lang-markdown`), Tailwind v4 + existing `prose-*` classes and shadcn `Button`/`Input`/`Label`.

**Spec:** `docs/superpowers/specs/2026-08-27-blog-editor-design.md`

## Global Constraints

- **No test runner exists in this repo and we are not adding one.** Verification per task = `npm run lint` + `npx tsc --noEmit`; behavior checks are manual against `npm run dev` (Task 7 has the full checklist). This replaces the usual write-failing-test steps.
- **NEVER edit `components/ui/`** — shadcn CLI-generated, per CLAUDE.md. New components go in `components/editor/`.
- This is **Next.js 16** — consult `node_modules/next/dist/docs/` before deviating from the code given here. `updateTag` is exported from `next/cache` (verified).
- The repo's `Button` is base-ui: it has **no `asChild`** — for link-shaped buttons use `<Link className={buttonVariants({...})}>`.
- Article content file inside a gist is always **`index.md`**; gist description is the ` - `-delimited metadata parsed by `lib/parse-entry.ts`.
- Env vars: `GITHUB_PAT` (exists), `VERCEL_DEPLOY_HOOK_URL` (new, optional — code must degrade gracefully without it).
- Commit after every task. Do not commit `.env.local`.

---

### Task 1: Entry composer (`lib/compose-entry.ts`)

**Files:**
- Create: `lib/compose-entry.ts`

**Interfaces:**
- Consumes: nothing (pure function; mirrors `lib/parse-entry.ts`).
- Produces: `ENTRY_TYPES: readonly ["Blog", "Poem", "Sharing", "Beep", "Literature"]`, `type EntryType`, `interface EntryInput { type: EntryType; title: string; description: string; languageTag?: string }`, `default composeEntry(entry: EntryInput): string` (throws `Error` with a user-facing message on invalid input). Tasks 4–6 import these.

- [ ] **Step 1: Write the file**

```ts
export const ENTRY_TYPES = [
  "Blog",
  "Poem",
  "Sharing",
  "Beep",
  "Literature",
] as const;

export type EntryType = (typeof ENTRY_TYPES)[number];

export interface EntryInput {
  type: EntryType;
  title: string;
  description: string;
  /** Required for Sharing entries, unused otherwise. */
  languageTag?: string;
}

export const ENTRY_DELIMITER = " - ";

/**
 * Inverse of lib/parse-entry.ts: builds the ` - `-delimited gist description.
 * Throws with a user-facing message when the metadata can't round-trip.
 */
export default function composeEntry(entry: EntryInput): string {
  const { type, title, description, languageTag } = entry;

  if (!title.trim()) {
    throw new Error("Title is required.");
  }

  const fields: Array<[string, string]> = [
    ["Title", title],
    ["Description", description],
    ["Language tag", languageTag ?? ""],
  ];
  for (const [label, value] of fields) {
    if (value.includes(ENTRY_DELIMITER)) {
      throw new Error(
        `${label} can't contain "${ENTRY_DELIMITER}" — it's the metadata delimiter.`,
      );
    }
  }

  const parts: string[] = [type];

  if (type === "Sharing") {
    if (!languageTag?.trim()) {
      throw new Error("Sharing entries need a language tag.");
    }
    parts.push(languageTag.trim());
  }

  parts.push(title.trim());

  const trimmedDescription = description.trim();
  // Poem descriptions are optional (parse-entry yields null); omit the
  // trailing segment instead of writing "Poem - Title - ".
  if (trimmedDescription || type !== "Poem") {
    parts.push(trimmedDescription);
  }

  return parts.join(ENTRY_DELIMITER);
}
```

- [ ] **Step 2: Verify**

Run: `npm run lint && npx tsc --noEmit`
Expected: both clean.

- [ ] **Step 3: Commit**

```bash
git add lib/compose-entry.ts
git commit -m "feat: entry composer for gist descriptions"
```

---

### Task 2: Gist write layer (`repositories/gist/index.ts`)

**Files:**
- Modify: `repositories/gist/index.ts` (append; do NOT touch the existing cached `getGistList`/`getGistDetails`)

**Interfaces:**
- Consumes: existing `octokit` (`@/lib/octokit`), `parseEntry`, `getSlug` (already imported at the top of the file).
- Produces (all uncached, editor-only):
  - `listAllGists(): Promise<Array<gist & { entry: { title: string; ... }; slug: string }>>` — authenticated user's gists **including secret ones**, unparseable descriptions filtered out.
  - `getGistById(gistId: string)` — raw single gist (`data` from Octokit).
  - `createGist(args: { description: string; content: string; isPublic: boolean })` — file is always `index.md`; returns the created gist.
  - `updateGist(gistId: string, args: { description: string; content: string })` — returns the updated gist.
  - `deleteGist(gistId: string): Promise<void>`.

- [ ] **Step 1: Append to `repositories/gist/index.ts`**

```ts
// ---------------------------------------------------------------------------
// Editor-only helpers. Deliberately uncached: the editor must see fresh state,
// including secret drafts, which the public site's listForUser never returns.

export const listAllGists = async () => {
  // gists.list = the authenticated user's gists, secret ones included.
  const data = await octokit.paginate(octokit.rest.gists.list, {
    per_page: 100,
  });

  return data.flatMap(({ description, ...rest }) => {
    try {
      const { title, ...restEntryData } = parseEntry(description ?? "");
      return [
        {
          ...rest,
          description,
          entry: { title, ...restEntryData },
          slug: getSlug(title),
        },
      ];
    } catch {
      // Non-article gists (code snippets etc.) don't belong in the editor.
      return [];
    }
  });
};

export const getGistById = async (gistId: string) => {
  const { data } = await octokit.rest.gists.get({ gist_id: gistId });
  return data;
};

export const createGist = async (args: {
  description: string;
  content: string;
  isPublic: boolean;
}) => {
  const { data } = await octokit.rest.gists.create({
    description: args.description,
    public: args.isPublic,
    files: { "index.md": { content: args.content } },
  });
  return data;
};

export const updateGist = async (
  gistId: string,
  args: { description: string; content: string },
) => {
  const { data } = await octokit.rest.gists.update({
    gist_id: gistId,
    description: args.description,
    files: { "index.md": { content: args.content } },
  });
  return data;
};

export const deleteGist = async (gistId: string) => {
  await octokit.rest.gists.delete({ gist_id: gistId });
};
```

- [ ] **Step 2: Verify**

Run: `npm run lint && npx tsc --noEmit`
Expected: clean. If `gists.update`'s `files` type complains, the correct shape per Octokit types is `Record<string, { content: string } | null>` — annotate the object, don't cast to `any`.

- [ ] **Step 3: Commit**

```bash
git add repositories/gist/index.ts
git commit -m "feat: uncached gist write layer for the editor"
```

---

### Task 3: Dev gate + server actions

**Files:**
- Create: `app/editor/dev-only.ts`
- Create: `app/editor/actions.ts`

**Interfaces:**
- Consumes: `ArticleContent` (`@/components/article-content`), `createGist`/`updateGist`/`deleteGist` from Task 2.
- Produces:
  - `assertDevEditorPage(): void` — calls `notFound()` outside development. Used by every editor page (Tasks 4–6).
  - Server actions (all typed, all self-gated):
    - `renderPreview(content: string): Promise<PreviewResult>` where `PreviewResult = { ok: true; node: ReactNode } | { ok: false; error: string }`
    - `saveDraft(input: { gistId?: string; description: string; content: string }): Promise<SaveResult>`
    - `updatePublished(input: { gistId: string; description: string; content: string }): Promise<SaveResult>`
    - `publishGist(input: { draftGistId?: string; description: string; content: string }): Promise<SaveResult>`
    - `triggerRebuild(): Promise<RebuildResult>` where `RebuildResult = { triggered: boolean; message: string }`
    - `SaveResult = { ok: true; gistId: string; warnings: string[]; rebuild?: RebuildResult } | { ok: false; error: string }`

- [ ] **Step 1: Write `app/editor/dev-only.ts`**

```ts
import { notFound } from "next/navigation";

/**
 * The editor is a local authoring tool only. In production builds every
 * editor page 404s; the server actions in actions.ts throw independently,
 * so there is no reachable write path even if a page gate were missed.
 */
export function assertDevEditorPage(): void {
  if (process.env.NODE_ENV !== "development") notFound();
}
```

- [ ] **Step 2: Write `app/editor/actions.ts`**

Note this file is `.ts`, not `.tsx` — `ArticleContent` is invoked as a plain async function, not as JSX.

```ts
"use server";

import type { ReactNode } from "react";
import { updateTag } from "next/cache";
import ArticleContent from "@/components/article-content";
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
    // Calling the real ArticleContent server component keeps the preview
    // byte-identical to the published pipeline (MDX + shiki + mermaid +
    // prose-* mappings). MDX compile errors throw here and are surfaced.
    const node = await ArticleContent({ content });
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
```

- [ ] **Step 3: Verify**

Run: `npm run lint && npx tsc --noEmit`
Expected: clean. Known wrinkle: `"use server"` files may only export async functions plus type-only exports — the `export type` lines are fine; do not add non-async value exports.

- [ ] **Step 4: Commit**

```bash
git add app/editor/dev-only.ts app/editor/actions.ts
git commit -m "feat: dev-gated editor server actions (preview, save, publish, rebuild)"
```

---

### Task 4: Editor list page + rebuild button

**Files:**
- Create: `components/editor/rebuild-button.tsx`
- Create: `app/editor/page.tsx`

**Interfaces:**
- Consumes: `listAllGists` (Task 2), `triggerRebuild` (Task 3), `assertDevEditorPage` (Task 3), `formatDate` (`@/lib/format-date`), `Button`/`buttonVariants` (`@/components/ui/button`).
- Produces: route `/editor`; `RebuildButton` client component (no props).

- [ ] **Step 1: Write `components/editor/rebuild-button.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { triggerRebuild } from "@/app/editor/actions";
import { Button } from "@/components/ui/button";

export function RebuildButton() {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <span className="flex items-center gap-2">
      {message && <span className="prose-muted text-xs">{message}</span>}
      <Button
        variant="outline"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await triggerRebuild();
            setMessage(result.message);
          })
        }
      >
        Rebuild site
      </Button>
    </span>
  );
}
```

- [ ] **Step 2: Write `app/editor/page.tsx`**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { RebuildButton } from "@/components/editor/rebuild-button";
import { buttonVariants } from "@/components/ui/button";
import { formatDate } from "@/lib/format-date";
import { listAllGists } from "@/repositories/gist";
import { assertDevEditorPage } from "./dev-only";

export const metadata: Metadata = {
  title: "Editor",
  robots: { index: false, follow: false },
};

export default async function EditorPage() {
  assertDevEditorPage();

  const gists = await listAllGists();
  const sorted = [...gists].sort(
    (a, b) =>
      new Date(b.updated_at ?? 0).getTime() -
      new Date(a.updated_at ?? 0).getTime(),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="prose-h1">Editor</h1>
        <div className="flex items-center gap-2">
          <RebuildButton />
          <Link href="/editor/new" className={buttonVariants()}>
            New article
          </Link>
        </div>
      </div>

      <ul className="divide-y">
        {sorted.map((gist) => (
          <li key={gist.id}>
            <Link
              href={`/editor/${gist.id}`}
              className="group flex items-baseline justify-between gap-4 py-3"
            >
              <span className="space-x-2">
                <span className="prose-muted text-xs tracking-wide uppercase">
                  {gist.entry.type}
                </span>
                <span className="font-medium transition-colors group-hover:text-muted-foreground">
                  {gist.entry.title}
                </span>
              </span>
              <span className="prose-muted text-xs whitespace-nowrap">
                {gist.public ? "Published" : "Draft"} ·{" "}
                {formatDate(gist.updated_at)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 3: Verify in dev**

Run: `npm run lint && npx tsc --noEmit`, then `npm run dev` and open `http://localhost:3000/editor`.
Expected: your article gists listed with type/title/date, "Rebuild site" and "New article" buttons render. ("New article" 404s until Task 5 — fine.) Clicking "Rebuild site" without `VERCEL_DEPLOY_HOOK_URL` set shows the "not set" message, not an error.

- [ ] **Step 4: Commit**

```bash
git add components/editor/rebuild-button.tsx app/editor/page.tsx
git commit -m "feat: editor gist list page with manual rebuild trigger"
```

---

### Task 5: Editor screen + `/editor/new`

**Files:**
- Modify: `package.json` (via `npm install @uiw/react-codemirror @codemirror/lang-markdown`)
- Create: `components/editor/markdown-editor.tsx`
- Create: `components/editor/preview-pane.tsx`
- Create: `components/editor/metadata-bar.tsx`
- Create: `components/editor/editor-screen.tsx`
- Create: `app/editor/new/page.tsx`

**Interfaces:**
- Consumes: Task 1 (`composeEntry`, `EntryInput`, `ENTRY_TYPES`), Task 3 actions, `getSlug` (`@/lib/get-slug`), `cn` (`@/lib/utils`), `Button`, `Input`, `Label` (existing `components/ui/`).
- Produces: `EditorScreen` client component with props `{ gistId?: string; isPublic?: boolean; initialContent?: string; initialEntry?: EntryInput }` — Task 6 renders it with all props set.

- [ ] **Step 1: Install CodeMirror deps**

```bash
npm install @uiw/react-codemirror @codemirror/lang-markdown
```

- [ ] **Step 2: Write `components/editor/markdown-editor.tsx`**

```tsx
"use client";

import { markdown } from "@codemirror/lang-markdown";
import CodeMirror from "@uiw/react-codemirror";
import { useTheme } from "next-themes";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
  const { resolvedTheme } = useTheme();

  return (
    <div className="overflow-hidden rounded-md border">
      <CodeMirror
        value={value}
        onChange={onChange}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        extensions={[markdown()]}
        height="70vh"
        basicSetup={{ lineNumbers: false, foldGutter: false }}
      />
    </div>
  );
}
```

- [ ] **Step 3: Write `components/editor/preview-pane.tsx`**

```tsx
"use client";

import { Component, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PreviewPaneProps {
  node: ReactNode;
  error: string | null;
  isPending: boolean;
  /** Bumped on every successful preview so the boundary resets via key. */
  version: number;
}

// evaluate() catches compile errors server-side, but a runtime error inside
// the rendered MDX (e.g. {someUndefinedVar}) only throws while React renders
// the returned tree here on the client — hence the boundary.
class PreviewErrorBoundary extends Component<
  { children: ReactNode },
  { message: string | null }
> {
  state = { message: null as string | null };

  static getDerivedStateFromError(error: unknown) {
    return {
      message: error instanceof Error ? error.message : String(error),
    };
  }

  render() {
    if (this.state.message) {
      return (
        <p className="font-mono text-xs text-destructive">
          Runtime render error: {this.state.message}
        </p>
      );
    }
    return this.props.children;
  }
}

export function PreviewPane({ node, error, isPending, version }: PreviewPaneProps) {
  return (
    <div className="rounded-md border">
      {error && (
        <p className="border-b bg-destructive/10 px-4 py-2 font-mono text-xs whitespace-pre-wrap text-destructive">
          {error}
        </p>
      )}
      <div
        className={cn(
          "h-[70vh] overflow-y-auto py-6 transition-opacity",
          isPending && "opacity-60",
        )}
      >
        {/* Mirror the real article column: max-w-3xl + px-4, per app/layout.tsx. */}
        <div className="mx-auto w-full max-w-3xl px-4">
          <PreviewErrorBoundary key={version}>{node}</PreviewErrorBoundary>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Write `components/editor/metadata-bar.tsx`**

Native `<select>` on purpose — the repo's shadcn set has no Select component, and a dev-only tool doesn't justify adding one.

```tsx
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ENTRY_TYPES, type EntryInput } from "@/lib/compose-entry";

interface MetadataBarProps {
  value: EntryInput;
  onChange: (value: EntryInput) => void;
  slug: string;
  status: "new" | "draft" | "published";
}

export function MetadataBar({ value, onChange, slug, status }: MetadataBarProps) {
  const set = (patch: Partial<EntryInput>) => onChange({ ...value, ...patch });

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label htmlFor="entry-type">Type</Label>
        <select
          id="entry-type"
          className="h-8 rounded-2xl border bg-background px-3 text-sm"
          value={value.type}
          onChange={(event) =>
            set({ type: event.target.value as EntryInput["type"] })
          }
        >
          {ENTRY_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      {value.type === "Sharing" && (
        <div className="space-y-1">
          <Label htmlFor="entry-lang">Language tag</Label>
          <Input
            id="entry-lang"
            className="w-24"
            placeholder="id"
            value={value.languageTag ?? ""}
            onChange={(event) => set({ languageTag: event.target.value })}
          />
        </div>
      )}

      <div className="min-w-48 flex-1 space-y-1">
        <Label htmlFor="entry-title">Title</Label>
        <Input
          id="entry-title"
          value={value.title}
          onChange={(event) => set({ title: event.target.value })}
        />
      </div>

      <div className="min-w-64 flex-2 space-y-1">
        <Label htmlFor="entry-description">Description</Label>
        <Input
          id="entry-description"
          value={value.description}
          onChange={(event) => set({ description: event.target.value })}
        />
      </div>

      <p className="prose-muted pb-2 text-xs whitespace-nowrap">
        {status === "new" ? "New" : status === "draft" ? "Draft" : "Published"} ·
        /{value.type.toLowerCase()}/{slug || "…"}
      </p>
    </div>
  );
}
```

- [ ] **Step 5: Write `components/editor/editor-screen.tsx`**

```tsx
"use client";

import {
  useEffect,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  publishGist,
  renderPreview,
  saveDraft,
  updatePublished,
  type SaveResult,
} from "@/app/editor/actions";
import { Button } from "@/components/ui/button";
import composeEntry, { type EntryInput } from "@/lib/compose-entry";
import getSlug from "@/lib/get-slug";
import { MarkdownEditor } from "./markdown-editor";
import { MetadataBar } from "./metadata-bar";
import { PreviewPane } from "./preview-pane";

const PREVIEW_DEBOUNCE_MS = 600;

export interface EditorScreenProps {
  gistId?: string;
  isPublic?: boolean;
  initialContent?: string;
  initialEntry?: EntryInput;
}

export function EditorScreen(props: EditorScreenProps) {
  const router = useRouter();
  const [gistId, setGistId] = useState(props.gistId);
  const [isPublic, setIsPublic] = useState(props.isPublic ?? false);
  const [content, setContent] = useState(props.initialContent ?? "");
  const [entry, setEntry] = useState<EntryInput>(
    props.initialEntry ?? { type: "Blog", title: "", description: "" },
  );
  const [preview, setPreview] = useState<ReactNode>(null);
  const [previewVersion, setPreviewVersion] = useState(0);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isPreviewPending, startPreview] = useTransition();
  const [isSaving, startSaving] = useTransition();

  // Debounced exact-pipeline preview: the server action renders the real
  // ArticleContent component, so the preview can't drift from production.
  useEffect(() => {
    const handle = setTimeout(() => {
      startPreview(async () => {
        const result = await renderPreview(content);
        if (result.ok) {
          setPreview(result.node);
          setPreviewVersion((version) => version + 1);
          setPreviewError(null);
        } else {
          // Keep the last good render visible under the error strip.
          setPreviewError(result.error);
        }
      });
    }, PREVIEW_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [content]);

  const composeOrReport = (): string | null => {
    try {
      return composeEntry(entry);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
      return null;
    }
  };

  const reportSave = (result: SaveResult, verb: string) => {
    if (!result.ok) {
      setStatus(result.error);
      return null;
    }
    setStatus(
      [`${verb}.`, ...result.warnings, result.rebuild?.message]
        .filter(Boolean)
        .join(" "),
    );
    return result;
  };

  const handleSaveDraft = () => {
    startSaving(async () => {
      setStatus(null);
      const description = composeOrReport();
      if (description === null) return;
      const result = reportSave(
        await saveDraft({ gistId, description, content }),
        "Draft saved (secret gist)",
      );
      if (!result) return;
      setGistId(result.gistId);
      if (!props.gistId) router.replace(`/editor/${result.gistId}`);
    });
  };

  const handlePublish = () => {
    startSaving(async () => {
      setStatus(null);
      const description = composeOrReport();
      if (description === null) return;

      if (isPublic && gistId) {
        reportSave(
          await updatePublished({ gistId, description, content }),
          "Saved",
        );
        return;
      }

      const result = reportSave(
        await publishGist({ draftGistId: gistId, description, content }),
        "Published",
      );
      if (!result) return;
      setGistId(result.gistId);
      setIsPublic(true);
      router.replace(`/editor/${result.gistId}`);
    });
  };

  const gistStatus = !gistId ? "new" : isPublic ? "published" : "draft";

  return (
    // Full-bleed breakout: the root layout caps <main> at max-w-3xl, which is
    // too narrow for a split view. The preview column re-applies the real
    // article width internally, so fidelity is unaffected.
    <div className="relative left-1/2 w-dvw -translate-x-1/2 space-y-4 px-4">
      <MetadataBar
        value={entry}
        onChange={setEntry}
        slug={getSlug(entry.title)}
        status={gistStatus}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <MarkdownEditor value={content} onChange={setContent} />
        <PreviewPane
          node={preview}
          error={previewError}
          isPending={isPreviewPending}
          version={previewVersion}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {!isPublic && (
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={isSaving}
          >
            Save draft
          </Button>
        )}
        <Button onClick={handlePublish} disabled={isSaving}>
          {isPublic ? "Save & rebuild" : "Publish"}
        </Button>
        {status && <p className="prose-muted text-sm">{status}</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Write `app/editor/new/page.tsx`**

```tsx
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
```

- [ ] **Step 7: Verify in dev**

Run: `npm run lint && npx tsc --noEmit`, then `npm run dev`, open `http://localhost:3000/editor/new`.
Expected:
1. Typing markdown (try a fenced ```js block and a `## Heading`) updates the preview ~0.6s after you stop typing, with shiki highlighting and promoted headings exactly like a real article page.
2. Typing broken MDX (e.g. `<Foo`) shows the compile error strip; the last good preview stays.
3. "Save draft" with an empty title shows "Title is required." without a network call blowing up.
4. "Save draft" with a title creates a **secret** gist (check gist.github.com), the URL becomes `/editor/<id>`, and the status line confirms.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json components/editor/ app/editor/new/
git commit -m "feat: editor screen with exact-pipeline preview and draft saving"
```

---

### Task 6: Edit-existing route (`/editor/[gistId]`)

**Files:**
- Create: `app/editor/[gistId]/page.tsx`

**Interfaces:**
- Consumes: `getGistById` (Task 2), `parseEntry` (`@/lib/parse-entry`), `EditorScreen` (Task 5), `assertDevEditorPage` (Task 3).
- Produces: route `/editor/[gistId]`.

- [ ] **Step 1: Write `app/editor/[gistId]/page.tsx`**

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EditorScreen } from "@/components/editor/editor-screen";
import type { EntryInput } from "@/lib/compose-entry";
import parseEntry from "@/lib/parse-entry";
import { getGistById } from "@/repositories/gist";
import { assertDevEditorPage } from "../dev-only";

export const metadata: Metadata = {
  title: "Edit article",
  robots: { index: false, follow: false },
};

export default async function EditGistPage({
  params,
}: {
  params: Promise<{ gistId: string }>;
}) {
  assertDevEditorPage();

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
```

- [ ] **Step 2: Verify in dev**

Run: `npm run lint && npx tsc --noEmit`, then in `npm run dev`:
1. From `/editor`, click a **published** article → metadata bar prefilled, content loaded, buttons read "Save & rebuild" (no "Save draft").
2. Click the draft created in Task 5 → both "Save draft" and "Publish" show.
3. A bogus id (`/editor/nope`) → 404.

- [ ] **Step 3: Commit**

```bash
git add app/editor/\[gistId\]/
git commit -m "feat: edit existing gists in the editor"
```

---

### Task 7: End-to-end verification + production gate check

**Files:** none created — this task verifies the spec's acceptance criteria. Prereq: create the deploy hook in Vercel (Project → Settings → Git → Deploy Hooks, name `blog-editor`, branch `main`) and put its URL in `.env.local` as `VERCEL_DEPLOY_HOOK_URL=...` (never commit `.env.local`).

- [ ] **Step 1: Draft → publish round trip (dev server)**

1. `/editor/new` → type Blog, title "Editor smoke test", some markdown with a code fence → "Save draft" → confirm a **secret** gist on gist.github.com and that the article does NOT appear on the local site's list pages.
2. "Publish" → confirm: new **public** gist exists, the secret draft is gone, status line reports "Published. Production rebuild triggered.", and the Vercel dashboard shows a queued build.
3. Local site (thanks to `updateTag("gists")`): the article appears at `/blog/editor-smoke-test`, rendered identically to the preview.
4. Edit it, "Save & rebuild" → gist content updated, second build queued.
5. Clean up: delete the smoke-test gist on gist.github.com, click "Rebuild site" in `/editor`, and cancel the extra Vercel builds if unwanted.

- [ ] **Step 2: Production gate**

```bash
npm run build && npm run start
```

Then: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/editor` and the same for `/editor/new` — both must be `404`. Stop the server. Also confirm `npm run build` output contains no `/editor` static params errors.

- [ ] **Step 3: Final lint + commit anything outstanding**

```bash
npm run lint && npx tsc --noEmit
git status   # should be clean except intentionally uncommitted .env.local
```

- [ ] **Step 4: Wrap up**

Use the superpowers:finishing-a-development-branch flow if working on a branch; otherwise confirm `main` is clean and pushed only when the user asks.

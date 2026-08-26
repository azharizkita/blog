"use client";

import { useEffect, useRef } from "react";
import { ENTRY_TYPES, type EntryInput } from "@/lib/compose-entry";

interface MetadataBarProps {
  value: EntryInput;
  onChange: (value: EntryInput) => void;
}

/**
 * The gist's metadata head. The title is NOT here — it's the document's own
 * leading "## " heading (derived via lib/extract-title.ts); this renders
 * only the type/language chips and the description. Status and slug live in
 * the editor's sticky bar.
 */
export function MetadataBar({ value, onChange }: MetadataBarProps) {
  const set = (patch: Partial<EntryInput>) => onChange({ ...value, ...patch });

  // A sentence-length description doesn't fit a single-line input (it would
  // hard-clip at the column edge), so it's a textarea auto-grown to its
  // content. DOM style writes only — no state, so the no-setState-in-effect
  // lint rule doesn't apply.
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const element = descriptionRef.current;
    if (!element) return;
    element.style.height = "0";
    element.style.height = `${element.scrollHeight}px`;
  }, [value.description]);

  return (
    <div className="space-y-3">
      <div className="space-y-2 border-b pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <select
            id="entry-type"
            aria-label="Type"
            className="h-7 rounded-md bg-muted px-2 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
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

          {value.type === "Sharing" && (
            <input
              id="entry-lang"
              aria-label="Language tag"
              placeholder="lang"
              autoComplete="off"
              className="h-7 w-14 rounded-md bg-muted px-2 text-center text-xs outline-none placeholder:text-muted-foreground/40 focus-visible:ring-2 focus-visible:ring-ring/50"
              value={value.languageTag ?? ""}
              onChange={(event) => set({ languageTag: event.target.value })}
            />
          )}
        </div>

        <textarea
          ref={descriptionRef}
          id="entry-description"
          aria-label="Description"
          placeholder="Add a description…"
          autoComplete="off"
          rows={1}
          className="w-full resize-none bg-transparent text-sm text-muted-foreground outline-none placeholder:text-muted-foreground/40"
          value={value.description}
          onChange={(event) => set({ description: event.target.value })}
        />
      </div>
    </div>
  );
}

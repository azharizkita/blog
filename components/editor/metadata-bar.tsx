"use client";

import { ENTRY_TYPES, type EntryInput } from "@/lib/compose-entry";

interface MetadataBarProps {
  value: EntryInput;
  onChange: (value: EntryInput) => void;
}

/**
 * The gist's metadata, styled as the document's own head rather than a form:
 * the title reads like a title, and type/language/description sit in one
 * quiet row beneath it. Status and slug live in the editor's sticky bar.
 */
export function MetadataBar({ value, onChange }: MetadataBarProps) {
  const set = (patch: Partial<EntryInput>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-3">
      <input
        id="entry-title"
        aria-label="Title"
        placeholder="Title"
        autoComplete="off"
        className="w-full bg-transparent text-3xl font-bold tracking-tight outline-none placeholder:text-muted-foreground/40"
        value={value.title}
        onChange={(event) => set({ title: event.target.value })}
      />

      <div className="flex flex-wrap items-center gap-2 border-b pb-4">
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

        <input
          id="entry-description"
          aria-label="Description"
          placeholder="Add a description…"
          autoComplete="off"
          className="h-7 min-w-40 flex-1 bg-transparent text-sm text-muted-foreground outline-none placeholder:text-muted-foreground/40"
          value={value.description}
          onChange={(event) => set({ description: event.target.value })}
        />
      </div>
    </div>
  );
}

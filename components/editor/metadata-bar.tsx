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

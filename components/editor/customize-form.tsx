"use client";

import { useState, useTransition } from "react";
import { saveSiteCopy } from "@/app/editor/actions";
import { Button } from "@/components/ui/button";
import type { SiteCopy } from "@/repositories/settings";

interface CustomizeFormProps {
  initial: SiteCopy;
  tags: { slug: string; name: string; description: string | null }[];
}

function Field({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="prose-muted text-xs tracking-wide uppercase">
        {label}
      </span>
      <textarea
        rows={rows}
        className="w-full resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function CustomizeForm({ initial, tags }: CustomizeFormProps) {
  const [copy, setCopy] = useState<SiteCopy>(initial);
  const [status, setStatus] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  const save = () => {
    startSaving(async () => {
      setStatus(null);
      const result = await saveSiteCopy(copy);
      setStatus(
        result.ok
          ? "Saved. The live site picks this up on its next rebuild."
          : result.error,
      );
    });
  };

  return (
    <div className="space-y-6">
      <Field
        label="Hero description"
        value={copy.siteDescription}
        onChange={(siteDescription) => setCopy({ ...copy, siteDescription })}
      />
      <Field
        label="Footer note"
        value={copy.footerNote}
        onChange={(footerNote) => setCopy({ ...copy, footerNote })}
      />

      <div className="space-y-4 border-t pt-6">
        <h2 className="prose-h3">Tag descriptions</h2>
        {tags.map((tag) => (
          <Field
            key={tag.slug}
            label={tag.name}
            rows={2}
            value={copy.tagDescriptions[tag.slug] ?? tag.description ?? ""}
            onChange={(value) =>
              setCopy({
                ...copy,
                tagDescriptions: {
                  ...copy.tagDescriptions,
                  [tag.slug]: value,
                },
              })
            }
          />
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={isSaving}>
          Save
        </Button>
        {status && <p className="prose-muted text-sm">{status}</p>}
      </div>
    </div>
  );
}

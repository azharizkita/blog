import { Button } from "@/components/ui/button";
import type { SaveGuardFailure } from "@/components/editor/wysiwyg";

export interface SaveGuardPanelProps {
  guard: SaveGuardFailure;
  /** Omit when there is no loaded block to restore. */
  onRestore?: () => void;
  onKeepEditing: () => void;
  onForceSave: () => void;
  /** Disables the actions while a save is in progress. */
  disabled?: boolean;
}

function Source({ label, source }: { label: string; source: string | null }) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="prose-muted text-xs">{label}</p>
      <pre className="overflow-x-auto rounded-md border bg-background/60 p-2 font-mono text-xs whitespace-pre-wrap">
        {source === null ? (
          <span className="text-muted-foreground italic">(missing)</span>
        ) : (
          source
        )}
      </pre>
    </div>
  );
}

export function SaveGuardPanel({
  guard,
  onRestore,
  onKeepEditing,
  onForceSave,
  disabled,
}: SaveGuardPanelProps) {
  const n = guard.blockIndex + 1;
  return (
    <div
      role="alert"
      className="space-y-3 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm"
    >
      <div className="space-y-1">
        <p className="font-medium">Save stopped — nothing was written</p>
        <p>
          Saving would change what readers see in 1 place. The editor compares
          what it&apos;s about to save against what it loaded, block by block,
          using the same parser as the live site.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Source label={`Loaded · block ${n}`} source={guard.loadedSource} />
        <Source
          label={`About to save · block ${n}`}
          source={guard.savingSource}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {onRestore && <Button size="sm" onClick={onRestore} disabled={disabled}>Restore block &amp; save</Button>}
        <Button variant="outline" size="sm" onClick={onKeepEditing} disabled={disabled}>
          Keep editing
        </Button>
        <Button variant="outline" size="sm" onClick={onForceSave} disabled={disabled}>
          I deleted it on purpose — save
        </Button>
      </div>
    </div>
  );
}

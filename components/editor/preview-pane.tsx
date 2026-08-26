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

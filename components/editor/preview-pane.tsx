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

/**
 * The exact server-rendered article, flowing in the page like the published
 * page does — the parent column already matches the article column, so no
 * frame, no inner scroll region.
 */
export function PreviewPane({ node, error, isPending, version }: PreviewPaneProps) {
  return (
    <div className={cn("pb-8 transition-opacity", isPending && "opacity-60")}>
      {error && (
        <p className="mb-6 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 font-mono text-xs whitespace-pre-wrap text-destructive">
          {error}
        </p>
      )}
      <PreviewErrorBoundary key={version}>{node}</PreviewErrorBoundary>
    </div>
  );
}

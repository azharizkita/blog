"use client";

import type { CSSProperties } from "react";

import { formatTime, seekSong, type SongState } from "./song";

/**
 * The scrubber, shared by the now-playing screen and the dock: a hairline
 * that fills with red, with a small red ball for a thumb.
 */
export function SongSeek({
  song,
  className,
}: {
  song: SongState;
  className?: string;
}) {
  const { current, duration } = song;
  const progress = duration > 0 ? Math.min(current / duration, 1) : 0;

  return (
    <input
      type="range"
      className={className ? `t23-song-seek ${className}` : "t23-song-seek"}
      min={0}
      max={duration || 0}
      step={0.1}
      value={Math.min(current, duration || 0)}
      onChange={(event) => seekSong(Number(event.target.value))}
      aria-label="Seek"
      aria-valuetext={`${formatTime(current)} of ${formatTime(duration)}`}
      style={{ "--p": progress } as CSSProperties}
    />
  );
}

"use client";

import { useEffect, useRef } from "react";

import { CAM, SONG } from "./copy";
import { Flipbook } from "./flipbook";
import { PauseIcon, PlayIcon } from "./player";
import { SongSeek } from "./seek";
import { formatTime, skipSong, toggleSong, useSong } from "./song";

/**
 * The first thing she sees once the intro has gone: the song, the way a music
 * app shows what's playing, with the year flipping by as its artwork.
 *
 * On a phone the artwork is the whole screen and the controls sit over the
 * bottom of it; on a wider screen it is a square record sleeve with the
 * controls under it, which settles back a little while the song is paused.
 *
 * While this screen is in view the docked player (player.tsx) steps aside;
 * this marks the page root with data-np-in for that.
 */

const SKIP = 10;

export function NowPlaying() {
  const song = useSong();
  const panelRef = useRef<HTMLDivElement>(null);

  // The dock takes over once these controls have scrolled out of view.
  useEffect(() => {
    const panel = panelRef.current;
    const root = panel?.closest(".t23");
    if (!panel || !root) return;
    const observer = new IntersectionObserver(([entry]) =>
      entry.isIntersecting
        ? root.setAttribute("data-np-in", "")
        : root.removeAttribute("data-np-in"),
    );
    observer.observe(panel);
    return () => {
      observer.disconnect();
      root.removeAttribute("data-np-in");
    };
  }, []);

  const remaining = Math.max(song.duration - song.current, 0);

  return (
    <section
      className="t23-np"
      aria-label="now playing"
      data-playing={song.playing || undefined}
    >
      <div className="t23-np-art">
        {/* Sized under the screen's full resolution on a phone: the photos cut
            past four times a beat, and smaller files load sooner. */}
        <Flipbook sizes="(min-width: 44rem) 28rem, 60vw" />
        {/* Shown only in the NewJeans look (twenty-three.css). */}
        <div className="t23-cam" aria-hidden="true">
          <span className="t23-cam-rec">{CAM.rec}</span>
          <span>{CAM.stamp}</span>
        </div>
      </div>

      <div ref={panelRef} className="t23-np-panel">
        <div className="t23-np-meta">
          <p className="t23-np-title">{SONG.title}</p>
          <p className="t23-np-artist">{SONG.artist}</p>
        </div>

        <div className="t23-np-scrub">
          <SongSeek song={song} className="t23-np-seek" />
          <div className="t23-np-times" aria-hidden="true">
            <span>{formatTime(song.current)}</span>
            <span>-{formatTime(remaining)}</span>
          </div>
        </div>

        <div className="t23-np-controls">
          <button
            type="button"
            className="t23-np-skip"
            onClick={() => skipSong(-SKIP)}
            aria-label={`Back ${SKIP} seconds`}
          >
            <SkipIcon />
          </button>

          <button
            type="button"
            className="t23-song-play t23-np-play"
            onClick={toggleSong}
            aria-label={song.playing ? "Pause" : "Play"}
          >
            <span className="t23-ball t23-song-ball" aria-hidden="true">
              {song.playing ? <PauseIcon /> : <PlayIcon />}
            </span>
          </button>

          <button
            type="button"
            className="t23-np-skip t23-np-skip--ahead"
            onClick={() => skipSong(SKIP)}
            aria-label={`Forward ${SKIP} seconds`}
          >
            <SkipIcon />
          </button>
        </div>

        <svg className="t23-np-cue" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 9.5 6 5.5 6-5.5" />
        </svg>
      </div>
    </section>
  );
}

/** Two triangles pointing back; mirrored in CSS for "ahead". */
function SkipIcon() {
  return (
    <svg viewBox="0 0 32 24" className="t23-np-skip-icon" aria-hidden="true">
      <path d="M15 5.6v12.8a.9.9 0 0 1-1.4.75L4.4 12.75a.9.9 0 0 1 0-1.5l9.2-6.4A.9.9 0 0 1 15 5.6Z" />
      <path d="M28 5.6v12.8a.9.9 0 0 1-1.4.75l-9.2-6.4a.9.9 0 0 1 0-1.5l9.2-6.4A.9.9 0 0 1 28 5.6Z" />
    </svg>
  );
}

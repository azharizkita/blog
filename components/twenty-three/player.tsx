"use client";

import { SONG } from "./copy";
import { SongSeek } from "./seek";
import { formatTime, toggleSong, useSong } from "./song";

/**
 * The song, played from the blog itself so the whole track plays for anyone
 * without signing in. Besides the now-playing screen at the top, it sits
 * docked at the bottom of the screen (it starts from the intro and keeps
 * going in the background), so she can pause or scrub from anywhere on the
 * page. The dock stays out of the way while the now-playing screen is in
 * view. The play button is another red ball.
 *
 * The <audio> element carries a fixed id (SONG.elementId); song.ts uses it to
 * drive and read the song from everywhere else.
 */
export function Player() {
  const song = useSong();

  return (
    <div className="t23-dock">
      <div className="t23-song" data-playing={song.playing || undefined}>
        {/* Loops, so it is still playing whenever she reaches the dial.
            preload="none": the intro's loader (preload.ts) fetches the song
            after first paint and hands it over, so it never competes with
            the page appearing. */}
        <audio id={SONG.elementId} src={SONG.src} preload="none" loop />

        <button
          type="button"
          className="t23-song-play"
          onClick={toggleSong}
          aria-label={song.playing ? "Pause" : "Play"}
        >
          <span className="t23-ball t23-song-ball" aria-hidden="true">
            {song.playing ? <PauseIcon /> : <PlayIcon />}
          </span>
        </button>

        <div className="t23-song-body">
          <p className="t23-song-title">
            {SONG.title} <span className="t23-song-artist">{SONG.artist}</span>
          </p>
          <div className="t23-song-track">
            <SongSeek song={song} />
            <span className="t23-song-time" aria-hidden="true">
              {formatTime(song.current)} / {formatTime(song.duration)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PlayIcon({ className = "t23-song-icon" }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path d="M9 6.5v11a.8.8 0 0 0 1.2.7l8.6-5.5a.8.8 0 0 0 0-1.4l-8.6-5.5A.8.8 0 0 0 9 6.5Z" />
    </svg>
  );
}

export function PauseIcon({ className = "t23-song-icon" }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <rect x="7" y="6" width="3.4" height="12" rx="1" />
      <rect x="13.6" y="6" width="3.4" height="12" rx="1" />
    </svg>
  );
}

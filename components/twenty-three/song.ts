import { useSyncExternalStore } from "react";

import { SONG } from "./copy";

/**
 * The page's one <audio> element lives in player.tsx under a fixed id. These
 * helpers let the intro, the now-playing screen, the dock and the dial all
 * drive it and read its state without passing React state around.
 */

export function getSong(): HTMLAudioElement | null {
  const audio = document.getElementById(SONG.elementId);
  return audio instanceof HTMLAudioElement ? audio : null;
}

let fade = 0;

/**
 * Plays the song, easing the volume up so it arrives rather than starts.
 * Call it straight from a click handler: phones only allow audio to start
 * inside a tap.
 */
export function playSong(from?: number) {
  const audio = getSong();
  if (!audio) return;
  if (from !== undefined) audio.currentTime = from;

  cancelAnimationFrame(fade);
  audio.volume = 0;
  void audio.play().catch(() => {});

  const start = performance.now();
  const ramp = (now: number) => {
    const t = Math.min((now - start) / 1600, 1);
    audio.volume = t * t;
    if (t < 1) fade = requestAnimationFrame(ramp);
  };
  fade = requestAnimationFrame(ramp);
}

/** Play/pause from a button: straight to full volume, no fade. */
export function toggleSong() {
  const audio = getSong();
  if (!audio) return;
  if (audio.paused) {
    cancelAnimationFrame(fade);
    audio.volume = 1;
    void audio.play().catch(() => {});
  } else audio.pause();
}

export function seekSong(to: number) {
  const audio = getSong();
  if (!audio) return;
  const end = Number.isFinite(audio.duration) ? audio.duration : SONG.duration;
  audio.currentTime = Math.min(Math.max(to, 0), end);
}

export function skipSong(by: number) {
  const audio = getSong();
  if (audio) seekSong(audio.currentTime + by);
}

/* ---------- state, for anything that shows the song ---------- */

export type SongState = {
  playing: boolean;
  current: number;
  duration: number;
};

const INITIAL: SongState = {
  playing: false,
  current: 0,
  duration: SONG.duration,
};

let state = INITIAL;
let bound: HTMLAudioElement | null = null;
const listeners = new Set<() => void>();
const EVENTS = [
  "play",
  "pause",
  "ended",
  "timeupdate",
  "seeked",
  "loadedmetadata",
  "durationchange",
] as const;

function sync() {
  const audio = bound;
  if (!audio) return;
  const next: SongState = {
    playing: !audio.paused && !audio.ended,
    current: audio.currentTime,
    duration: Number.isFinite(audio.duration) ? audio.duration : SONG.duration,
  };
  if (
    next.playing === state.playing &&
    next.current === state.current &&
    next.duration === state.duration
  )
    return;
  state = next;
  listeners.forEach((listener) => listener());
}

/** Attaches to the <audio> element, once it exists (and again if replaced). */
function bind() {
  const audio = getSong();
  if (!audio || audio === bound) return;
  if (bound) EVENTS.forEach((type) => bound?.removeEventListener(type, sync));
  bound = audio;
  EVENTS.forEach((type) => audio.addEventListener(type, sync));
  sync();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  bind();
  // The <audio> element may mount after the first subscriber (it is later in
  // the tree), so try again once this commit has settled.
  const retry = requestAnimationFrame(bind);
  return () => {
    cancelAnimationFrame(retry);
    listeners.delete(listener);
  };
}

/** The song's state; re-renders on play, pause, seek and time updates. */
export function useSong(): SongState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => INITIAL,
  );
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

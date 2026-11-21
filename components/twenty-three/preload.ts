import { useSyncExternalStore } from "react";

import { SONG } from "./copy";
import { getSong } from "./song";

/**
 * Loads everything the story needs while she is still in the intro, so the
 * page never stutters once it starts: every photo on the page, then the
 * song. The intro shows the progress (intro.tsx) and only lets her into the
 * page once it is done.
 *
 * Nothing heavy is requested at first paint (the flipbook photos are lazy
 * and the <audio> element starts with preload="none"); this starts once
 * the page has loaded, so the intro itself paints straight away even on a
 * slow phone connection.
 *
 * - Photos: every <img> in the page is switched to eager loading, so the
 *   browser fetches exactly the size it will show, and is decoded.
 * - Song: fetched in full with progress, then handed to the <audio> element
 *   as an in-memory blob, so playback never waits on the network (and works
 *   on iPhones, which won't preload audio before a tap).
 *
 * On a slow connection she isn't kept waiting for the whole song: once the
 * photos are in and LET_IN_MS has passed, the song download is cancelled
 * (so nothing competes) and the <audio> element streams it from its URL,
 * which a phone connection keeps up with easily (96 kbps). If even the
 * photos take longer than GIVE_UP_MS, she's let in anyway.
 */

const LET_IN_MS = 18_000;
const GIVE_UP_MS = 45_000;
// Share of the bar each part takes (the song is most of the bytes).
const PHOTO_SHARE = 0.3;

export type LoadState = { progress: number; ready: boolean };

let state: LoadState = { progress: 0, ready: false };
let started = false;
const listeners = new Set<() => void>();

/** Marks the page root once the photos are in (twenty-three.css shows the
 * flipbook from then on). */
function markPhotos() {
  document.querySelector(".t23")?.setAttribute("data-photos", "");
}

function set(next: Partial<LoadState>) {
  const merged = { ...state, ...next };
  if (merged.progress === state.progress && merged.ready === state.ready)
    return;
  state = merged;
  listeners.forEach((listener) => listener());
}

function loadPhotos(onEach: (done: number, total: number) => void) {
  const images = Array.from(
    document.querySelectorAll<HTMLImageElement>(".t23-page img"),
  );
  let done = 0;
  const tick = () => onEach(++done, images.length);
  if (!images.length) {
    onEach(0, 0);
    return Promise.resolve();
  }
  return Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          const finish = () => {
            img
              .decode()
              .catch(() => {})
              .finally(() => {
                tick();
                resolve();
              });
          };
          if (img.complete && img.naturalWidth) return finish();
          img.addEventListener("load", finish, { once: true });
          img.addEventListener(
            "error",
            () => {
              tick();
              resolve();
            },
            { once: true },
          );
          img.loading = "eager";
        }),
    ),
  ).then(() => {});
}

async function loadSong(
  onProgress: (fraction: number) => void,
  signal: AbortSignal,
) {
  const response = await fetch(SONG.src, { signal });
  if (!response.ok || !response.body) throw new Error("song");
  const total = Number(response.headers.get("content-length")) || 0;
  const reader = response.body.getReader();
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    if (total) onProgress(Math.min(received / total, 1));
  }
  onProgress(1);
  const blob = new Blob(chunks, {
    type: response.headers.get("content-type") || "audio/mp4",
  });
  const audio = getSong();
  // Only swap the source if the song hasn't started from the network yet.
  if (audio && audio.paused && audio.currentTime === 0) {
    audio.src = URL.createObjectURL(blob);
    audio.preload = "auto";
    audio.load();
  }
}

/** Starts loading once; safe to call from several places. */
export function startPreload() {
  if (started || typeof window === "undefined") return;
  started = true;

  let photos = 0;
  let song = 0;
  const update = () =>
    set({ progress: photos * PHOTO_SHARE + song * (1 - PHOTO_SHARE) });
  const startedAt = performance.now();
  const abort = new AbortController();
  // Lets her in, stopping the song download if it's still going.
  const letIn = () => {
    window.clearTimeout(giveUp);
    window.clearTimeout(early);
    abort.abort();
    markPhotos();
    set({ progress: 1, ready: true });
  };
  const giveUp = window.setTimeout(letIn, GIVE_UP_MS);
  let early = 0;

  const run = async () => {
    await loadPhotos((done, total) => {
      photos = total ? done / total : 1;
      update();
    });
    markPhotos();
    // Photos are in: from here, don't keep her past LET_IN_MS in total.
    early = window.setTimeout(
      letIn,
      Math.max(0, LET_IN_MS - (performance.now() - startedAt)),
    );
    try {
      await loadSong((fraction) => {
        song = fraction;
        update();
      }, abort.signal);
    } catch {
      // Cancelled or failed: the <audio> element streams from its URL.
    }
    letIn();
  };

  // After the page's own load, so the intro is on screen first.
  if (document.readyState === "complete") void run();
  else window.addEventListener("load", () => void run(), { once: true });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const SERVER: LoadState = { progress: 0, ready: false };

export function usePreload(): LoadState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => SERVER,
  );
}

"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

import { FLIPBOOK, SONG } from "./copy";
import { getSong } from "./song";

/**
 * The year as a flipbook: every photo stacked in one frame, one shown at a
 * time, cut (not faded) from one to the next.
 *
 * It runs on the song's clock rather than its own: the frame is picked from
 * the audio's current time on the song's beat grid (see FLIPBOOK in
 * copy.ts). So the cuts land on the music, stop when the song pauses,
 * follow her when she scrubs, and loop with the song. Frames are switched straight on
 * the DOM inside a requestAnimationFrame loop (no React renders), and only
 * once a photo has been decoded, so a cut never lands on a blank frame.
 * The loop sleeps while the flipbook is off screen.
 *
 * The order is shuffled on every visit (see shuffledOrder below): each pass
 * through the photos is a fresh shuffle, and a photo never comes straight
 * back, neither twice in a row nor A → B → A. It's laid out over the whole
 * song up front, so the n-th cut is always the same photo and scrubbing or
 * looping the song still lands where it should.
 */
export function Flipbook({ sizes }: { sizes: string }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const frames = Array.from(root.querySelectorAll<HTMLImageElement>("img"));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    // The frames that are ready to be cut to.
    const ready = new Set<number>();
    const markReady = (index: number) => {
      frames[index]
        .decode()
        .catch(() => {})
        .then(() => {
          if (frames[index].naturalWidth) ready.add(index);
        });
    };

    // One shuffled order per pace, exactly one play of the song long, so
    // when the song loops the order wraps at the same moment (and the join
    // is checked too). Re-laid out if the file's real length differs.
    const beat = 60 / FLIPBOOK.bpm;
    const fastStep = beat / FLIPBOOK.framesPerBeat;
    const slowStep = beat * FLIPBOOK.reducedBeatsPerFrame;
    const cutsIn = (duration: number, step: number) =>
      Math.floor((duration - FLIPBOOK.firstBeat) / step) + 1;
    let laidFor = 0;
    let fast: number[] = [];
    let slow: number[] = [];
    const layOut = (duration: number) => {
      laidFor = duration;
      fast = shuffledOrder(frames.length, cutsIn(duration, fastStep));
      slow = shuffledOrder(frames.length, cutsIn(duration, slowStep));
    };
    layOut(SONG.duration);
    const offLoad = frames.map((img, index) => {
      if (img.complete) {
        markReady(index);
        return () => {};
      }
      const onLoad = () => markReady(index);
      img.addEventListener("load", onLoad, { once: true });
      return () => img.removeEventListener("load", onLoad);
    });

    let shown = 0;
    const show = (index: number) => {
      if (index === shown) return;
      frames[shown].removeAttribute("data-on");
      frames[index].setAttribute("data-on", "");
      shown = index;
    };

    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      // Cut on the beat grid: a beat is 60 / bpm seconds, and each photo
      // holds for a fraction of one (or, with reduced motion, several).
      const song = getSong();
      const duration = song?.duration;
      if (
        duration &&
        Number.isFinite(duration) &&
        Math.abs(duration - laidFor) > 0.5
      )
        layOut(duration);
      const step = reduced.matches ? slowStep : fastStep;
      const sequence = reduced.matches ? slow : fast;
      const time = song?.currentTime ?? 0;
      const count = Math.max(Math.floor((time - FLIPBOOK.firstBeat) / step), 0);
      const next = sequence[count % sequence.length];
      // A photo still loading is skipped: the last one simply holds.
      if (ready.has(next)) show(next);
    };
    const start = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const observer = new IntersectionObserver(([entry]) =>
      entry.isIntersecting ? start() : stop(),
    );
    observer.observe(root);

    return () => {
      stop();
      observer.disconnect();
      offLoad.forEach((off) => off());
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="t23-flip"
      role="img"
      aria-label={FLIPBOOK.label}
    >
      {FLIPBOOK.frames.map((frame, index) => (
        <Image
          key={frame.src}
          src={frame.src}
          alt=""
          fill
          sizes={sizes}
          // Lazy here; the intro's loader (preload.ts) fetches them all
          // after first paint, before she reaches this screen.
          loading="lazy"
          className="t23-flip-frame"
          style={{ objectPosition: frame.focus }}
          data-on={index === 0 ? "" : undefined}
        />
      ))}
    </div>
  );
}

/**
 * `length` frame indices (0 … n-1): back-to-back shuffles of all n (the last
 * one cut short to fit), so each photo shows once per pass, where no photo
 * follows itself and none comes back after just one other (A → B → A).
 * Checked across the joins between shuffles too, including the wrap from
 * the end back to the start, since the song loops.
 */
function shuffledOrder(n: number, length: number): number[] {
  if (n < 3) return Array.from({ length }, (_, i) => i % n);
  const shuffle = () => {
    const pass = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pass[i], pass[j]] = [pass[j], pass[i]];
    }
    return pass;
  };
  // True if `after` can follow `before` without a repeat or an A → B → A.
  const fits = (before: number[], after: number[]) => {
    const [y, z] = before.slice(-2);
    return after[0] !== z && after[0] !== y && after[1] !== z;
  };

  for (;;) {
    const order = shuffle();
    while (order.length < length) {
      let pass = shuffle();
      while (!fits(order, pass)) pass = shuffle();
      order.push(...pass);
    }
    order.length = length;
    // The end must lead back into the start; otherwise lay it out again
    // (rare, and cheap).
    if (length < 4 || fits(order, order)) return order;
  }
}

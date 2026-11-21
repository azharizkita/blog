"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

import { COPY } from "./copy";

/**
 * The dial at the end of /23: a numeral with lettering and a red ball in
 * orbit around it. Tap it (or turn it with a finger, like a record) and it
 * spins up; the stage goes dizzy while it is fast, and once the spin has come
 * back down the caption underneath is replaced by one more line.
 *
 * The spin is a tiny simulation (angle + angular velocity with friction)
 * stepped in requestAnimationFrame and written straight to the DOM, so React
 * only re-renders for the three phase changes. The loop sleeps while the
 * dial is off screen or the tab is hidden, and never starts under
 * prefers-reduced-motion: there, activating the dial just shows the line.
 */

type Phase = "idle" | "spinning" | "revealed";

// Degrees per second unless noted.
const DRIFT = 5; // resting speed: one lazy turn every 72s
const KICK = 800; // added by a tap
const TOP_SPEED = 1600;
const FRICTION = 0.9; // 1/s; how fast a spin decays back to DRIFT
const ARM_SPEED = 260; // a turn slower than this isn't "a spin"...
const ARM_TRAVEL = 200; // ...unless the dial was dragged this far (deg)
const SETTLED = 26; // within this of DRIFT, the spin has come down
const GRAB_TRAVEL = 8; // a finger has to turn this far (deg) to take hold
const TAP_TRAVEL = 30; // a quick press that turned less than this is a tap
const TAP_TIME = 350; // ms
const DEAD_ZONE = 0.22; // of the radius; nearer the centre, angle is noise

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** Advance width per glyph. The ring is set in a monospace face (the lokey
 * type), so every glyph, space included, takes the same width; proportional
 * widths here would open gaps around the narrow letters ("t w enty"). */
function glyphWidth(): number {
  return 1;
}

/** Lays `text` around a full circle; returns each glyph with its angle. */
function layoutRing(text: string, repeat: number) {
  const chars = Array.from(text.repeat(repeat));
  const widths = chars.map(glyphWidth);
  const total = widths.reduce((sum, width) => sum + width, 0);
  let travelled = 0;
  return chars.map((char, index) => {
    const angle = ((travelled + widths[index] / 2) / total) * 360;
    travelled += widths[index];
    return { char, angle: `${angle.toFixed(2)}deg` };
  });
}

const RING = layoutRing(COPY.ring, 2);

/** Where a pointer is relative to the dial's centre: its angle in degrees,
 * and its distance as a fraction of the dial's radius. */
function locate(event: React.PointerEvent<HTMLElement>) {
  const box = event.currentTarget.getBoundingClientRect();
  const x = event.clientX - (box.left + box.width / 2);
  const y = event.clientY - (box.top + box.height / 2);
  return {
    angle: (Math.atan2(y, x) * 180) / Math.PI,
    reach: Math.hypot(x, y) / (box.width / 2),
  };
}

export function Spin() {
  const [phase, setPhase] = useState<Phase>("idle");

  const stageRef = useRef<HTMLElement>(null);
  const orbitRef = useRef<HTMLSpanElement>(null);
  const secretRef = useRef<HTMLParagraphElement>(null);

  // Simulation state. Lives in a ref: it changes every frame and nothing in
  // the React tree needs to know.
  const sim = useRef({
    angle: 0,
    omega: DRIFT,
    dizzy: 0,
    armed: false,
    revealed: false,
    reducedMotion: false,
    // One press of a pointer, from down to up:
    pressed: false,
    grabbed: false, // the finger has turned far enough to own the angle
    travel: 0,
    lastPointerAngle: 0,
    lastPointerTime: 0,
    pressStartedAt: 0,
    pressEndedAt: -Infinity,
  });

  useEffect(() => {
    const stage = stageRef.current;
    const orbit = orbitRef.current;
    if (!stage || !orbit) return;

    const s = sim.current;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let previous = 0;
    let onScreen = false;
    let wasDizzy = false;

    const step = (now: number) => {
      frame = requestAnimationFrame(step);
      const dt = previous ? Math.min((now - previous) / 1000, 0.05) : 0;
      previous = now;

      if (s.grabbed) {
        // A finger is turning the dial, so the pointer handlers own the
        // angle. If the finger stops, so has the dial.
        if (now - s.lastPointerTime > 70) s.omega *= Math.exp(-10 * dt);
      } else {
        // Coasting: friction eases the spin back to DRIFT.
        s.omega = DRIFT + (s.omega - DRIFT) * Math.exp(-FRICTION * dt);
        s.angle = (s.angle + s.omega * dt) % 360;
      }
      orbit.style.transform = `rotate(${s.angle.toFixed(2)}deg)`;

      // Dizziness follows speed: quick to arrive, slow to leave.
      const speed = Math.abs(s.omega);
      const target = clamp((speed - 40) / 900, 0, 1);
      const rate = target > s.dizzy ? 9 : 2.2;
      s.dizzy += (target - s.dizzy) * (1 - Math.exp(-rate * dt));
      if (s.dizzy < 0.002) s.dizzy = 0;

      // Written only while there is something to show, plus one last frame
      // to put everything back at zero.
      const isDizzy = s.dizzy > 0;
      if (isDizzy || wasDizzy) {
        const sway = Math.sin((now / 1000) * 2.6) * 2.4 * s.dizzy;
        const tail = clamp(speed / TOP_SPEED, 0, 1) * 0.42;
        const trail = clamp((speed - 60) / 420, 0, 1) * 0.9;
        stage.style.setProperty("--t23-dizzy", s.dizzy.toFixed(3));
        stage.style.setProperty("--t23-sway", sway.toFixed(3));
        stage.style.setProperty("--t23-tail", `${tail.toFixed(3)}turn`);
        stage.style.setProperty("--t23-trail", trail.toFixed(3));
        stage.style.setProperty("--t23-dir", s.omega < 0 ? "-1" : "1");
        if (isDizzy !== wasDizzy) stage.toggleAttribute("data-dizzy", isDizzy);
        wasDizzy = isDizzy;
      }

      // The comedown: an armed spin has slowed to a drift and the stage has
      // stopped swimming.
      if (
        s.armed &&
        !s.pressed &&
        Math.abs(s.omega - DRIFT) < SETTLED &&
        s.dizzy < 0.1
      ) {
        s.armed = false;
        s.revealed = true;
        setPhase("revealed");
      }
    };

    const sync = () => {
      s.reducedMotion = reduceMotion.matches;
      const shouldRun = onScreen && !document.hidden && !reduceMotion.matches;
      if (shouldRun && !frame) {
        previous = 0;
        frame = requestAnimationFrame(step);
      } else if (!shouldRun && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        sync();
      },
      { rootMargin: "120px" },
    );
    observer.observe(stage);
    document.addEventListener("visibilitychange", sync);
    reduceMotion.addEventListener("change", sync);
    sync();

    // The canvas behind the page (overscroll, scrollbar gutter) wears the top
    // of the sky until the reader is past the midpoint, then the bottom; see
    // the html[data-t23-low] rule in twenty-three.css.
    const root = document.documentElement;
    const markHalf = () => {
      const scrollable = root.scrollHeight - window.innerHeight;
      root.toggleAttribute(
        "data-t23-low",
        scrollable > 0 && window.scrollY > scrollable / 2,
      );
    };
    window.addEventListener("scroll", markHalf, { passive: true });
    markHalf();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      reduceMotion.removeEventListener("change", sync);
      window.removeEventListener("scroll", markHalf);
      root.removeAttribute("data-t23-low");
    };
  }, []);

  // Bring the new line into view if it landed below the fold.
  useEffect(() => {
    if (phase !== "revealed") return;
    secretRef.current?.scrollIntoView({
      block: "nearest",
      behavior: sim.current.reducedMotion ? "auto" : "smooth",
    });
  }, [phase]);

  /** A spin worth the name has started; its comedown will reveal the line. */
  const arm = () => {
    const s = sim.current;
    if (s.armed || s.revealed) return;
    if (s.reducedMotion) {
      s.revealed = true;
      setPhase("revealed");
      return;
    }
    s.armed = true;
    setPhase("spinning");
  };

  /** A tap: more speed, in whichever direction it is already going. */
  const kick = () => {
    const s = sim.current;
    const direction = s.omega < -60 ? -1 : 1;
    s.omega = clamp(s.omega + direction * KICK, -TOP_SPEED, TOP_SPEED);
    arm();
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const s = sim.current;
    s.pressed = true;
    s.grabbed = false;
    s.travel = 0;
    s.lastPointerAngle = locate(event).angle;
    s.lastPointerTime = event.timeStamp;
    s.pressStartedAt = event.timeStamp;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const s = sim.current;
    if (!s.pressed) return;
    const at = locate(event);
    // Shortest signed arc since the last sample.
    const delta = ((at.angle - s.lastPointerAngle + 540) % 360) - 180;
    const dt = Math.max((event.timeStamp - s.lastPointerTime) / 1000, 0.001);
    s.lastPointerAngle = at.angle;
    s.lastPointerTime = event.timeStamp;

    // Near the centre a pixel of wobble is half a turn; ignore it there.
    if (at.reach < DEAD_ZONE) return;
    s.travel += Math.abs(delta);
    // A finger never lands perfectly still. Until it has clearly turned the
    // dial, this is still a tap and the dial keeps coasting underneath it.
    if (s.travel < GRAB_TRAVEL) return;
    s.grabbed = true;

    if (!s.reducedMotion) {
      s.angle = (s.angle + delta) % 360;
      const instant = clamp(delta / dt, -TOP_SPEED, TOP_SPEED);
      s.omega += (instant - s.omega) * 0.4;
    }
    if (Math.abs(s.omega) >= ARM_SPEED || s.travel >= ARM_TRAVEL) arm();
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    const s = sim.current;
    if (!s.pressed) return;
    const wasGrabbed = s.grabbed;
    s.pressed = false;
    s.grabbed = false;
    s.pressEndedAt = event.timeStamp;
    // A tap, including the quick, slightly smeared kind a thumb makes, as
    // long as it hasn't already become a spin of its own.
    const quick = event.timeStamp - s.pressStartedAt < TAP_TIME;
    if (!wasGrabbed || (quick && s.travel < TAP_TRAVEL && !s.armed)) kick();
  };

  const handlePointerCancel = () => {
    const s = sim.current;
    s.pressed = false;
    s.grabbed = false;
  };

  // Pointer presses are handled above (a wobbly tap doesn't always produce a
  // click). This covers what arrives as a bare click: the keyboard, and
  // assistive tech that activates the button without pointer events.
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (event.timeStamp - sim.current.pressEndedAt < 500) return;
    kick();
  };

  return (
    <section ref={stageRef} className="t23-stage" data-phase={phase}>
      <div className="t23-sun" aria-hidden="true" />
      <div className="t23-swing">
        <button
          type="button"
          className="t23-dial"
          aria-label={COPY.dialLabel}
          onClick={handleClick}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
        >
          <span ref={orbitRef} className="t23-orbit" aria-hidden="true">
            <span className="t23-ring">
              {RING.map((glyph, index) => (
                <span
                  key={index}
                  style={{ "--a": glyph.angle } as CSSProperties}
                >
                  {glyph.char}
                </span>
              ))}
            </span>
            <span className="t23-trail" />
            <span className="t23-ball t23-ball--orbit" />
          </span>
          <span className="t23-numeral" aria-hidden="true">
            {COPY.numeral}
          </span>
        </button>

        <div className="t23-after" aria-live="polite">
          <p className="t23-hint">{COPY.hint}</p>
          {phase === "revealed" && (
            <p ref={secretRef} className="t23-secret">
              <span style={{ "--i": 0 } as CSSProperties}>
                {COPY.afterSpin}
              </span>
              <span style={{ "--i": 1 } as CSSProperties}>
                {COPY.afterSpinNote}
                <a
                  className="t23-guy"
                  href={COPY.afterSpinHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {COPY.afterSpinLink}
                </a>
              </span>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

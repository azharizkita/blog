"use client";

import { useEffect, useRef, useState } from "react";

import { INTRO, LOADING, type IntroStep } from "./copy";
import { startPreload, usePreload } from "./preload";
import { playSong } from "./song";
import { Rich } from "./rich";

/**
 * The prompt she meets before the page: a short conversation that ends with
 * the song playing. It covers everything from the very first paint (it is
 * server-rendered open), holds the page still and inert behind it, and lets
 * the page start its entrance only once it has gone.
 *
 * The page root carries `data-intro` from the server; removing it is what
 * un-pauses the title animation (see twenty-three.css).
 *
 * It also loads the whole page behind it (preload.ts) and shows that as a
 * small bar. The steps that lead into the page wait until it's done, so the
 * song and the photos are already there when she gets in.
 */

const LEAVE_MS = 900;
const ANYWAY_MS = 2600;

export function Intro() {
  const [step, setStep] = useState<IntroStep>("hello");
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const stepRef = useRef<HTMLDivElement>(null);
  const firstStep = useRef(true);
  const load = usePreload();

  useEffect(startPreload, []);

  // While open, everything else on the page is inert (no tabbing behind it).
  useEffect(() => {
    const page = rootRef.current?.closest(".t23")?.querySelector(".t23-page");
    if (!page || gone) return;
    page.setAttribute("inert", "");
    return () => page.removeAttribute("inert");
  }, [gone]);

  // A new step takes focus (the button that led here is gone), so keyboard
  // and screen-reader users land on the new words. The first step is left
  // alone: nothing to move away from yet.
  useEffect(() => {
    if (firstStep.current) {
      firstStep.current = false;
      return;
    }
    stepRef.current?.focus({ preventScroll: true });
  }, [step]);

  const leave = () => {
    setLeaving(true);
    window.setTimeout(() => {
      rootRef.current?.closest(".t23")?.removeAttribute("data-intro");
      window.scrollTo(0, 0);
      setGone(true);
    }, LEAVE_MS);
  };

  const go = (to: IntroStep | "play") => {
    if (to === "play") {
      playSong(0);
      leave();
      return;
    }
    setStep(to);
    if (to === "anyway") {
      // Started now, inside the tap, or phones won't allow it.
      playSong(0);
      window.setTimeout(leave, ANYWAY_MS);
    }
  };

  if (gone) return null;

  const current = INTRO[step];

  return (
    <div
      ref={rootRef}
      className="t23-intro"
      role="dialog"
      aria-modal="true"
      aria-labelledby="t23-intro-text"
      data-leaving={leaving || undefined}
    >
      <div
        key={step}
        ref={stepRef}
        tabIndex={-1}
        className="t23-intro-step"
        id="t23-intro-text"
      >
        {"title" in current && (
          <p className="t23-intro-title">{current.title}</p>
        )}
        <p className="t23-intro-body">
          <Rich text={current.body} />
        </p>

        {current.actions.length > 0 && (
          <div className="t23-intro-actions">
            {current.actions.map((action, index) => (
              <button
                key={action.label}
                type="button"
                className={
                  index === 0
                    ? "t23-intro-btn"
                    : "t23-intro-btn t23-intro-btn--quiet"
                }
                onClick={() => go(action.to)}
                // The ways into the page wait for everything to load.
                disabled={
                  leaving ||
                  (!load.ready &&
                    (action.to === "play" || action.to === "anyway"))
                }
              >
                <Rich text={action.label} />
              </button>
            ))}
          </div>
        )}
      </div>

      <LoadBar progress={load.progress} ready={load.ready} />
    </div>
  );
}

/** The loading bar: a periwinkle-to-pink line with the pink ball at its tip. */
function LoadBar({ progress, ready }: { progress: number; ready: boolean }) {
  const percent = Math.round((ready ? 1 : progress) * 100);
  return (
    <div className="t23-load" data-ready={ready || undefined}>
      <div
        className="t23-load-track"
        role="progressbar"
        aria-label={LOADING.busy}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <span
          className="t23-load-fill"
          style={{ "--p": percent / 100 } as React.CSSProperties}
        >
          <span className="t23-ball t23-load-ball" />
        </span>
      </div>
      <p className="t23-load-text" aria-live="polite">
        <span>{ready ? LOADING.done : LOADING.busy}</span>
        <span className="t23-load-pct">{percent}%</span>
      </p>
    </div>
  );
}

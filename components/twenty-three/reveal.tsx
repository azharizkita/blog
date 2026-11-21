"use client";

import { useEffect, useRef } from "react";

/**
 * Lets the letter unfold as she scrolls: every [data-reveal] element on the
 * page comes into focus the first time it enters the viewport.
 *
 * [data-cue] elements get the same data-shown mark without the hidden
 * styles: their CSS animations wait for it before playing.
 *
 * The hidden-until-seen styles only apply once this has mounted (it marks
 * the page root with data-reveal-ready), so without JavaScript, in reader
 * modes or in link previews, everything is simply there.
 */
export function RevealObserver() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = ref.current?.closest(".t23");
    if (!root) return;
    const targets = root.querySelectorAll<HTMLElement>(
      "[data-reveal], [data-cue]",
    );
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-shown", "");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    targets.forEach((target) => observer.observe(target));
    root.setAttribute("data-reveal-ready", "");
    return () => observer.disconnect();
  }, []);

  return <span ref={ref} hidden />;
}

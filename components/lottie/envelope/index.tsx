"use client";

import { useEffect, useRef, useState } from "react";
import type { AnimationItem } from "lottie-web";
import { cn } from "@/lib/utils";

/**
 * A clickable envelope for articles, animated by the author-supplied Lottie
 * (paper recolored to papyrus in the JSON; otherwise the original asset).
 * Registered as an MDX component — `<Envelope text="Hi!" />` — and editable
 * in the editor's Write mode via its TipTap node
 * (components/editor/wysiwyg/envelope-block).
 *
 * The note text is INJECTED INTO THE ANIMATION: a <foreignObject> inside
 * each "papr + text" layer group, in the animation's 1280-unit coordinate
 * space, inheriting the paper's transform chain — it rides the pop-out,
 * hold, and tuck-in, and scales with any container size.
 *
 * LONG NOTES: the note's rendered height is measured in comp units; the
 * text region (top pinned to the sheet's top edge) grows downward toward
 * the envelope pocket while a wrapper <g> around each paper layer lifts
 * the whole sheet by the overflow when open (a supplemental transform
 * composing with Lottie's own — Lottie only writes its inner group), so
 * more of the sheet clears the pocket. The lift is capped so the sheet's
 * bottom edge stays behind the pocket; past the cap the font steps down
 * to keep the note readable, and any residue clips at the pocket line.
 *
 * lottie-web + JSON load via dynamic import on mount (envelope-free pages
 * never pay for them); reduced-motion jumps between end states.
 */
const HOLD_FRAME = 40;
const LAST_FRAME = 72;

const SVG_NS = "http://www.w3.org/2000/svg";
const XHTML_NS = "http://www.w3.org/1999/xhtml";

// Geometry derived from envelope.json, in the paper precomp's space (the
// space the injected foreignObject lives in). The sheet rect spans
// x 104–1188, y 661.5–1499; at the hold frame the envelope front's top
// edge runs diagonally from its corners (root y 513) down to the center V
// (root y 991), crossing the note's side margin at ≈ y 987 in sheet
// coordinates. The box top hugs the sheet top; the box grows DOWNWARD (in
// sheet-local coordinates) toward that pocket boundary while the lift
// raises the whole sheet, so on screen the top edge rises and the bottom
// stays just above the pocket. MAX_RISE keeps the sheet's bottom edge
// (root y 1138 at hold) behind the pocket's center V (root y 991); past
// the cap the font steps down between BASE and MIN.
const NOTE_BOX = { x: 184, y: 692, width: 912, height: 275 };
const MAX_RISE = 130;
const BASE_FONT = 56;
const MIN_FONT = 34;

interface NoteInstance {
  foreigns: SVGForeignObjectElement[];
  divs: HTMLDivElement[];
  wrappers: SVGGElement[];
  rise: number;
  open: boolean;
}

// Per-component-instance note state behind opaque helpers (module registry,
// not cross-effect ref mutation — the react-hooks/immutability pattern used
// across this repo, e.g. components/editor/upload-error-registry).
const registry = new WeakMap<object, NoteInstance>();

function noteStyle(fontSize: number, overflowing = false): string {
  return [
    "width:100%",
    "height:100%",
    "display:flex",
    // A centered flex item taller than its box clips at BOTH ends; align
    // an overflowing note to the top so the clip happens only at the
    // pocket line, where the note reads as continuing into the envelope.
    `align-items:${overflowing ? "flex-start" : "center"}`,
    "justify-content:center",
    "text-align:center",
    "overflow:hidden",
    `font-size:${fontSize}px`,
    "line-height:1.45",
    "font-family:var(--font-serif, Georgia, serif)",
    "font-style:italic",
    "color:oklch(0.35 0.04 60)",
    "padding:0 20px",
    "overflow-wrap:break-word",
  ].join(";");
}

/** Measures the note at a given font size; returns needed height in comp
 * units. (Inside a foreignObject, CSS px ARE comp units.) */
function measure(div: HTMLDivElement, fontSize: number): number {
  div.setAttribute("style", noteStyle(fontSize) + ";height:auto");
  const needed = div.offsetHeight;
  div.setAttribute("style", noteStyle(fontSize));
  return needed;
}

/** Sizes the note region and lift for the current text. */
function fit(instance: NoteInstance): void {
  const [first] = instance.divs;
  if (!first) return;

  let fontSize = BASE_FONT;
  let needed = measure(first, fontSize);
  const maxHeight = NOTE_BOX.height + MAX_RISE;
  // Past the lift cap, step the font down until it fits (or bottoms out).
  while (needed > maxHeight && fontSize > MIN_FONT) {
    fontSize -= 4;
    needed = measure(first, fontSize);
  }

  const boxHeight = Math.min(Math.max(needed, NOTE_BOX.height), maxHeight);
  const rise = boxHeight - NOTE_BOX.height;
  const style = noteStyle(fontSize, needed > boxHeight);
  for (const div of instance.divs) div.setAttribute("style", style);
  for (const foreign of instance.foreigns) {
    foreign.setAttribute("height", String(boxHeight));
  }
  instance.rise = rise;
  applyLift(instance);
}

/** Eases the wrapper lift in/out, composing with the Lottie animation. */
function applyLift(instance: NoteInstance): void {
  const offset = instance.open ? -instance.rise : 0;
  for (const wrapper of instance.wrappers) {
    wrapper.style.transition = "transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)";
    wrapper.style.transform = `translateY(${offset}px)`;
  }
}

function setNoteText(key: object, text: string): void {
  const instance = registry.get(key);
  if (!instance) return;
  for (const div of instance.divs) div.textContent = text;
  fit(instance);
}

function setNoteOpen(key: object, open: boolean): void {
  const instance = registry.get(key);
  if (!instance) return;
  instance.open = open;
  applyLift(instance);
}

function initNotes(
  key: object,
  layerElements: SVGGElement[],
  text: string,
): void {
  const instance: NoteInstance = {
    foreigns: [],
    divs: [],
    wrappers: [],
    rise: 0,
    open: false,
  };
  for (const layerElement of layerElements) {
    // Wrapper <g>: Lottie writes transforms on its own group every frame;
    // the wrapper's supplemental lift persists and composes.
    const wrapper = document.createElementNS(SVG_NS, "g");
    layerElement.parentNode?.insertBefore(wrapper, layerElement);
    wrapper.appendChild(layerElement);

    const foreign = document.createElementNS(SVG_NS, "foreignObject");
    foreign.setAttribute("x", String(NOTE_BOX.x));
    foreign.setAttribute("y", String(NOTE_BOX.y));
    foreign.setAttribute("width", String(NOTE_BOX.width));
    foreign.setAttribute("height", String(NOTE_BOX.height));
    const div = document.createElementNS(XHTML_NS, "div") as HTMLDivElement;
    div.setAttribute("style", noteStyle(BASE_FONT));
    div.textContent = text;
    foreign.appendChild(div);
    layerElement.appendChild(foreign);

    instance.wrappers.push(wrapper);
    instance.foreigns.push(foreign);
    instance.divs.push(div);
  }
  registry.set(key, instance);
  fit(instance);
}

export function Envelope({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement | null>(null);
  const animationRef = useRef<AnimationItem | null>(null);
  const registryKeyRef = useRef({});
  const reducedMotionRef = useRef(false);
  const textRef = useRef(text);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;

    reducedMotionRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    (async () => {
      const [{ default: lottie }, { default: animationData }] =
        await Promise.all([import("lottie-web"), import("./envelope.json")]);
      if (cancelled) return;
      const animation = lottie.loadAnimation({
        container,
        renderer: "svg",
        loop: false,
        autoplay: false,
        animationData,
      });
      animationRef.current = animation;

      animation.addEventListener("DOMLoaded", () => {
        const elements =
          (
            animation as unknown as {
              renderer?: { elements?: unknown[] };
            }
          ).renderer?.elements ?? [];
        const layerElements = elements
          .filter(
            (el): el is { data: { nm?: string }; layerElement: SVGGElement } =>
              typeof el === "object" &&
              el !== null &&
              (el as { data?: { nm?: string } }).data?.nm === "papr + text" &&
              (el as { layerElement?: unknown }).layerElement instanceof
                SVGGElement,
          )
          .map((el) => el.layerElement);
        initNotes(registryKeyRef.current, layerElements, textRef.current);
      });
    })();

    const registryKey = registryKeyRef.current;
    return () => {
      cancelled = true;
      registry.delete(registryKey);
      animationRef.current?.destroy();
      animationRef.current = null;
    };
  }, []);

  // Editor edits update the note (and its fit/lift) in place.
  useEffect(() => {
    textRef.current = text;
    setNoteText(registryKeyRef.current, text);
  }, [text]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    setNoteOpen(registryKeyRef.current, next);
    const animation = animationRef.current;
    if (!animation) return;
    if (reducedMotionRef.current) {
      animation.goToAndStop(next ? HOLD_FRAME : 0, true);
      return;
    }
    if (next) {
      animation.playSegments([0, HOLD_FRAME], true);
    } else {
      animation.playSegments([HOLD_FRAME, LAST_FRAME], true);
    }
  };

  return (
    <span className="block py-4">
      <button
        type="button"
        aria-expanded={open}
        aria-label={
          open ? "Close the envelope" : `Open the envelope note: ${text}`
        }
        onClick={toggle}
        className="relative mx-auto block aspect-square w-full max-w-80 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        {/* lottie-web renders its SVG (note included) into this box. */}
        <span ref={containerRef} className="absolute inset-0" />
        <span
          className={cn(
            "prose-muted absolute -bottom-2 inset-x-0 text-center text-xs transition-opacity",
            open ? "opacity-0" : "opacity-100",
          )}
        >
          Click to open
        </span>
      </button>
    </span>
  );
}

export default Envelope;

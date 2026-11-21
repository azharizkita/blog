import type { CSSProperties } from "react";

/**
 * Yearbook-style doodles: crayon marks scribbled over the photocards (stars,
 * hearts, a crown, sparkles...). All drawn here, as plain strokes; the
 * crayon wobble comes from one SVG filter (CrayonFilter, rendered once on
 * the page) that roughens their edges.
 *
 * They're animated in CSS (twenty-three.css), no library: each one draws
 * itself in, stroke by stroke, when its card comes into view or turns back
 * to the front, then "boils" gently like a hand-drawn cartoon. Every path
 * has pathLength="1" so the draw-in works the same for every shape.
 */

export type DoodleKind =
  "star" | "heart" | "crown" | "sparks" | "twinkle" | "swirl" | "ring";

export type DoodleColor = "pink" | "lime" | "sky" | "white";

export type Doodle = {
  kind: DoodleKind;
  /** Centre, in % of the photo. */
  x: number;
  y: number;
  /** Width, in % of the photo's width. */
  size: number;
  rotate?: number;
  color: DoodleColor;
};

// Each in a 40 × 40 box, drawn a little wonky on purpose.
const PATHS: Record<DoodleKind, string> = {
  star: "M20 4.5 24.6 15.2 35.8 15.9 27.1 23.2 30.2 34.8 20.3 28.4 9.6 35.1 13.1 23.4 4.4 15.6 15.6 15.1Z",
  heart:
    "M20 33.5C9 25.5 4.5 18.5 7.2 12.4 9.8 6.6 16.8 7.2 20 13 23.4 6.9 30.4 6.4 33 12.3 35.6 18.6 31 25.6 20 33.5Z",
  crown:
    "M6 31 7.5 12.5 14.8 21.5 20.2 7.5 25.4 21.2 32.8 12 34.2 31Z M7 35.5H33.5",
  sparks:
    "M20 3.5V11M32.5 8.5 27.8 13.6M36.5 21.5H29M7.5 8.8 12.4 13.8M3.5 21.8H11M12 30.5 8 34.5M28.5 30 32.5 34",
  twinkle:
    "M20 3.5C21 15 25 19 36.5 20 25 21 21 25 20 36.5 19 25 15 21 3.5 20 15 19 19 15 20 3.5Z",
  swirl:
    "M3.5 27C9.5 9.5 18 35 22.5 20.5 25.5 10.5 33 13.5 30.5 22 28 30.5 19.5 26 26 17.5 30 12 35.5 13.5 37 9.5",
  ring: "M21 5.5C33.5 4.5 37.5 15 35.2 24.2 32.5 35 12.5 37.2 6 27.5 1.2 17.5 9 5.8 23.5 7.5",
};

export function DoodleLayer({ doodles }: { doodles?: readonly Doodle[] }) {
  if (!doodles?.length) return null;
  return (
    <span className="t23-doodles" aria-hidden="true">
      {doodles.map((doodle, index) => (
        <svg
          key={index}
          viewBox="0 0 40 40"
          className="t23-doodle"
          data-color={doodle.color}
          data-fill={doodle.kind === "heart" ? "" : undefined}
          style={
            {
              "--x": `${doodle.x}%`,
              "--y": `${doodle.y}%`,
              "--s": `${doodle.size}%`,
              "--r": `${doodle.rotate ?? 0}deg`,
              "--i": index,
            } as CSSProperties
          }
        >
          <path d={PATHS[doodle.kind]} pathLength={1} />
        </svg>
      ))}
    </span>
  );
}

/** A scribbled underline, two loose passes of the crayon. */
export function Scribble({
  color,
  className,
}: {
  color: DoodleColor;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 14"
      preserveAspectRatio="none"
      className={className ? `t23-scribble ${className}` : "t23-scribble"}
      data-color={color}
      aria-hidden="true"
    >
      <path
        d="M3 8C18 3.5 34 10 52 5.5S84 4 97 6.5M9 11.5C31 8 58 12 92 9"
        pathLength={1}
      />
    </svg>
  );
}

/** The crayon texture, referenced from CSS as url(#t23-crayon). */
export function CrayonFilter() {
  return (
    <svg width="0" height="0" className="t23-defs" aria-hidden="true">
      <filter id="t23-crayon" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.9"
          numOctaves="2"
          seed="23"
          result="noise"
        />
        <feDisplacementMap
          in="SourceGraphic"
          in2="noise"
          scale="2.2"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </svg>
  );
}

"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";

import { ARTIST, type Release } from "./copy";
import { DoodleLayer, Scribble, type Doodle } from "./doodles";
import { Rich } from "./rich";

/**
 * A K-pop photocard, the little collectible card that comes inside an album,
 * done up like a yearbook page: on the front a photo (or a cover set in
 * type) printed on cream paper, crayon doodles and her signature scribbled
 * over it, and a serif yearbook caption under it; words on the back; a
 * holographic foil over both. Her EPs and the Kina paragraph are each one
 * of these.
 *
 * It only ever turns over when she turns it: a tap on the card or the flip
 * button. It never flips by itself. On a mouse, the card leans toward the pointer and the foil
 * follows; on a phone the foil just drifts. Both faces stay in the DOM, so
 * screen readers get the front's description and the words either way.
 */

export type PhotocardProps = {
  /** A portrait photo for the front; without one, `words` are the cover. */
  src?: string;
  alt?: string;
  words?: readonly string[];
  /** The yearbook caption under the photo, in caps. */
  mark: string;
  /** Crayon doodles over the photo (doodles.tsx), placed clear of faces. */
  doodles?: readonly Doodle[];
  /** Where the signature sits, kept off faces. */
  signAt?: "top" | "bottom";
  /** The back: a small set label, an optional title, the words. */
  set: string;
  title?: string;
  body: string;
  /** The back's pastel; pink when not given. */
  tint?: Release["tint"];
  /** The card's resting tilt, in degrees. */
  tilt?: number;
};

export function Photocard({
  src,
  alt,
  words,
  mark,
  doodles,
  signAt = "bottom",
  set,
  title,
  body,
  tint,
  tilt = -2.5,
}: PhotocardProps) {
  const [flipped, setFlipped] = useState(false);
  // In view at least once: the doodles draw themselves in (CSS).
  const [seen, setSeen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Mark the card once it's properly in view, so its doodles draw in.
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setSeen(true);
        observer.disconnect();
      },
      { threshold: 0.65 },
    );
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  const flip = () => setFlipped((value) => !value);

  // Lean toward a mouse pointer; touch and pens leave it upright.
  const lean = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    const card = cardRef.current;
    if (!card) return;
    const box = card.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width;
    const y = (event.clientY - box.top) / box.height;
    card.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
    card.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
    card.style.setProperty("--ry", `${((x - 0.5) * 14).toFixed(2)}deg`);
    card.style.setProperty("--rx", `${((0.5 - y) * 12).toFixed(2)}deg`);
  };
  const settle = () => {
    const card = cardRef.current;
    if (!card) return;
    for (const name of ["--mx", "--my", "--rx", "--ry"])
      card.style.removeProperty(name);
  };

  return (
    // No data-reveal here: its fade (opacity, blur) would flatten the card's
    // 3D, and the back would show through the front.
    <div className="t23-pc-wrap">
      <div
        ref={cardRef}
        className="t23-pc"
        data-flipped={flipped || undefined}
        data-seen={seen || undefined}
        data-tint={tint}
        style={{ "--tilt": `${tilt}deg` } as CSSProperties}
        onClick={flip}
        onPointerMove={lean}
        onPointerLeave={settle}
      >
        <div className="t23-pc-inner">
          <figure className="t23-pc-face t23-pc-front">
            <div className="t23-pc-photo">
              {src ? (
                <Image
                  src={src}
                  alt={alt ?? ""}
                  fill
                  sizes="(min-width: 44rem) 20rem, 64vw"
                  className="t23-pc-img"
                />
              ) : (
                <span className="t23-pc-words" aria-hidden="true">
                  {words?.map((word) => (
                    <span key={word}>{word}</span>
                  ))}
                </span>
              )}
              <DoodleLayer doodles={doodles} />
              <span className="t23-pc-sign" data-at={signAt} aria-hidden="true">
                {ARTIST.photocard.signature}
              </span>
            </div>
            <figcaption className="t23-pc-cap" aria-hidden="true">
              <span className="t23-pc-cap-mark">
                {mark}
                <Scribble color={inkFor(tint)} className="t23-pc-cap-line" />
              </span>
            </figcaption>
            <span className="t23-pc-foil" aria-hidden="true" />
          </figure>

          <div className="t23-pc-face t23-pc-back">
            <p className="t23-pc-set">{set}</p>
            {title && (
              <h3 className="t23-pc-title">
                <Rich text={title} />
                <Scribble color={inkFor(tint)} className="t23-pc-title-line" />
              </h3>
            )}
            <p className="t23-pc-text">
              <Rich text={body} />
            </p>
            <span className="t23-ball t23-pc-ball" aria-hidden="true" />
            <span className="t23-pc-foil" aria-hidden="true" />
          </div>
        </div>
      </div>

      <button
        type="button"
        className="t23-pc-flip"
        onClick={flip}
        aria-pressed={flipped}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.5M20 4v4.5h-4.5M20 12a8 8 0 0 1-13.7 5.6L4 15.5M4 20v-4.5h4.5" />
        </svg>
        {ARTIST.photocard.flip}
      </button>
    </div>
  );
}

/** The crayon colour that goes with each card's pastel. */
function inkFor(tint: PhotocardProps["tint"]) {
  switch (tint) {
    case "sky":
      return "pink";
    case "lime":
      return "sky";
    case "lilac":
      return "pink";
    default:
      return "sky";
  }
}

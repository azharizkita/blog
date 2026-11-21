import type { CSSProperties } from "react";
import type { Metadata, Viewport } from "next";
import {
  Averia_Serif_Libre,
  Libre_Caslon_Text,
  Nanum_Pen_Script,
} from "next/font/google";

import {
  ARTIST,
  META,
  STORY,
  type Release,
} from "@/components/twenty-three/copy";
import { CrayonFilter } from "@/components/twenty-three/doodles";
import { Intro } from "@/components/twenty-three/intro";
import { NowPlaying } from "@/components/twenty-three/now-playing";
import { Photocard } from "@/components/twenty-three/photocard";
import { Rich } from "@/components/twenty-three/rich";
import { Player } from "@/components/twenty-three/player";
import { RevealObserver } from "@/components/twenty-three/reveal";
import { Spin } from "@/components/twenty-three/spin";

import "./twenty-three.css";

// A birthday page for one reader. It is deliberately off the map: not in the
// sitemap, feed or nav, and noindex below. The words live in
// components/twenty-three/copy.ts; the look in ./twenty-three.css.
//
// The order of things: an intro prompt (which starts the song), the song's
// now-playing screen with the year flipping by as its artwork, then her
// "artist page": the title, a bio (the opening), an about card (the recall
// line), her wins as EPs and the b-sides, the Kina paragraph, the next
// release (coming soon), the closing, and last, the dial. It runs past to
// future to now.

// Averia is the average of several hundred typefaces, so its edges come out
// soft, like type seen slightly out of focus.
const averia = Averia_Serif_Libre({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  style: ["normal", "italic"],
  display: "swap",
  // Not preloaded while the page is set in the blog's own type (data-type
  // below); fetched only if a rule still asks for it.
  preload: false,
  variable: "--font-averia",
});

// A marker-pen hand, only for the signature on the photocard.
const pen = Nanum_Pen_Script({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-pen",
});

// The yearbook captions on the photocards.
const caslon = Libre_Caslon_Text({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  display: "swap",
  preload: false,
  variable: "--font-yearbook",
});

export const metadata: Metadata = {
  title: { absolute: META.title },
  description: META.description,
  // Private: no search engine, archive, snippet, image search or AI
  // crawler should keep anything from this page. The same goes out as an
  // X-Robots-Tag header (next.config.ts) on the page, its photos and the
  // song, and known bots are turned away before they get here (proxy.ts).
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
    notranslate: true,
    googleBot: {
      index: false,
      follow: false,
      noarchive: true,
      nosnippet: true,
      noimageindex: true,
    },
  },
  // Opt-outs some AI crawlers honour.
  other: { robots: "noai, noimageai" },
  // Redefined whole so the blog's own card (site name, description, /api/og)
  // doesn't leak into the link preview; the image is ./opengraph-image.jpg.
  openGraph: {
    type: "website",
    title: META.title,
    description: META.description,
    url: "/23",
  },
  twitter: {
    card: "summary_large_image",
    title: META.title,
    description: META.description,
  },
};

export const viewport: Viewport = {
  // The top of the sky, --t23-sky-1 in twenty-three.css (NewJeans look;
  // the evening sky was #b7bef3 / #11112b), as sRGB for the
  // browser chrome.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#9ea6e6" },
    { media: "(prefers-color-scheme: dark)", color: "#1b2157" },
  ],
};

/** The chevron after a shelf heading, as in a music app. */
function Chevron() {
  return (
    <svg viewBox="0 0 24 24" className="t23-chevron" aria-hidden="true">
      <path d="m9 5.5 6.5 6.5L9 18.5" />
    </svg>
  );
}

export default function TwentyThree() {
  return (
    // data-chromeless: the root layout hides the blog's header and footer.
    // data-intro: the page holds still until the intro has gone (intro.tsx).
    // data-type="lokey": set in the blog's own Inter and Roboto Mono rather
    // than Averia (see the end of twenty-three.css); remove it to go back.
    // data-look="newjeans": the denim-and-sky palette and camcorder
    // viewfinder (see the tokens in twenty-three.css); remove it for the
    // evening sky.
    <div
      className={`t23 ${averia.variable} ${pen.variable} ${caslon.variable}`}
      data-chromeless
      data-intro
      data-type="lokey"
      data-look="newjeans"
    >
      <div className="t23-sky" aria-hidden="true" />

      <Intro />
      <RevealObserver />
      <CrayonFilter />

      <div className="t23-page">
        {/* The player and the title: stacked on a phone, side by side on
            a wide screen. */}
        <div className="t23-opening">
          <NowPlaying />

          {/* The title, as the top of her artist page. data-cue: it plays its
            entrance once it scrolls into view. */}
          <header className="t23-hero t23-artist" data-cue>
            <p className="t23-kicker">
              {ARTIST.label} · {STORY.kicker}
            </p>
            <h1 className="t23-title">
              {STORY.title.map((line, index) => {
                const last = index === STORY.title.length - 1;
                return (
                  <span
                    key={line}
                    className={index % 2 ? "t23-line t23-line--in" : "t23-line"}
                  >
                    <span
                      className="t23-word"
                      style={{ "--i": index } as CSSProperties}
                    >
                      <Rich text={line} />
                    </span>
                    {/* The full stop is a rubber ball. */}
                    {last && (
                      <span
                        className="t23-ball t23-ball--stop"
                        aria-hidden="true"
                      />
                    )}
                    {!last && " "}
                  </span>
                );
              })}
            </h1>
          </header>
        </div>

        <article className="t23-letter">
          <section className="t23-bio" aria-labelledby="t23-bio-label">
            <p id="t23-bio-label" className="t23-label">
              {ARTIST.bio}
            </p>
            <div className="t23-prose">
              {STORY.opening.map((paragraph) => (
                <p key={paragraph} data-reveal>
                  <Rich text={paragraph} />
                </p>
              ))}
            </div>
          </section>

          {/* From the recall to "coming soon": her year, on NewJeans-style
              striped paper. */}
          <div className="t23-band t23-band--paper">
            {/* The recall line, on its own and set like the title: it hands
              straight over to her releases. */}
            <section className="t23-recall-wrap" data-reveal>
              <h2 className="t23-recall">
                {STORY.recall.lines.map((line, index) => (
                  <span
                    key={line}
                    className={[
                      "t23-line",
                      index % 2 ? "t23-line--in" : "",
                      index >= STORY.recall.pinkFrom ? "t23-recall-pink" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <Rich text={line} />
                    {index < STORY.recall.lines.length - 1 && " "}
                  </span>
                ))}
              </h2>
            </section>

            {/* The wins: each EP is a photocard, its notes on the back. */}
            <section className="t23-releases" aria-label="EPs">
              <ol className="t23-pc-list">
                {STORY.wins.map((win: Release, index) => (
                  <li key={win.lead}>
                    <Photocard
                      src={win.cover}
                      alt={win.coverAlt}
                      words={win.coverWords}
                      mark={win.release}
                      doodles={win.doodles}
                      signAt={win.signAt}
                      set={`${win.release} · ${ARTIST.year}`}
                      title={win.lead}
                      body={win.body}
                      tint={win.tint}
                      tilt={index % 2 ? 2 : -2.5}
                    />
                  </li>
                ))}
              </ol>
              {/* The longer story behind each EP. */}
              <section className="t23-liner" aria-labelledby="t23-liner-label">
                <h2 id="t23-liner-label" className="t23-shelf-head">
                  {STORY.linerNotes}
                  <Chevron />
                </h2>
                <ol className="t23-liner-list">
                  {STORY.wins
                    .filter((win: Release) => win.notes)
                    .map((win: Release) => (
                      <li key={win.lead} data-reveal>
                        <p className="t23-liner-kind">
                          {win.release} · <Rich text={win.lead} />
                        </p>
                        <p>
                          <Rich text={win.notes ?? ""} />
                        </p>
                      </li>
                    ))}
                </ol>
              </section>
              <div className="t23-release-more">
                {STORY.smallWins.map((paragraph) => (
                  <p key={paragraph} data-reveal>
                    <Rich text={paragraph} />
                  </p>
                ))}
              </div>
            </section>
          </div>

          {/* The Kina paragraph, printed on the back of a photocard: its own
              sheet, NewJeans and Freudian mixed. */}
          <div className="t23-band t23-band--reminder">
            <section className="t23-inclusion" aria-labelledby="t23-pc-label">
              <h2 id="t23-pc-label" className="t23-shelf-head">
                {ARTIST.photocard.label}
                <Chevron />
              </h2>
              <Photocard
                src={ARTIST.photocard.src}
                alt={ARTIST.photocard.alt}
                mark={ARTIST.photocard.mark}
                doodles={ARTIST.photocard.doodles}
                set={ARTIST.photocard.set}
                body={STORY.kina}
              />
              <div className="t23-note">
                {STORY.kinaNote.map((paragraph) => (
                  <p key={paragraph} data-reveal>
                    <Rich text={paragraph} />
                  </p>
                ))}
              </div>
            </section>
          </div>
        </article>

        {/* The ending, on plain light paper. */}
        <div className="t23-band t23-band--light">
          <div className="t23-note">
            {STORY.closingNotes.map((paragraph) => (
              <p key={paragraph} data-reveal>
                <Rich text={paragraph} />
              </p>
            ))}
          </div>
          <p className="t23-closing" data-reveal>
            {STORY.closing}
          </p>
          <Spin />
        </div>
      </div>

      <Player />
    </div>
  );
}

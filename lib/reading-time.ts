const WORDS_PER_MINUTE = 275; // Ghost's convention

/** Whole minutes, never below 1. */
export default function readingTime(markdown: string): number {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

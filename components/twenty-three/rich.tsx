/**
 * Renders copy with English words set in italics. In copy.ts, English is
 * wrapped in underscores ("lagu ini gue puter _on repeat_"); everything
 * else is plain text.
 */
export function Rich({ text }: { text: string }) {
  const parts = text.split(/_([^_]+)_/);
  return (
    <>
      {parts.map((part, index) =>
        index % 2 ? <em key={index}>{part}</em> : part,
      )}
    </>
  );
}

/** The same copy without the markers, for alt text, labels and keys. */
export function plain(text: string) {
  return text.replace(/_([^_]+)_/g, "$1");
}

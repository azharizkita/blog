// Converts MDX-era post syntax into TanStack Markdown syntax.
// Pure and import-free on purpose: a migration script runs this file directly.

export function encodeAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\n", "&#10;");
}

function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replaceAll("&quot;", '"')
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

const BLOCK_HTML =
  /^<\/?(?:div|p|span|table|thead|tbody|tr|td|th|section|article|aside|details|summary|center|iframe|video|audio|script|style|ul|ol|li|h[1-6]|pre|blockquote|hr|figure|img)(?:[\s/>]|$)/i;
const JSX_SELF_CLOSING = /^<([A-Z]\w*)((?:\s+[\w-]+="[^"]*")*)\s*\/>$/;
const CALLOUT_OPEN = /^<Callout\s+type="(\w+)"\s*>$/;
const CALLOUT_TYPES: Record<string, string> = {
  note: "NOTE",
  tip: "TIP",
  warn: "WARNING",
};
const EMBEDS: Record<string, { name: string; attrs: string[]; required: string[] }> = {
  AppleMusic: { name: "apple-music", attrs: ["url", "title"], required: ["url"] },
  YouTube: { name: "youtube", attrs: ["id", "title"], required: ["id"] },
  Envelope: { name: "envelope", attrs: ["text"], required: ["text"] },
};

/** Replace inline code spans with NULs (same length) so regexes skip them. */
function maskInlineCode(line: string): string {
  return line.replace(/(`+)[\s\S]*?\1/g, (m) => "\0".repeat(m.length));
}

function convertEmbed(trimmed: string): string | null {
  const m = JSX_SELF_CLOSING.exec(trimmed);
  if (!m) return null;
  const spec = EMBEDS[m[1]];
  if (!spec) return null;
  const attrs: Record<string, string> = {};
  for (const a of m[2].matchAll(/([\w-]+)="([^"]*)"/g)) {
    attrs[a[1]] = decodeEntities(a[2]);
  }
  if (Object.keys(attrs).some((k) => !spec.attrs.includes(k))) return null;
  if (spec.required.some((k) => attrs[k] === undefined)) return null;
  const parts = spec.attrs
    .filter((k) => attrs[k] !== undefined)
    .map((k) => `${k}="${encodeAttribute(attrs[k])}"`);
  return `<!-- ::${spec.name} ${parts.join(" ")} -->`;
}

const NEW_BLOCK =
  /^ {0,3}(?:#{1,6}(?:\s|$)|[-*+]\s|\d+[.)]\s|>|`{3,}|~{3,}|(?:[-*_][ \t]*){3,}$)/;
const QUOTE = /^ {0,3}>/;
const HEADING = /^ {0,3}#{1,6}(?:\s|$)/;

/** Rewrite simple inline HTML outside code spans; flag whatever remains. */
function convertInline(text: string): { text: string; flagged: boolean } {
  let flagged = false;
  const fix = (seg: string) => {
    const r = seg
      .replace(/<(strong|b)>([^<]*)<\/\1>/gi, "**$2**")
      .replace(/<(em|i)>([^<]*)<\/\1>/gi, "*$2*");
    const rest = r
      .replace(/<[a-z][a-z0-9+.-]*:[^\s>]*>/gi, "")
      .replace(/<[^\s@<>]+@[^\s<>]+>/g, "");
    if (/<\/?[A-Za-z][^>]*>/.test(rest)) flagged = true;
    return r;
  };
  let res = "";
  let last = 0;
  for (const m of text.matchAll(/(`+)[\s\S]*?\1/g)) {
    res += fix(text.slice(last, m.index)) + m[0];
    last = m.index + m[0].length;
  }
  res += fix(text.slice(last));
  return { text: res, flagged };
}

export function convertLegacyMarkdown(source: string): {
  content: string;
  changed: boolean;
  unconvertible: string[];
} {
  const lines = source.split("\n");
  const out: string[] = [];
  const unconvertible: string[] = [];
  let fence: { char: string; len: number } | null = null;
  // The previous line was a blockquote line ending in a hard break, so a
  // following non-blank line is a lazy continuation of the same paragraph.
  let quoteHardBreak = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (fence) {
      out.push(line);
      const close = /^ {0,3}(`{3,}|~{3,})\s*$/.exec(line);
      if (close && close[1][0] === fence.char && close[1].length >= fence.len) {
        fence = null;
      }
      continue;
    }
    const open = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (open && !(open[1][0] === "`" && line.slice(open[0].length).includes("`"))) {
      fence = { char: open[1][0], len: open[1].length };
      quoteHardBreak = false;
      out.push(line);
      continue;
    }

    // Callout block.
    const callout = CALLOUT_OPEN.exec(trimmed);
    if (callout) {
      const label = CALLOUT_TYPES[callout[1]];
      let end = -1;
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].trim() === "</Callout>") {
          end = j;
          break;
        }
      }
      if (label && end !== -1) {
        out.push(`> [!${label}]`);
        for (const inner of lines.slice(i + 1, end)) {
          out.push(inner.trim() === "" ? ">" : `> ${inner}`);
        }
        i = end;
        quoteHardBreak = false;
        continue;
      }
      unconvertible.push(line);
      out.push(line);
      continue;
    }

    // Self-closing JSX embeds and unknown components.
    if (/^<[A-Z]/.test(trimmed)) {
      const embed = convertEmbed(trimmed);
      if (embed) out.push(embed);
      else {
        unconvertible.push(line);
        out.push(line);
      }
      quoteHardBreak = false;
      continue;
    }
    if (BLOCK_HTML.test(trimmed)) {
      unconvertible.push(line);
      out.push(line);
      quoteHardBreak = false;
      continue;
    }

    // Hard breaks.
    const nextBlank = i + 1 >= lines.length || lines[i + 1].trim() === "";
    const inQuote = QUOTE.test(line) || quoteHardBreak;
    const continues =
      !nextBlank &&
      !HEADING.test(line) &&
      (!NEW_BLOCK.test(lines[i + 1]) ||
        (inQuote && QUOTE.test(lines[i + 1])));
    const masked = maskInlineCode(line);
    const br = /<br\s*\/?>$/i.exec(masked);
    const spaces = /\S {2,}$/.exec(masked);
    let text = line;
    let hardBreak = false;
    if (continues) {
      if (br) {
        text = line.slice(0, br.index) + "\\";
        hardBreak = true;
      } else if (spaces) {
        text = line.slice(0, spaces.index + 1) + "\\";
        hardBreak = true;
      } else if (/\\$/.test(masked)) {
        hardBreak = true;
      }
    } else if (br && nextBlank) {
      // A break at the end of a paragraph renders nothing.
      text = line.slice(0, br.index).trimEnd();
    } else if (spaces && !nextBlank) {
      text = line.slice(0, spaces.index + 1);
    }
    if (text.trim() !== "") {
      const inline = convertInline(text);
      text = inline.text;
      if (inline.flagged) unconvertible.push(line);
    }

    if (trimmed === "") {
      quoteHardBreak = false;
    } else if (/^ {0,3}>/.test(line)) {
      quoteHardBreak = hardBreak;
    } else if (quoteHardBreak && !NEW_BLOCK.test(line)) {
      text = `> ${text}`;
      quoteHardBreak = hardBreak;
    } else {
      quoteHardBreak = false;
    }
    out.push(text);
  }

  const content = out.join("\n");
  return { content, changed: content !== source, unconvertible };
}

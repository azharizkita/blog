"use client";

import { useState } from "react";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import Image from "@tiptap/extension-image";

/**
 * Splits the site's "alt|WxH" convention (lib/get-image-size.ts): the
 * descriptive text is author-editable in the node view; the dimension
 * suffix (written automatically on paste/drop) is preserved verbatim.
 */
function splitAlt(alt: string): { text: string; meta: string } {
  const separator = alt.indexOf("|");
  if (separator === -1) return { text: alt, meta: "" };
  return { text: alt.slice(0, separator), meta: alt.slice(separator + 1) };
}

function hasCoverMarker(alt: string): boolean {
  return alt
    .split("|")
    .slice(1)
    .some((segment) => segment.trim() === "cover");
}

function ImageView({
  node,
  updateAttributes,
  selected,
  editor,
  getPos,
}: NodeViewProps) {
  const alt = typeof node.attrs.alt === "string" ? node.attrs.alt : "";
  const { text, meta } = splitAlt(alt);
  const isCover = hasCoverMarker(alt);

  // One cover per article: toggling this image on strips the marker from
  // every other image in one transaction (surfaces like the featured
  // carousel read the first marked image — see lib/extract-cover-image.ts).
  const toggleCover = () => {
    const { state, view } = editor;
    const targetPos = typeof getPos === "function" ? getPos() : null;
    const tr = state.tr;
    state.doc.descendants((docNode, pos) => {
      if (docNode.type.name !== "image") return;
      const nodeAlt =
        typeof docNode.attrs.alt === "string" ? docNode.attrs.alt : "";
      const wantCover = pos === targetPos ? !isCover : false;
      if (hasCoverMarker(nodeAlt) === wantCover) return;
      const segments = nodeAlt
        .split("|")
        .filter(
          (segment, index) => index === 0 || segment.trim() !== "cover",
        );
      if (wantCover) segments.push("cover");
      tr.setNodeMarkup(pos, undefined, {
        ...docNode.attrs,
        alt: segments.join("|"),
      });
    });
    if (tr.docChanged) view.dispatch(tr);
  };

  return (
    // contentEditable={false}: the stock Image node is a leaf but not an
    // atom, so without this the wrapper sits inside the editable region and
    // browsers refuse to focus an <input> nested in contentEditable — the
    // caret stayed in the surrounding paragraph instead of the alt field.
    <NodeViewWrapper
      as="span"
      className="block"
      contentEditable={false}
      data-drag-handle
    >
      {/* The published page renders via next/image with the same alt-derived
          sizing; in the editor a plain img (styled by .wysiwyg img) is the
          faithful preview. Selection rings the image itself, Ghost-style. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={node.attrs.src}
        alt={text}
        className={
          selected ? "ring-2 ring-ring ring-offset-2 ring-offset-background" : undefined
        }
      />
      {/* Ghost-style caption line: a quiet centered field while selected,
          plain muted caption text otherwise (clicking it selects the image,
          which swaps the text back into the editable field). Dimensions in
          the alt's |WxH suffix are preserved invisibly. */}
      {selected ? (
        <span className="mt-4 flex items-baseline gap-1.5 text-sm">
          <span className="flex-none">alt:</span>
          <CaptionInput
            key={alt}
            initialText={text}
            onCommit={(nextText) => {
              if (nextText === text) return;
              updateAttributes({
                alt: meta ? `${nextText}|${meta}` : nextText,
              });
            }}
          />
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={toggleCover}
            className={
              isCover
                ? "flex-none rounded-md bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground"
                : "flex-none rounded-md px-2 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            }
          >
            {isCover ? "Cover ✓" : "Set as cover"}
          </button>
        </span>
      ) : (
        (text || isCover) && (
          <span className="mt-4 flex items-baseline gap-1.5 text-sm">
            <span className="flex-none">alt:</span>
            <span className="prose-muted min-w-0 truncate">{text}</span>
            {isCover && (
              <span className="prose-muted flex-none text-xs">· cover</span>
            )}
          </span>
        )
      )}
    </NodeViewWrapper>
  );
}

/**
 * A regular controlled input over LOCAL state: committing the alt attr per
 * keystroke would dispatch a ProseMirror transaction per character, which
 * re-renders the node view and lets the editor steal focus back (the
 * click-per-character bug). Typing stays local; the attr commits once on
 * blur or Enter — and blur fires before any Save click lands, so a flush
 * always sees the committed caption.
 */
function CaptionInput({
  initialText,
  onCommit,
}: {
  initialText: string;
  onCommit: (text: string) => void;
}) {
  const [draft, setDraft] = useState(initialText);

  return (
    <input
      aria-label="Image alt text"
      placeholder="Describe this image…"
      className="prose-muted min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground/40"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      // Keep the browser default (it's what focuses the input and places
      // the caret) but never let ProseMirror see the mousedown.
      onMouseDown={(event) => event.stopPropagation()}
      // WebKit keeps blinking a phantom caret at the editor's last text
      // selection even after focus moves into the input (two carets at
      // once). Inputs carry their own caret independent of the document
      // selection, so dropping the leftover range only removes the ghost —
      // and ProseMirror won't repaint it while unfocused.
      onFocus={() => window.getSelection()?.removeAllRanges()}
      onBlur={() => onCommit(draft)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
    />
  );
}

/**
 * The stock Image extension (inline, per markdown semantics) with a node
 * view that exposes the alt text for editing when the image is selected.
 */
export const EditorImage = Image.extend({
  addNodeView() {
    return ReactNodeViewRenderer(ImageView, {
      // ProseMirror must ignore events aimed at the caption input and the
      // cover toggle — without this it re-grabs focus on mousedown/keydown
      // and the caret never survives inside the field.
      stopEvent: ({ event }) =>
        event.target instanceof Element &&
        event.target.closest("input, button") !== null,
    });
  },
}).configure({ inline: true });

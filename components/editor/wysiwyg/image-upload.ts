"use client";

import { Extension, type Editor } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { uploadEditorImage } from "@/app/editor/actions";
import { reportUploadError } from "@/components/editor/upload-error-registry";

export const SUPPORTED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);

export function imageFilesFrom(transfer: DataTransfer | null): File[] {
  if (!transfer) return [];
  return Array.from(transfer.files).filter((file) =>
    SUPPORTED_IMAGE_TYPES.has(file.type),
  );
}

export async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  // btoa over chunks: spreading multi-MB arrays into one call blows the
  // argument limit.
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}


/**
 * Ghost-style paste/drop image uploads for Write mode: the image appears
 * immediately at the target position with a local object URL, then its src
 * is swapped for the uploaded raw.githubusercontent URL. While any blob:
 * src remains in the doc, serialization is blocked by
 * detectLossySerialization (see index.tsx), so a half-finished upload can
 * never reach the gist.
 */
async function insertAndUpload(
  editor: Editor,
  file: File,
  pos: number,
  onError: (message: string) => void,
): Promise<void> {
  const objectUrl = URL.createObjectURL(file);
  editor
    .chain()
    .insertContentAt(pos, {
      type: "image",
      attrs: { src: objectUrl, alt: "" },
    })
    .run();

  const finish = (uploadedUrl: string | null) => {
    // The node may have moved (or been deleted) since insertion; find it by
    // its unique object URL.
    let found: { pos: number } | null = null;
    editor.state.doc.descendants((node, nodePos) => {
      if (node.type.name === "image" && node.attrs.src === objectUrl) {
        found = { pos: nodePos };
        return false;
      }
    });
    if (found !== null) {
      const at = (found as { pos: number }).pos;
      const node = editor.state.doc.nodeAt(at);
      const tr = editor.state.tr;
      if (uploadedUrl && node) {
        tr.setNodeMarkup(at, undefined, { ...node.attrs, src: uploadedUrl });
      } else if (node) {
        tr.delete(at, at + node.nodeSize);
      }
      editor.view.dispatch(tr);
    }
    URL.revokeObjectURL(objectUrl);
  };

  try {
    const dataBase64 = await fileToBase64(file);
    const result = await uploadEditorImage({
      dataBase64,
      contentType: file.type,
    });
    if (result.ok) {
      finish(result.url);
    } else {
      finish(null);
      onError(result.error);
    }
  } catch (error) {
    finish(null);
    onError(error instanceof Error ? error.message : "Image upload failed.");
  }
}

export const ImageUpload = Extension.create({
  name: "imageUpload",

  addProseMirrorPlugins() {
    const { editor } = this;
    // WysiwygEditor registers the actual handler (its onImageError prop)
    // against this editor instance from an effect.
    const onError = (message: string) => {
      reportUploadError(editor, message);
    };

    return [
      new Plugin({
        key: new PluginKey("imageUpload"),
        props: {
          handlePaste: (view, event) => {
            const files = imageFilesFrom(event.clipboardData);
            if (files.length === 0) return false;
            event.preventDefault();
            const pos = view.state.selection.from;
            files.forEach((file, index) => {
              void insertAndUpload(editor, file, pos + index, onError);
            });
            return true;
          },
          handleDrop: (view, event, _slice, moved) => {
            if (moved) return false;
            const files = imageFilesFrom(event.dataTransfer);
            if (files.length === 0) return false;
            event.preventDefault();
            const dropPos =
              view.posAtCoords({ left: event.clientX, top: event.clientY })
                ?.pos ?? view.state.selection.from;
            files.forEach((file, index) => {
              void insertAndUpload(editor, file, dropPos + index, onError);
            });
            return true;
          },
        },
      }),
    ];
  },
});

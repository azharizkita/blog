"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { markdown } from "@codemirror/lang-markdown";
import { EditorView } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import { useTheme } from "next-themes";
import { uploadEditorImage } from "@/app/editor/actions";
import {
  reportUploadError,
  setUploadErrorHandler,
} from "@/components/editor/upload-error-registry";
import {
  fileToBase64,
  imageFilesFrom,
  measureImage,
} from "@/components/editor/wysiwyg/image-upload";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  /** Surface for paste/drop image-upload failures. */
  onUploadError?: (message: string) => void;
}

let uploadCounter = 0;

/**
 * Gist-editor-style image paste/drop for Source mode: a unique
 * `![Uploading …]()` placeholder goes in at the cursor immediately and is
 * replaced with the final markdown (or removed, on failure) when the upload
 * settles. The placeholder is located by string search at settle time — the
 * user may have kept typing, so positions can't be trusted.
 */
async function uploadIntoView(
  view: EditorView,
  file: File,
  onError: (message: string) => void,
): Promise<void> {
  const token = `![Uploading image ${++uploadCounter}…]()`;
  view.dispatch(view.state.replaceSelection(`${token}`));

  const settle = (replacement: string) => {
    const text = view.state.doc.toString();
    const at = text.indexOf(token);
    if (at === -1) return; // user deleted the placeholder — drop silently
    view.dispatch({
      changes: { from: at, to: at + token.length, insert: replacement },
    });
  };

  try {
    // Carry the site's alt|WxH convention (lib/get-image-size.ts) like the
    // Write-mode flow; the author fills the descriptive part in the alt.
    const objectUrl = URL.createObjectURL(file);
    const dimensions = await measureImage(objectUrl);
    URL.revokeObjectURL(objectUrl);
    const altMeta = dimensions
      ? `|${dimensions.width}x${dimensions.height}`
      : "";
    const dataBase64 = await fileToBase64(file);
    const result = await uploadEditorImage({
      dataBase64,
      contentType: file.type,
    });
    if (result.ok) {
      settle(`![${altMeta}](${result.url})`);
    } else {
      settle("");
      onError(result.error);
    }
  } catch (error) {
    settle("");
    onError(error instanceof Error ? error.message : "Image upload failed.");
  }
}

export function MarkdownEditor({
  value,
  onChange,
  onUploadError,
}: MarkdownEditorProps) {
  const { resolvedTheme } = useTheme();

  // Stable identity key into the upload-error registry: handlers are
  // registered from an effect (latest prop) and looked up at event time —
  // satisfies both the react-hooks/refs and immutability rules, which
  // forbid ref-closures escaping render and mutation of hook values.
  const registryKey = useMemo(() => ({}), []);
  useEffect(() => {
    setUploadErrorHandler(registryKey, onUploadError);
    return () => setUploadErrorHandler(registryKey, undefined);
  }, [registryKey, onUploadError]);

  const extensions = useMemo(
    () => [
      markdown(),
      EditorView.domEventHandlers({
        paste: (event, view) => {
          const files = imageFilesFrom(event.clipboardData);
          if (files.length === 0) return false;
          event.preventDefault();
          for (const file of files) {
            void uploadIntoView(view, file, (message) =>
              reportUploadError(registryKey, message),
            );
          }
          return true;
        },
        drop: (event, view) => {
          const files = imageFilesFrom(event.dataTransfer);
          if (files.length === 0) return false;
          event.preventDefault();
          const pos = view.posAtCoords({
            x: event.clientX,
            y: event.clientY,
          });
          if (pos != null) {
            view.dispatch({ selection: { anchor: pos } });
          }
          for (const file of files) {
            void uploadIntoView(view, file, (message) =>
              reportUploadError(registryKey, message),
            );
          }
          return true;
        },
      }),
    ],
    [registryKey],
  );

  // resolvedTheme is undefined during SSR, so theming the first render by it
  // causes a hydration mismatch (server: light, dark-mode client: dark).
  // Render light until hydration completes — the server snapshot (false)
  // keeps the first client render identical to the server, and the real
  // theme applies immediately after.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  return (
    <div className="overflow-hidden rounded-md border">
      <CodeMirror
        value={value}
        onChange={onChange}
        theme={mounted && resolvedTheme === "dark" ? "dark" : "light"}
        extensions={extensions}
        height="70vh"
        basicSetup={{ lineNumbers: false, foldGutter: false }}
      />
    </div>
  );
}

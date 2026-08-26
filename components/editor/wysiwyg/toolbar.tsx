"use client";

import type { ReactNode } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  List,
  ListOrdered,
  Link as LinkIcon,
  SquareCode,
  Workflow,
  Image as ImageIcon,
  Table as TableIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ToolbarProps {
  editor: Editor;
}

/** Markdown heading levels: ## = visual H1, ### = H2, #### = H3. */
const HEADINGS = [
  { level: 2 as const, icon: Heading1, label: "Heading 1 (##)" },
  { level: 3 as const, icon: Heading2, label: "Heading 2 (###)" },
  { level: 4 as const, icon: Heading3, label: "Heading 3 (####)" },
];

function ToolbarButton({
  onClick,
  active,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      aria-pressed={active}
      className={cn(active && "bg-muted text-foreground")}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

/**
 * Prompts for a link URL and applies/removes the `link` mark on the current
 * selection. Exported so the ⌘K keyboard shortcut (wired in index.tsx via a
 * tiny addKeyboardShortcuts extension, since StarterKit's bundled Link
 * extension doesn't register one) can reuse the exact same behavior as the
 * toolbar button.
 */
export function promptForLink(editor: Editor): void {
  const previous = editor.getAttributes("link").href as string | undefined;
  const url = window.prompt("Link URL", previous ?? "");
  if (url === null) return;
  const chain = editor.chain().focus();
  if (url === "") {
    chain.extendMarkRange("link").unsetLink().run();
    return;
  }
  chain.extendMarkRange("link").setLink({ href: url }).run();
}

export function Toolbar({ editor }: ToolbarProps) {
  const chain = () => editor.chain().focus();

  // useEditor's default `shouldRerenderOnTransaction` is false in v3, so a
  // plain `editor.isActive(...)` read here would not update the toolbar on
  // selection/mark changes. useEditorState subscribes to just the slice of
  // state the buttons need and re-renders only when it changes.
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      strike: editor.isActive("strike"),
      code: editor.isActive("code"),
      headingLevel: HEADINGS.find(({ level }) =>
        editor.isActive("heading", { level }),
      )?.level,
      blockquote: editor.isActive("blockquote"),
      bulletList: editor.isActive("bulletList"),
      orderedList: editor.isActive("orderedList"),
      link: editor.isActive("link"),
      codeBlock: editor.isActive("codeBlock"),
      mermaidBlock: editor.isActive("mermaidBlock"),
      table: editor.isActive("table"),
    }),
  });

  const insertImage = () => {
    const src = window.prompt("Image URL");
    if (!src) return;
    const alt = window.prompt("Alt text (site convention allows size metadata)") ?? "";
    chain().setImage({ src, alt }).run();
  };

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 rounded-md border bg-background/95 p-1 backdrop-blur">
      <ToolbarButton label="Bold (⌘B)" active={state.bold} onClick={() => chain().toggleBold().run()}>
        <Bold />
      </ToolbarButton>
      <ToolbarButton label="Italic (⌘I)" active={state.italic} onClick={() => chain().toggleItalic().run()}>
        <Italic />
      </ToolbarButton>
      <ToolbarButton label="Strikethrough (⌘⇧X)" active={state.strike} onClick={() => chain().toggleStrike().run()}>
        <Strikethrough />
      </ToolbarButton>
      <ToolbarButton label="Inline code (⌘E)" active={state.code} onClick={() => chain().toggleCode().run()}>
        <Code />
      </ToolbarButton>

      <span className="mx-1 h-5 w-px bg-border" />

      {HEADINGS.map(({ level, icon: Icon, label }) => (
        <ToolbarButton
          key={level}
          label={label}
          active={state.headingLevel === level}
          onClick={() => chain().toggleHeading({ level }).run()}
        >
          <Icon />
        </ToolbarButton>
      ))}

      <span className="mx-1 h-5 w-px bg-border" />

      <ToolbarButton label="Blockquote" active={state.blockquote} onClick={() => chain().toggleBlockquote().run()}>
        <Quote />
      </ToolbarButton>
      <ToolbarButton label="Bullet list" active={state.bulletList} onClick={() => chain().toggleBulletList().run()}>
        <List />
      </ToolbarButton>
      <ToolbarButton label="Numbered list" active={state.orderedList} onClick={() => chain().toggleOrderedList().run()}>
        <ListOrdered />
      </ToolbarButton>
      <ToolbarButton label="Link (⌘K)" active={state.link} onClick={() => promptForLink(editor)}>
        <LinkIcon />
      </ToolbarButton>

      <span className="mx-1 h-5 w-px bg-border" />

      <ToolbarButton label="Code block" active={state.codeBlock} onClick={() => chain().toggleCodeBlock().run()}>
        <SquareCode />
      </ToolbarButton>
      <ToolbarButton
        label="Mermaid diagram"
        active={state.mermaidBlock}
        onClick={() =>
          chain()
            .insertContent({
              type: "mermaidBlock",
              attrs: { code: "graph TD;\n  A-->B;", height: null },
            })
            .run()
        }
      >
        <Workflow />
      </ToolbarButton>
      <ToolbarButton label="Image" onClick={insertImage}>
        <ImageIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Table"
        active={state.table}
        onClick={() => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
      >
        <TableIcon />
      </ToolbarButton>
    </div>
  );
}

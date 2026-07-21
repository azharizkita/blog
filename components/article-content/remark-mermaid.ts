import { visit } from "unist-util-visit";
import type { Code, Parent, Root } from "mdast";

/**
 * Replaces ```mermaid fences with <Mermaid chart="..."/> JSX nodes before
 * rehype-pretty-code runs, so diagram source is never syntax-highlighted and
 * reaches the client component as a plain prop. The <Mermaid> element is
 * resolved through the `components` map passed to MDXContent.
 */
export function remarkMermaid() {
  return (tree: Root) => {
    visit(tree, "code", (node: Code, index, parent) => {
      if (node.lang !== "mermaid" || !parent || index === undefined) return;

      // Optional fence meta sizes the reserved box exactly (zero layout
      // shift), mirroring the images' "alt|WxH" convention:
      // ```mermaid height=480
      const height = /(?:^|\s)height=(\d+)(?:\s|$)/.exec(node.meta ?? "")?.[1];

      const jsxNode = {
        type: "mdxJsxFlowElement",
        name: "Mermaid",
        attributes: [
          { type: "mdxJsxAttribute", name: "chart", value: node.value },
          ...(height
            ? [{ type: "mdxJsxAttribute", name: "height", value: height }]
            : []),
        ],
        children: [],
      };

      // mdxJsxFlowElement comes from mdast-util-mdx-jsx and isn't part of the
      // base mdast content union, hence the cast.
      parent.children[index] = jsxNode as unknown as Parent["children"][number];
    });
  };
}

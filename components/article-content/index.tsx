import { isValidElement, type ReactNode } from "react";
import { getImageData } from "@/lib/get-image-size";
import { evaluate } from "@mdx-js/mdx";
import Image from "next/image";
import * as runtime from "react/jsx-runtime";
import rehypePrettyCode from "rehype-pretty-code";
import placeholder from "./placeholder.png";
import { LinkIcon } from "lucide-react";
import Link from "next/link";
import remarkGfm from "remark-gfm";
import { remarkMermaid } from "./remark-mermaid";
import Mermaid from "@/components/mermaid";
import getSlug from "@/lib/get-slug";
import { cn } from "@/lib/utils";
import { cacheLife } from "next/cache";

interface ArticleContentProps {
  content: string;
  withBackNavigation?: boolean;
}

/**
 * Flattens heading children (strings, numbers, nested elements like inline
 * code or links) into plain text so getSlug never sees "[object Object]".
 */
function toText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(toText).join("");
  if (isValidElement(node)) {
    return toText((node.props as { children?: ReactNode }).children);
  }
  return "";
}

/**
 * The raw, uncached article pipeline. The editor's preview action renders
 * this directly: a "use cache" function cannot be executed inside a server
 * action's render (its cache-layer Flight decode fails with
 * "chunk.reason.enqueueModel is not a function"), and preview content is
 * ever-changing anyway, so caching it would only grow the dev cache.
 */
export async function ArticleContentUncached(props: ArticleContentProps) {

  const { content } = props;

  const { default: MDXContent } = await evaluate(content, {
    ...runtime,
    remarkPlugins: [remarkGfm, remarkMermaid],
    rehypePlugins: [
      [
        rehypePrettyCode,
        {
          keepBackground: false,
          theme: { dark: "github-dark-dimmed", light: "github-light" },
        },
      ],
    ],
  });

  return (
    <article id="article" className="isolate space-y-8 px-0 z-0">
      <MDXContent
        components={{
          Mermaid,
          a: ({ href, children, ...rest }) => {
            if (!href) return <span {...rest}>{children}</span>;

            const isInternal = href.startsWith("/");

            return (
              <Link
                href={href}
                {...(!isInternal && { target: "_blank" })}
                {...rest}
              >
                {children}
              </Link>
            );
          },
          p: ({ children, ...rest }) => (
            <p {...rest} className="prose-p">
              {children}
            </p>
          ),
          h1: ({ children, ...rest }) => (
            <h1 {...rest} className="prose-h1 mt-8 first:mt-0">
              {children}
            </h1>
          ),
          // Headings are promoted one level so the markdown "## Title" becomes
          // the page's single <h1>: ## -> h1, ### -> h2, #### -> h3.
          h4: ({ children, ...rest }) => (
            <h3 {...rest} className="prose-h3 mt-6 first:mt-0">
              {children}
            </h3>
          ),
          ul: ({ children, ...rest }) => (
            <ul {...rest} className="prose-list">
              {children}
            </ul>
          ),
          ol: ({ children, ...rest }) => (
            <ol {...rest} className="prose-list list-decimal">
              {children}
            </ol>
          ),
          blockquote: ({ children, ...rest }) => (
            <blockquote {...rest} className="prose-blockquote">
              {children}
            </blockquote>
          ),
          code: ({ children, className, ...rest }) => {
            // rehype-pretty-code marks fenced code blocks with data-language;
            // only style inline code with prose-code (blocks keep their theme).
            const isInline = !("data-language" in rest);
            return (
              <code
                {...rest}
                className={cn(className, isInline && "prose-code")}
              >
                {children}
              </code>
            );
          },
          table: ({ children, ...rest }) => {
            return (
              <div className="overflow-x-auto pb-4">
                <table {...rest} className="prose-table min-w-155">
                  {children}
                </table>
              </div>
            );
          },
          // "## Title" -> the page's single <h1>.
          h2: ({ children, ...rest }) => (
            <h1 {...rest} className="prose-h1 mt-8 first:mt-0">
              {children}
            </h1>
          ),
          // "### Section" -> <h2>, keeping the anchor-link affordance.
          h3: ({ children, ...rest }) => {
            const slug = getSlug(toText(children));
            return (
              <div className="w-full">
                <Link href={`#${slug}`} className="group inline-block w-full">
                  <h2
                    id={slug}
                    {...rest}
                    className="prose-h2 mt-8 first:mt-0 cursor-pointer hover:text-muted-foreground transition-colors w-full wrap-break-word"
                  >
                    <LinkIcon size={16} className="inline mr-2 mb-1" />
                    {children}
                  </h2>
                </Link>
              </div>
            );
          },
          img: ({ src, alt }) => {
            if (!src) return null;

            // Missing alt renders as decorative (alt="") rather than
            // silently dropping the image from the article.
            const { height, width, alt: _alt } = getImageData(alt ?? "");

            return (
              <Image
                src={src}
                alt={_alt}
                // Content column caps at max-w-3xl minus px-4 padding.
                sizes="(min-width: 48rem) 736px, 100vw"
                style={{
                  width: "100%",
                  height: "auto",
                  borderRadius: "8px",
                }}
                width={width}
                height={height}
                placeholder="blur"
                blurDataURL={placeholder.src}
              />
            );
          },
        }}
      />
    </article>
  );
}

export default async function ArticleContent(props: ArticleContentProps) {
  "use cache";
  cacheLife("max"); // article markdown is static; cache the MDX/shiki compile
  return ArticleContentUncached(props);
}

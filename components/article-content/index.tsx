import { getImageData } from "@/lib/get-image-size";
import { evaluate } from "@mdx-js/mdx";
import Image from "next/image";
import * as runtime from "react/jsx-runtime";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeStringify from "rehype-stringify";
import placeholder from "./placeholder.png";
import { CircleArrowLeft, LinkIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "../ui/button";
import remarkGfm from "remark-gfm";
import getSlug from "@/lib/get-slug";

interface ArticleContentProps {
  content: string;
  withBackNavigation?: boolean;
}

export default async function ArticleContent(props: ArticleContentProps) {
  const { content, withBackNavigation } = props;

  const { default: MDXContent } = await evaluate(content, {
    ...runtime,
    remarkPlugins: [remarkGfm],
    rehypePlugins: [
      [
        rehypePrettyCode,
        {
          keepBackground: false,
          theme: { dark: "github-dark-dimmed", light: "github-light" },
        },
      ],
      rehypeStringify,
    ],
  });

  return (
    <article id="article" className="flex flex-col gap-6">
      <MDXContent
        components={{
          a: ({ href, children, ...rest }) => {
            if (!href) return <span {...rest}>{children}</span>;

            const isInternal = href.startsWith("/");

            return (
              <Button
                asChild
                variant="link"
                className="!p-0 h-fit text-base font-normal"
              >
                <Link
                  href={href}
                  {...(!isInternal && { target: "_blank" })}
                  {...rest}
                >
                  {children}
                </Link>
              </Button>
            );
          },
          table: ({ children, ...rest }) => {
            return (
              <div className="overflow-x-auto pb-4">
                <table {...rest} className="w-full min-w-[620px]">
                  {children}
                </table>
              </div>
            );
          },
          thead: ({ children, ...rest }) => {
            return <thead {...rest}>{children}</thead>;
          },
          tr: ({ children, ...rest }) => {
            return (
              <tr {...rest} className="m-0 border-t p-0 even:bg-muted">
                {children}
              </tr>
            );
          },
          th: ({ children, ...rest }) => {
            return (
              <th
                {...rest}
                className="border px-4 py-2 text-left font-bold [&[align=center]]:text-center [&[align=right]]:text-right"
              >
                {children}
              </th>
            );
          },
          tbody: ({ children, ...rest }) => {
            return <tbody {...rest}>{children}</tbody>;
          },
          td: ({ children, ...rest }) => {
            return (
              <td
                {...rest}
                className="border px-4 py-2 text-left [&[align=center]]:text-center [&[align=right]]:text-right"
              >
                {children}
              </td>
            );
          },
          h1: ({ children, ...rest }) => {
            return (
              <h1
                {...rest}
                className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl"
              >
                {children}
              </h1>
            );
          },
          h2: ({ children, ...rest }) => {
            if (!withBackNavigation) {
              return (
                <h2
                  {...rest}
                  className="scroll-m-2 text-2xl font-semibold tracking-tight first:mt-0 w-full"
                >
                  {children}
                </h2>
              );
            }

            return (
              <div className="flex flex-col sticky top-17 z-50">
                <span className="flex gap-2 items-center w-full bg-white dark:bg-black pt-4 pb-2">
                  <Link
                    href="/articles"
                    className="cursor-pointer transition-all hover:text-muted-foreground duration-300"
                  >
                    <CircleArrowLeft />
                  </Link>
                  <h2
                    {...rest}
                    className="scroll-m-2 text-2xl font-semibold tracking-tight first:mt-0 w-full"
                  >
                    {children}
                  </h2>
                </span>
                <div className="flex w-full h-4 -mt-[0.5px] bg-gradient-to-b from-white via-white/50 to-white/0 sticky top-[116px] z-10 dark:from-black dark:via-black/50 dark:to-black/0" />
              </div>
            );
          },
          h3: ({ children, ...rest }) => {
            const content = String(children);
            const slug = getSlug(content);
            return (
              <div className="w-full">
                <Link href={`#${slug}`} className="group inline-block w-full">
                  <h3
                    id={slug}
                    {...rest}
                    className="scroll-m-36 text-xl font-semibold tracking-tight cursor-pointer hover:text-muted-foreground transition-colors w-full break-words"
                  >
                    <LinkIcon size={16} className="inline mr-2 mb-1" />
                    {children}
                  </h3>
                </Link>
              </div>
            );
          },
          h4: ({ children, ...rest }) => {
            return (
              <h4
                {...rest}
                className="scroll-m-20 text-lg font-semibold tracking-tight"
              >
                {children}
              </h4>
            );
          },
          p: ({ children, ...rest }) => {
            return (
              <p {...rest} className="leading-7 [&:not(:first-child)]:mt-2">
                {children}
              </p>
            );
          },
          blockquote: ({ children, ...rest }) => {
            return (
              <blockquote {...rest} className="border-l-2 pl-6 italic">
                {children}
              </blockquote>
            );
          },
          code: ({ children, ...rest }) => {
            return (
              <code
                {...rest}
                className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold"
              >
                {children}
              </code>
            );
          },
          ul: ({ children, ...rest }) => {
            return (
              <ul {...rest} className="ml-6 list-disc">
                {children}
              </ul>
            );
          },
          ol: ({ children, ...rest }) => {
            return (
              <ol {...rest} className="ml-6 list-decimal">
                {children}
              </ol>
            );
          },

          img: ({ src, alt }) => {
            if (!src || !alt) return null;

            const { height, width, alt: _alt } = getImageData(alt);

            return (
              <Image
                src={src}
                alt={_alt ?? ""}
                sizes="100vw"
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

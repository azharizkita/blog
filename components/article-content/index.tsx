import { getImageData } from "@/lib/get-image-size";
import { evaluate } from "@mdx-js/mdx";
import Image from "next/image";
import * as runtime from "react/jsx-runtime";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeStringify from "rehype-stringify";
import placeholder from "./placeholder.png";
import { CircleArrowLeft } from "lucide-react";
import Link from "next/link";

interface ArticleContentProps {
  content: string;
  isPoetry?: boolean;
  withBackNavigation?: boolean;
}

export default async function ArticleContent(props: ArticleContentProps) {
  const { content, withBackNavigation, isPoetry = false } = props;

  const { default: MDXContent } = await evaluate(content, {
    ...runtime,
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
    <article
      id="article"
      className={`flex flex-col gap-6 ${isPoetry && "justify-center"}`}
    >
      <MDXContent
        components={{
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
            if (withBackNavigation) {
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
              <div className="flex flex-col sticky top-[67px] z-20">
                <span className="flex gap-2 items-center w-full bg-background">
                  <Link href="/articles">
                    <CircleArrowLeft />
                  </Link>
                  <h2
                    {...rest}
                    className="scroll-m-2 text-2xl font-semibold tracking-tight first:mt-0 w-full"
                  >
                    {children}
                  </h2>
                </span>
                <div className="flex w-full h-4 bg-gradient-to-b from-background via-background/50 to-background/0 z-10 sticky top-[107px]" />
              </div>
            );
          },
          h3: ({ children, ...rest }) => {
            return (
              <h3
                {...rest}
                className="scroll-m-20 text-xl font-semibold tracking-tight"
              >
                {children}
              </h3>
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
              <p
                {...rest}
                className={`leading-7 [&:not(:first-child)]:mt-2 ${
                  isPoetry ? "text-center" : ""
                }`}
              >
                {children}
              </p>
            );
          },
          blockquote: ({ children, ...rest }) => {
            return (
              <blockquote {...rest} className="mt-6 border-l-2 pl-6 italic">
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

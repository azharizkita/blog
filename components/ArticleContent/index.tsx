import { getImageData } from "@/utils/get-image-size";
import { evaluate } from "@mdx-js/mdx";
import Image from "next/image";
import * as runtime from "react/jsx-runtime";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeStringify from "rehype-stringify";
import placeholder from "./placeholder.png";

export default async function ArticleContent({
  content,
  isPoetry,
}: {
  content: string;
  isPoetry: boolean;
}) {
  // @ts-expect-error: https://github.com/mdx-js/mdx/issues/2463#issuecomment-2039288869
  const { default: MDXContent } = await evaluate(content, {
    ...runtime,
    // remarkPlugins: [remarkUnwrapImages],
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
      className="markdown-body"
      style={{
        textAlign: isPoetry ? "center" : "unset",
        padding: isPoetry ? "2em 1.5em" : "2em",
      }}
    >
      <MDXContent
        components={{
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
import { getImageData } from "@/utils/get-image-size";
import { evaluate } from "@mdx-js/mdx";
import Image from "next/image";
import * as runtime from "react/jsx-runtime";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeStringify from "rehype-stringify";
import placeholder from "./placeholder.png";
import getSlug from "@/utils/get-slug";
import Title from "../Title";
import Link from "next/link";

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
      style={{
        textAlign: isPoetry ? "center" : "unset",
        padding: isPoetry ? "0em 2em 1.5em 2em" : "0em 2em 2em 2em",
        width: isPoetry ? "fit-content" : "100svw",
        scrollMargin: "0px",
      }}
    >
      <MDXContent
        components={{
          h2: ({ children, ...rest }) => {
            const title = JSON.stringify(children);
            const slug = getSlug(title);
            return (
              <div
                style={{
                  viewTransitionName: slug,
                  position: "sticky",
                  top: "-1px",
                  zIndex: 100,
                  marginLeft: "calc(-50vw + 50%)",
                  width: "100vw",
                  paddingTop: "1em",
                  paddingBottom: "1em",
                  backdropFilter: "blur(15px)",
                  justifyContent: "center",
                  display: "flex",
                }}
              >
                <Link href="#article" style={{ all: "unset" }}>
                  <h2 {...rest}>{children}</h2>
                </Link>
              </div>
            );
          },
          h3: ({ children }) => {
            const title = JSON.stringify(children);
            const slug = getSlug(title);
            return <Title slug={slug}>{children}</Title>;
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

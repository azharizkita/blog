import { ImageResponse } from "next/og";

import { config } from "@/lib/config";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const hasTitle = searchParams.has("title");
  const title = hasTitle ? searchParams.get("title") : "";

  return new ImageResponse(
    (
      <div
        style={{
          backgroundColor: "#0a0a0a",
          backgroundSize: "150px 150px",
          height: "100%",
          width: "100%",
          display: "flex",
          textAlign: "center",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          flexWrap: "nowrap",
          fontFamily: "Inter",
        }}
      >
        <div tw="flex flex-col items-center gap-0">
          <span tw="text-5xl font-semibold tracking-tight text-[#ffebec]">
            {config.site.name}
          </span>
          <span
            tw="max-w-[720px] pt-2 text-center text-lg leading-snug tracking-tight text-white"
            style={{
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 2,
              overflow: "hidden",
            }}
          >
            {config.site.description}
          </span>
        </div>
        {title && (
          <span tw="text-6xl font-semibold tracking-tight text-[#ffebec] pt-10 px-10">
            {title}
          </span>
        )}
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    },
  );
}

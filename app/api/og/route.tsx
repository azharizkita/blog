import { ImageResponse } from "next/og";

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
          fontFamily: '"Titillium Web", sans-serif',
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            justifyItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5em",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.5em",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <h1
                style={{
                  fontSize: "3em",
                  margin: 0,
                  lineHeight: "0.75em",
                  color: "rgb(237, 237, 237)",
                }}
              >
                Silenced
              </h1>
              <p
                style={{
                  color: "rgba(252, 82, 3, 0.9)",
                  lineHeight: "0.25em",
                  margin: 0,
                  fontWeight: "bold",
                  textAlign: "center",
                  fontSize: "1.25em",
                }}
              >
                personal dumps
              </p>
            </div>
          </div>
        </div>
        {title && (
          <div
            style={{
              fontSize: 60,
              fontStyle: "normal",
              letterSpacing: "-0.025em",
              color: "white",
              marginTop: 30,
              padding: "0 120px",
              lineHeight: 1.4,
              whiteSpace: "pre-wrap",
            }}
          >
            {title}
          </div>
        )}
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}

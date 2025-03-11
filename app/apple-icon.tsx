import { ImageResponse } from "next/og";

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: "1.25em",
          background: "black",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          borderRadius: "50%",
          fontWeight: "bold",
        }}
      >
        S
      </div>
    ),
    {
      width: 32,
      height: 32,
    }
  );
}

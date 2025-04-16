import { type, content, size } from "@/components/generated-logo";
import { ImageResponse } from "next/og";

export const contentType = type;

export default function Icon() {
  return new ImageResponse(content, size);
}

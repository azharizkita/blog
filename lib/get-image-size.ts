// Fallback rendering box for images whose alt text doesn't carry the
// "alt|WxH" dimension convention. next/image renders fluid (width 100%,
// height auto), so this only seeds the initial aspect ratio.
const FALLBACK_WIDTH = 1200;
const FALLBACK_HEIGHT = 675;

/**
 * Parses the "alt|WxH" convention used in article markdown, e.g.
 * "a sunset|1600x900". Plain alt text (no "|", or malformed dimensions)
 * falls back to a 16:9 box instead of throwing.
 */
export const getImageData = (imageAlt: string) => {
  const [alt = "", dimensionData = ""] = imageAlt.split("|");
  const [width, height] = dimensionData.split("x").map(Number);

  const hasDimensions =
    Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0;

  return {
    alt: alt.trim(),
    width: hasDimensions ? width : FALLBACK_WIDTH,
    height: hasDimensions ? height : FALLBACK_HEIGHT,
  };
};

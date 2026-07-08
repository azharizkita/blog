export const getImageData = (imageAlt: string) => {
  const [alt, dimensionData] = imageAlt.split("|");

  const [width, height] = dimensionData.split("x");

  return {
    alt,
    width: Number(width),
    height: Number(height),
  };
};

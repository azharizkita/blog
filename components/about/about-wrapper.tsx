import { Content } from "./content";
import { getAbout } from "@/repositories/about";

export default async function AboutWrapper() {
  const content = await getAbout();

  if (!content) return null;

  return <Content data={content} />;
}

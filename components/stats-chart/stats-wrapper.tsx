import { getProfileStats } from "@/repositories/stats";
import { Content } from "./content";

export default async function StatsWrapper() {
  const { languageStats } = await getProfileStats();

  return <Content data={languageStats} />;
}

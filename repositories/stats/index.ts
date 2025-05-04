import { DEFAULT_CACHE_TIME } from "@/constants";
import cache from "@/lib/cache";
import octokit from "@/lib/octokit";

type LanguageStat = {
  language: string;
  bytes: number;
};

type ProfileStats = {
  totalRepos: number;
  languageStats: LanguageStat[];
  languages: string[];
  totalBytes: number;
};

const limit = 6;

export const getProfileStats = cache(
  async (): Promise<ProfileStats> => {
    await octokit.rest.users.getAuthenticated();

    const repos = await octokit.paginate(
      octokit.rest.repos.listForAuthenticatedUser,
      {
        visibility: "all",
        per_page: 100,
      }
    );

    const repoLanguages: Promise<any>[] = [];

    for (const repo of repos) {
      if (repo.fork) continue;
      const query = octokit.rest.repos.listLanguages({
        owner: repo.owner.login,
        repo: repo.name,
      });

      repoLanguages.push(query);
    }

    const result = await Promise.all(repoLanguages);

    const languageTotals: Record<string, number> = {};

    result.forEach(({ data }) => {
      for (const [language, bytes] of Object.entries(data)) {
        if (language === "PHP" || language === "Blade") continue;
        languageTotals[language] =
          (languageTotals[language] || 0) + (bytes as number);
      }
    });

    const totalBytes = Object.values(languageTotals).reduce(
      (sum, b) => sum + b,
      0
    );

    const sortedStats = Object.entries(languageTotals)
      .map(([language, bytes]) => ({ language, bytes }))
      .sort((a, b) => b.bytes - a.bytes);

    const topStats = sortedStats.slice(0, limit);
    const topLanguages = topStats.map(({ language }) => language);

    return {
      totalRepos: repos.length,
      languages: topLanguages,
      languageStats: topStats,
      totalBytes,
    };
  },
  ["profile-stats"],
  { revalidate: DEFAULT_CACHE_TIME }
);

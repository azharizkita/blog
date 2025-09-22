import { config } from "@/lib/config";
import cache from "@/lib/cache";
import octokit from "@/lib/octokit";

type PinnedRepo = {
  name: string;
  description: string | null;
  url: string;
  language: string | null;
};

type PinnedReposResult = PinnedRepo[];

export const getPinnedRepos = cache(
  async (): Promise<PinnedReposResult> => {
    const { data: user } = await octokit.rest.users.getAuthenticated();
    const login = user.login;

    const result = await octokit.graphql<{
      user: {
        pinnedItems: {
          nodes: {
            name: string;
            description: string | null;
            url: string;
            primaryLanguage: { name: string } | null;
          }[];
        };
      };
    }>(
      `
      query($login: String!) {
        user(login: $login) {
          pinnedItems(first: 6, types: REPOSITORY) {
            nodes {
              ... on Repository {
                name
                description
                url
                primaryLanguage {
                  name
                }
              }
            }
          }
        }
      }
    `,
      { login }
    );

    const pinned = result.user.pinnedItems.nodes.map((repo) => ({
      name: repo.name,
      description: repo.description,
      url: repo.url,
      language: repo.primaryLanguage?.name || null,
    }));

    return pinned;
  },
  ["pinned-repos"],
  { revalidate: config.cache.defaultTime }
);

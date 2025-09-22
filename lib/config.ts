export const config = {
  github: {
    username: process.env.GITHUB_USERNAME || "azharizkita",
    token: process.env.GITHUB_PAT,
  },
  cache: {
    defaultTime: 3600 * 12, // 12 hours
  },
  site: {
    url: "https://lokey.bio",
    name: "Lokey",
  },
} as const;
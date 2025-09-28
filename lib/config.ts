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
  author: {
    name: process.env.AUTHOR_NAME || "Azhari Rizkita",
    email: process.env.AUTHOR_EMAIL || "reuses_reeds.0m@icloud.com",
    username: process.env.AUTHOR_USERNAME || "azharizkita",
    url: process.env.AUTHOR_URL || `https://github.com/${process.env.GITHUB_USERNAME || "azharizkita"}`,
  },
} as const;
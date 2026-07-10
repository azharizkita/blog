export const config = {
  github: {
    username: process.env.GITHUB_USERNAME || "azharizkita",
    token: process.env.GITHUB_PAT,
  },
  cache: {
    defaultTime: 3600 * 12, // 12 hours
  },
  indexNow: {
    // Public ownership key, also hosted at /<key>.txt (not a secret — the
    // whole point is that it's publicly readable). The trigger route is
    // protected separately by the INDEXNOW_SECRET env var.
    key: "c5f7f5b597300894f262a55236a68c83",
  },
  site: {
    url: "https://lokey.bio",
    name: "Lokey",
    description: "I shares thoughts, ideas, and creations through blog posts, articles, and other forms of content which hopefully inspire others.",
  },
  author: {
    name: process.env.AUTHOR_NAME || "Azhari Rizkita",
    email: process.env.AUTHOR_EMAIL || "reuses_reeds.0m@icloud.com",
    username: process.env.AUTHOR_USERNAME || "azharizkita",
    url:
      process.env.AUTHOR_URL ||
      `https://github.com/${process.env.GITHUB_USERNAME || "azharizkita"}`,
  },
} as const;

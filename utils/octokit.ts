import { Octokit } from "octokit";

const octokit = new Octokit({
  auth: process.env.GITHUB_PAT,
});

export default octokit;

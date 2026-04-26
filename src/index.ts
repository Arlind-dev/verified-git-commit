import * as fs from "node:fs";
import { execSync } from "node:child_process";

import { Octokit } from "@octokit/rest";
import { throttling } from "@octokit/plugin-throttling";
import type { Context, PluginSpec } from "semantic-release";
import parseRepositoryUrl from "parse-github-repo-url";

const ThrottlingOctokit = Octokit.plugin(throttling);

type RepositorySlug = {
  owner: string;
  name: string;
};


function getOctokit(token: string) {
  return new ThrottlingOctokit({
    auth: token,
    throttle: {
      onRateLimit: (retryAfter: number, options: any) => {
        console.warn(
          `RateLimit detected for request ${options.method} ${options.url}.`
        );
        console.info(`Retrying after ${retryAfter} seconds.`);
        return true;
      },
      onSecondaryRateLimit: (retryAfter: number, options: any) => {
        console.warn(
          `SecondaryRateLimit detected for request ${options.method} ${options.url}.`
        );
        console.info(`Retrying after ${retryAfter} seconds.`);
        return true;
      },
    },
  });
}

function unsafeParseString(value: string | undefined): string {
  if (typeof value === "string") {
    return value;
  }
  throw new Error("Expected a string value but received undefined");
}

function unsafeParseRepositorySlug(repositoryUrl: string): RepositorySlug {
  const maybeRepositoryUrl = parseRepositoryUrl(repositoryUrl);
  if (maybeRepositoryUrl === false) {
    throw new Error(`Could not parse repository URL: ${repositoryUrl}`);
  }
  return { owner: maybeRepositoryUrl[0], name: maybeRepositoryUrl[1] };
}

function unsafeParseAssets(pluginConfig: unknown): string[] {
  if (typeof pluginConfig === "string") {
    throw new Error(`Expected plugin config to specify 'assets'`);
  }
  const config = pluginConfig;
  if (typeof config !== "object" || config === null) {
    throw new Error("Expected plugin config to contain an object");
  }
  if (!("assets" in config)) {
    throw new Error("Expected plugin config to contain an `assets` property");
  }
  const assets = config.assets;
  if (!Array.isArray(assets)) {
    throw new Error(
      `Expected plugin config 'assets' to contain an array of strings`
    );
  }
  return assets.map((value) => unsafeParseString(value));
}

function verifyConditions(pluginConfig: PluginSpec, context: Context) {
  const repositoryUrl = unsafeParseString(context.options?.repositoryUrl);
  unsafeParseRepositorySlug(repositoryUrl);
  unsafeParseString(context.env["GITHUB_TOKEN"]);
  unsafeParseAssets(pluginConfig);
}

async function prepare(pluginConfig: PluginSpec, context: Context) {
  const repositoryUrl = unsafeParseString(context.options?.repositoryUrl);
  const branch = context.branch.name;
  const slug = unsafeParseRepositorySlug(repositoryUrl);
  const githubToken = unsafeParseString(context.env["GITHUB_TOKEN"]);
  const assets = unsafeParseAssets(pluginConfig);
  const octokit = getOctokit(githubToken);

  const nextRelease = context.nextRelease;
  if (nextRelease === undefined) {
    throw new Error(
      `Did not expect 'prepare' to be invoked with undefined 'nextRelease'`
    );
  }

  const message = `chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}`;

  // Get the current HEAD commit of the branch
  const refData = await octokit.rest.git.getRef({
    owner: slug.owner,
    repo: slug.name,
    ref: `heads/${branch}`,
  });
  const headCommitSha = refData.data.object.sha;

  // Get the base tree SHA from that commit
  const commitData = await octokit.rest.git.getCommit({
    owner: slug.owner,
    repo: slug.name,
    commit_sha: headCommitSha,
  });
  const baseTreeSha = commitData.data.tree.sha;

  // Create blobs for all assets in parallel
  const treeItems = await Promise.all(
    assets.map(async (assetPath) => {
      const content = fs.readFileSync(assetPath, { encoding: "utf-8" });
      const blobData = await octokit.rest.git.createBlob({
        owner: slug.owner,
        repo: slug.name,
        content,
        encoding: "utf-8",
      });
      return {
        path: assetPath,
        mode: "100644" as const,
        type: "blob" as const,
        sha: blobData.data.sha,
      };
    })
  );

  // Create a single tree with all changed files
  const treeData = await octokit.rest.git.createTree({
    owner: slug.owner,
    repo: slug.name,
    base_tree: baseTreeSha,
    tree: treeItems,
  });

  // Create the commit (GitHub signs it automatically for app/bot tokens)
  const newCommitData = await octokit.rest.git.createCommit({
    owner: slug.owner,
    repo: slug.name,
    message,
    tree: treeData.data.sha,
    parents: [headCommitSha],
  });

  const preparedCommitSha = newCommitData.data.sha;

  // Advance the branch ref
  await octokit.rest.git.updateRef({
    owner: slug.owner,
    repo: slug.name,
    ref: `heads/${branch}`,
    sha: preparedCommitSha,
  });

  // Sync local state so semantic-release's git tag points to the new commit
  execSync("git fetch origin", { stdio: "inherit" });
  execSync(`git reset --hard origin/${branch}`, { stdio: "inherit" });
}

module.exports = {
  verifyConditions,
  prepare,
};

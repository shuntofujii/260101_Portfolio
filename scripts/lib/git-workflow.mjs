import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { repoRoot } from './env.mjs';
import { PROJECTS_JSON_PATH, readProjectsJson, writeProjectsJson } from './update-projects-json.mjs';

/** @param {string} command */
function runGit(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')}\n${result.stdout}\n${result.stderr}`.trim()
    );
  }
  return (result.stdout || '').trim();
}

/**
 * @param {object} options
 * @param {string} options.message
 * @param {string[]} [options.paths]
 * @param {boolean} [options.push]
 */
export function commitLocalChanges(options) {
  const paths = options.paths ?? [PROJECTS_JSON_PATH];
  for (const filePath of paths) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`コミット対象が見つかりません: ${filePath}`);
    }
    runGit('git', ['add', path.relative(repoRoot, filePath)]);
  }
  runGit('git', ['commit', '-m', options.message]);
  if (options.push) {
    runGit('git', ['push']);
  }
}

/**
 * GitHub Contents API で projects.json を更新
 * @param {object} options
 * @param {string} options.message
 * @param {Array<Record<string, unknown>>} options.projects
 * @param {string} [options.branch]
 */
export async function commitProjectsJsonViaGitHub(options, env = process.env) {
  const token = env.GITHUB_TOKEN;
  const owner = env.GITHUB_OWNER;
  const repo = env.GITHUB_REPO;
  const branch = options.branch ?? env.GITHUB_BRANCH ?? 'main';

  if (!token || !owner || !repo) {
    throw new Error('GitHub API 利用には GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO が必要です。');
  }

  const apiBase = `https://api.github.com/repos/${owner}/${repo}/contents/projects.json`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  const getRes = await fetch(`${apiBase}?ref=${encodeURIComponent(branch)}`, { headers });
  if (!getRes.ok) {
    throw new Error(`GitHub API GET failed (${getRes.status}): ${await getRes.text()}`);
  }

  const current = await getRes.json();
  const content = `${JSON.stringify(options.projects, null, 2)}\n`;
  const encoded = Buffer.from(content, 'utf8').toString('base64');

  const putRes = await fetch(apiBase, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: options.message,
      content: encoded,
      sha: current.sha,
      branch,
    }),
  });

  if (!putRes.ok) {
    throw new Error(`GitHub API PUT failed (${putRes.status}): ${await putRes.text()}`);
  }

  return putRes.json();
}

/** @param {string} scriptRelative scripts/ からの相対パス */
export function runRepoScript(scriptRelative) {
  const scriptPath = path.join(repoRoot, 'scripts', scriptRelative);
  const result = spawnSync('node', [scriptPath], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: 'pipe',
  });
  if (result.status !== 0) {
    throw new Error(
      `node scripts/${scriptRelative} failed\n${result.stdout}\n${result.stderr}`.trim()
    );
  }
  return (result.stdout || '').trim();
}

export function rebuildProjectPages() {
  runRepoScript('build-project-pages.mjs');
}

export function runMetaAudit() {
  const scriptPath = path.join(repoRoot, 'meta-audit.js');
  const result = spawnSync('node', [scriptPath], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: 'pipe',
  });
  if (result.status !== 0) {
    throw new Error(`meta-audit.js failed\n${result.stdout}\n${result.stderr}`.trim());
  }
}

export { readProjectsJson, writeProjectsJson, PROJECTS_JSON_PATH };

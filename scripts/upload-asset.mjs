#!/usr/bin/env node
/**
 * Cloudflare R2 へ画像・動画をアップロードする CLI
 *
 * 例:
 *   npm run upload -- --project izumo --prefix strategy2024 --type image --file ./photo.jpg --update-json
 *   npm run upload -- --project dates --prefix murder_process --type video --file ./clip.mp4 --update-json --rebuild --commit --push
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { ASSETS_CACHE_V, baseAssetsUrl } from '../constants.js';
import {
  buildCaseFilename,
  buildPublicUrl,
  buildR2Key,
  findInitiative,
  findProject,
} from './lib/asset-paths.mjs';
import {
  extractVideoPosterWebp,
  prepareMediaFile,
} from './lib/convert-media.mjs';
import { loadEnvFile } from './lib/env.mjs';
import {
  commitLocalChanges,
  commitProjectsJsonViaGitHub,
  PROJECTS_JSON_PATH,
  rebuildProjectPages,
  runMetaAudit,
} from './lib/git-workflow.mjs';
import { uploadToR2 } from './lib/r2-upload.mjs';
import {
  applyProjectsJsonUpdate,
  readProjectsJson,
  resolveNextNumber,
  writeProjectsJson,
} from './lib/update-projects-json.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function printHelp() {
  console.log(`\
用法: npm run upload -- [options]

必須:
  --project <slug>       projectSlug（例: izumo, dates）
  --file <path>          変換元ファイル（jpg/png/mp4/mov 等。webp/webm はそのままアップロード）

メディア種別（いずれか）:
  --type image           cases 用画像 → {prefix}_p_{n}.webp
  --type video           cases 用動画 → {prefix}_m_{n}.webm + ポスター .webp
  --type hero            ヒーロー動画（--dest-name 必須）
  --type thumbnail       サムネイル画像（--dest-name 必須）

cases 用（--type image / video）:
  --prefix <name>        assetPrefix（例: strategy2024）
  --number <n>           通番（省略時: projects.json から自動採番）
  --case <title>         対象 case の title（同名 prefix が複数ある場合）

配置先:
  --folder <name>        R2 上のフォルダ（既定: projectSlug。hero/thumbnail は top 等）
  --dest-name <filename> hero/thumbnail 用ファイル名（例: video-04.webm）

更新・公開:
  --update-json          projects.json の images/videos または hero/thumbnail を更新
  --rebuild              build-project-pages.mjs を実行
  --commit               変更を git commit（projects.json と再生成 HTML）
  --push                 --commit 後に git push（GitHub Actions デプロイを起動）
  --github-commit        GitHub Contents API で projects.json のみリモート更新
  --keep-audio           動画変換時に音声を残す
  --dry-run              変換・アップロード・Git をスキップして計画のみ表示

環境変数（.env）:
  R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
  R2_PUBLIC_BASE_URL（省略時: constants.js の baseAssetsUrl）
  GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO（--github-commit 時）
`);
}

/** @returns {Record<string, string | boolean>} */
function parseArgs(argv) {
  /** @type {Record<string, string | boolean>} */
  const args = { help: false, dryRun: false, updateJson: false, rebuild: false, commit: false, push: false, githubCommit: false, keepAudio: false };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--help' || token === '-h') {
      args.help = true;
      continue;
    }
    if (token === '--dry-run') {
      args.dryRun = true;
      continue;
    }
    if (token === '--update-json') {
      args.updateJson = true;
      continue;
    }
    if (token === '--rebuild') {
      args.rebuild = true;
      continue;
    }
    if (token === '--commit') {
      args.commit = true;
      continue;
    }
    if (token === '--push') {
      args.push = true;
      continue;
    }
    if (token === '--github-commit') {
      args.githubCommit = true;
      continue;
    }
    if (token === '--keep-audio') {
      args.keepAudio = true;
      continue;
    }

    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      throw new Error(`--${token.replace(/^--/, '')} には値が必要です。`);
    }

    if (token === '--project') args.project = next;
    else if (token === '--file') args.file = next;
    else if (token === '--type') args.type = next;
    else if (token === '--prefix') args.prefix = next;
    else if (token === '--number') args.number = next;
    else if (token === '--case') args.caseTitle = next;
    else if (token === '--folder') args.folder = next;
    else if (token === '--dest-name') args.destName = next;
    else throw new Error(`不明な引数: ${token}`);

    i += 1;
  }

  return args;
}

function validateArgs(args) {
  if (args.help) return;
  if (!args.project) throw new Error('--project は必須です。');
  if (!args.file) throw new Error('--file は必須です。');
  if (!args.type) throw new Error('--type は必須です（image / video / hero / thumbnail）。');

  const allowed = new Set(['image', 'video', 'hero', 'thumbnail']);
  if (!allowed.has(String(args.type))) {
    throw new Error('--type は image / video / hero / thumbnail のいずれかです。');
  }

  if (args.type === 'image' || args.type === 'video') {
    if (!args.prefix) throw new Error('cases 用アップロードには --prefix が必要です。');
  }

  if (args.type === 'hero' || args.type === 'thumbnail') {
    if (!args.destName) throw new Error('hero / thumbnail には --dest-name が必要です。');
  }

  if (args.push && !args.commit && !args.githubCommit) {
    throw new Error('--push は --commit または --github-commit と併用してください。');
  }

  if (!fs.existsSync(args.file)) {
    throw new Error(`入力ファイルが見つかりません: ${args.file}`);
  }
}

/** @param {Record<string, string | boolean>} args */
async function main(argv) {
  Object.assign(process.env, loadEnvFile());

  const args = parseArgs(argv);
  if (args.help) {
    printHelp();
    return;
  }
  validateArgs(args);

  const env = process.env;
  const publicBase = env.R2_PUBLIC_BASE_URL || baseAssetsUrl;
  const folder = args.folder || args.project;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-upload-'));

  try {
    /** @type {Array<{ key: string, localPath: string, label: string }>} */
    const uploadPlan = [];
    let number = args.number ? Number(args.number) : null;
    let jsonTarget = null;

    if (args.type === 'hero' || args.type === 'thumbnail') {
      const destName = String(args.destName);
      const mediaType = args.type === 'hero' ? 'video' : 'image';
      const preparedPath = path.join(tempDir, destName);

      await prepareMediaFile(String(args.file), preparedPath, mediaType, {
        keepAudio: Boolean(args.keepAudio),
      });
      uploadPlan.push({
        key: buildR2Key(String(folder), destName),
        localPath: preparedPath,
        label: destName,
      });

      if (args.type === 'hero') {
        const posterName = destName.replace(/\.webm$/i, '.webp');
        const posterPath = path.join(tempDir, posterName);
        await extractVideoPosterWebp(preparedPath, posterPath);
        uploadPlan.push({
          key: buildR2Key(String(folder), posterName),
          localPath: posterPath,
          label: posterName,
        });
      }

      jsonTarget = args.type === 'hero' ? 'hero' : 'thumbnail';
    } else {
      const mediaType = args.type === 'video' ? 'video' : 'image';
      const projects = readProjectsJson();
      const project = findProject(projects, String(args.project));
      if (!project) {
        throw new Error(`projects.json に projectSlug="${args.project}" がありません。`);
      }

      const initiative = findInitiative(project, String(args.prefix), args.caseTitle ? String(args.caseTitle) : undefined);
      if (!initiative && args.updateJson) {
        throw new Error(`--update-json には projects.json 内の assetPrefix="${args.prefix}" が必要です。`);
      }

      if (number == null) {
        if (!initiative) {
          throw new Error('--number 未指定時は projects.json 内の initiative が必要です。');
        }
        number = resolveNextNumber(initiative, mediaType);
      }

      const filename = buildCaseFilename(String(args.prefix), mediaType, number);
      const preparedPath = path.join(tempDir, filename);

      await prepareMediaFile(String(args.file), preparedPath, mediaType, {
        keepAudio: Boolean(args.keepAudio),
      });
      uploadPlan.push({
        key: buildR2Key(String(folder), filename),
        localPath: preparedPath,
        label: filename,
      });

      if (mediaType === 'video') {
        const posterName = filename.replace(/\.webm$/i, '.webp');
        const posterPath = path.join(tempDir, posterName);
        await extractVideoPosterWebp(preparedPath, posterPath);
        uploadPlan.push({
          key: buildR2Key(String(folder), posterName),
          localPath: posterPath,
          label: posterName,
        });
      }
    }

    console.log('--- アップロード計画 ---');
    for (const item of uploadPlan) {
      console.log(`  ${item.key}`);
    }

    if (args.dryRun) {
      console.log('\n(dry-run: アップロード・JSON 更新はスキップしました)');
      return;
    }

    for (const item of uploadPlan) {
      const result = await uploadToR2({ key: item.key, filePath: item.localPath }, env);
      console.log(`✓ R2: ${result.bucket}/${result.key}`);
    }

    const primary = uploadPlan[0];
    const publicUrl = `${buildPublicUrl(publicBase, String(folder), path.basename(primary.localPath))}${ASSETS_CACHE_V}`;

    if (args.updateJson) {
      const updateOptions = {
        projectSlug: String(args.project),
        number: number ?? 1,
        publicUrl,
      };

      if (jsonTarget === 'hero') {
        updateOptions.target = 'hero';
      } else if (jsonTarget === 'thumbnail') {
        updateOptions.target = 'thumbnail';
      } else {
        updateOptions.assetPrefix = String(args.prefix);
        updateOptions.mediaType = args.type === 'video' ? 'video' : 'image';
        if (args.caseTitle) updateOptions.caseTitle = String(args.caseTitle);
      }

      const { projects } = applyProjectsJsonUpdate(updateOptions);
      writeProjectsJson(projects);
      console.log(`✓ projects.json を更新しました (${publicUrl})`);
    }

    /** @type {string[]} */
    const commitPaths = [];
    if (args.updateJson) {
      commitPaths.push(PROJECTS_JSON_PATH);
    }

    if (args.rebuild) {
      runMetaAudit();
      rebuildProjectPages();
      console.log('✓ build-project-pages.mjs を実行しました');
      if (args.commit) {
        const root = path.join(__dirname, '..');
        for (const entry of fs.readdirSync(root)) {
          if (entry === 'node_modules' || entry.startsWith('.')) continue;
          const full = path.join(root, entry);
          if (fs.statSync(full).isDirectory() && fs.existsSync(path.join(full, 'index.html'))) {
            commitPaths.push(path.join(full, 'index.html'));
          }
        }
      }
    }

    const commitMessage = `chore(assets): upload ${uploadPlan.map((i) => i.label).join(', ')}`;

    if (args.githubCommit && args.updateJson) {
      const projects = readProjectsJson();
      await commitProjectsJsonViaGitHub({ message: commitMessage, projects }, env);
      console.log('✓ GitHub API で projects.json を更新しました');
      if (args.push) {
        console.log('ℹ --push は GitHub API 更新時は不要です（リモートは既に更新済み）。Actions が起動します。');
      }
    } else if (args.commit) {
      commitLocalChanges({
        message: commitMessage,
        paths: commitPaths,
        push: Boolean(args.push),
      });
      console.log(`✓ git commit${args.push ? ' & push' : ''} 完了`);
    }

    console.log(`\n公開 URL: ${publicUrl}`);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

main(process.argv.slice(2)).catch((error) => {
  console.error(`\nエラー: ${error.message}`);
  process.exit(1);
});

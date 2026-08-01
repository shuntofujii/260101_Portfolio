#!/usr/bin/env node
/**
 * CDN（R2）上のヒーロー動画・プロフィール画像を軽量化して上書きアップロードする。
 *
 * 例:
 *   node scripts/optimize-cdn-assets.mjs --dry-run
 *   node scripts/optimize-cdn-assets.mjs
 *   node scripts/optimize-cdn-assets.mjs --bump-cache
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { ASSETS_CACHE_V, baseAssetsUrl } from '../constants.js';
import {
  convertVideoToWebm,
  extractVideoPosterWebp,
  resizeImageToWebp,
} from './lib/convert-media.mjs';
import { loadEnvFile, repoRoot } from './lib/env.mjs';
import { uploadToR2 } from './lib/r2-upload.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** PageSpeed で効きやすいヒーロー動画（top/） */
const HERO_VIDEOS = [
  'video-01.webm',
  'video-02.webm',
  'video-03.webm',
  'video-04.webm',
  'video-05.webm',
  'video-06.webm',
  'video-07.webm',
  'video-08.webm',
];

/** プロフィール画像は入場演出でも使うため、原寸に近い解像度を維持（過度な縮小はしない） */
const PROFILE_IMAGES = [
  { name: 'shuntofujii_1.webp', maxWidth: 609, quality: 90 },
  { name: 'shuntofujii_2.webp', maxWidth: 609, quality: 90 },
];

function parseArgs(argv) {
  const args = { dryRun: false, bumpCache: false, skipVideos: false, skipProfiles: false };
  for (const token of argv) {
    if (token === '--dry-run') args.dryRun = true;
    else if (token === '--bump-cache') args.bumpCache = true;
    else if (token === '--skip-videos') args.skipVideos = true;
    else if (token === '--skip-profiles') args.skipProfiles = true;
    else if (token === '--help' || token === '-h') args.help = true;
    else throw new Error(`不明な引数: ${token}`);
  }
  return args;
}

async function downloadFile(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`ダウンロード失敗 ${res.status}: ${url}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.promises.writeFile(destPath, buf);
  return buf.length;
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * constants.js の ASSETS_CACHE_V を今日の日付に更新し、リポジトリ内の ?v= を置換
 * @returns {string} 新しいクエリ（例: ?v=20260803）
 */
function bumpAssetsCacheVersion() {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  const next = `?v=${y}${m}${d}`;
  const prev = ASSETS_CACHE_V;

  if (prev === next) {
    console.log(`キャッシュバスターは既に ${next} です（置換スキップ）`);
    return next;
  }

  const constantsPath = path.join(repoRoot, 'constants.js');
  let constantsText = fs.readFileSync(constantsPath, 'utf8');
  constantsText = constantsText.replace(
    /export const ASSETS_CACHE_V = '\?v=\d+';/,
    `export const ASSETS_CACHE_V = '${next}';`
  );
  fs.writeFileSync(constantsPath, constantsText);

  const exts = new Set(['.js', '.html', '.json', '.css', '.md', '.mjs', '.webmanifest']);
  const skipDirs = new Set(['node_modules', '.git', 'vendor', 'tests']);

  /** @param {string} dir */
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') && entry.name !== '.env.example') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (skipDirs.has(entry.name)) continue;
        walk(full);
        continue;
      }
      if (!exts.has(path.extname(entry.name))) continue;
      const text = fs.readFileSync(full, 'utf8');
      if (!text.includes(prev)) continue;
      fs.writeFileSync(full, text.split(prev).join(next));
      console.log(`  bump: ${path.relative(repoRoot, full)}`);
    }
  }

  walk(repoRoot);
  console.log(`✓ ASSETS_CACHE_V: ${prev} → ${next}`);
  return next;
}

async function main(argv) {
  Object.assign(process.env, loadEnvFile());
  const args = parseArgs(argv);
  if (args.help) {
    console.log(`用法: node scripts/optimize-cdn-assets.mjs [--dry-run] [--bump-cache] [--skip-videos] [--skip-profiles]`);
    return;
  }

  const publicBase = (process.env.R2_PUBLIC_BASE_URL || baseAssetsUrl).replace(/\/$/, '');
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-opt-'));
  const srcDir = path.join(tempRoot, 'src');
  const outDir = path.join(tempRoot, 'out');
  fs.mkdirSync(srcDir);
  fs.mkdirSync(outDir);

  /** @type {Array<{ key: string, localPath: string, before: number, after: number }>} */
  const uploads = [];

  try {
    if (!args.skipVideos) {
      console.log('\n=== ヒーロー動画 ===');
      for (const name of HERO_VIDEOS) {
        const url = `${publicBase}/top/${name}${ASSETS_CACHE_V}`;
        const srcPath = path.join(srcDir, name);
        const outPath = path.join(outDir, name);
        try {
          const before = await downloadFile(url, srcPath);
          console.log(`↓ ${name} ${formatBytes(before)}`);
          // ヒーロー背景向け: 長辺1280・24fps・CRF40（無音）
          await convertVideoToWebm(srcPath, outPath, {
            keepAudio: false,
            crf: 40,
            maxEdge: 1280,
            fps: 24,
          });
          const after = fs.statSync(outPath).size;
          const ratio = ((1 - after / before) * 100).toFixed(0);
          console.log(`  → ${formatBytes(after)} (−${ratio}%)`);
          uploads.push({ key: `top/${name}`, localPath: outPath, before, after });

          const posterName = name.replace(/\.webm$/i, '.webp');
          const posterPath = path.join(outDir, posterName);
          try {
            await extractVideoPosterWebp(outPath, posterPath);
            uploads.push({
              key: `top/${posterName}`,
              localPath: posterPath,
              before: 0,
              after: fs.statSync(posterPath).size,
            });
            console.log(`  poster ${posterName} ${formatBytes(fs.statSync(posterPath).size)}`);
          } catch (posterErr) {
            console.warn(`  ⚠ poster ${posterName}: ${posterErr.message}`);
          }
        } catch (err) {
          console.warn(`⚠ ${name}: ${err.message}（スキップ）`);
        }
      }
    }

    if (!args.skipProfiles) {
      console.log('\n=== プロフィール画像 ===');
      for (const item of PROFILE_IMAGES) {
        const url = `${publicBase}/top/${item.name}${ASSETS_CACHE_V}`;
        const srcPath = path.join(srcDir, item.name);
        const outPath = path.join(outDir, item.name);
        const before = await downloadFile(url, srcPath);
        console.log(`↓ ${item.name} ${formatBytes(before)}`);
        // 原寸（maxWidth）を上限に、品質高めのまま再エンコードのみ（過度な縮小はしない）
        await resizeImageToWebp(srcPath, outPath, {
          width: item.maxWidth,
          quality: item.quality,
        });
        const after = fs.statSync(outPath).size;
        const ratio = ((1 - after / before) * 100).toFixed(0);
        console.log(`  → ${formatBytes(after)} (−${ratio}%) maxWidth=${item.maxWidth} q=${item.quality}`);
        uploads.push({ key: `top/${item.name}`, localPath: outPath, before, after });
      }
    }

    console.log('\n--- アップロード計画 ---');
    for (const item of uploads) {
      console.log(`  ${item.key}  ${formatBytes(item.after)}`);
    }

    if (args.dryRun) {
      console.log('\n(dry-run: R2 アップロードはスキップ)');
      return;
    }

    for (const item of uploads) {
      const result = await uploadToR2({ key: item.key, filePath: item.localPath }, process.env);
      console.log(`✓ R2: ${result.bucket}/${result.key}`);
    }

    const videoSaved = uploads
      .filter((u) => u.key.endsWith('.webm'))
      .reduce((sum, u) => sum + Math.max(0, u.before - u.after), 0);
    console.log(`\n動画の削減合計: ${formatBytes(videoSaved)}`);

    if (args.bumpCache) {
      console.log('\n=== キャッシュバスター更新 ===');
      bumpAssetsCacheVersion();
    } else {
      console.log('\nℹ ブラウザキャッシュ更新には --bump-cache か、手動で ASSETS_CACHE_V を更新してください。');
    }
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

main(process.argv.slice(2)).catch((error) => {
  console.error(`\nエラー: ${error.message}`);
  process.exit(1);
});

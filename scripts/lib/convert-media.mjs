import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

/** @returns {Promise<void>} */
function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with ${code}\n${stderr}`));
    });
  });
}

/** @returns {Promise<boolean>} */
export async function commandExists(command) {
  try {
    await runCommand('which', [command]);
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} inputPath
 * @param {string} outputPath
 */
export async function convertImageToWebp(inputPath, outputPath) {
  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
  await sharp(inputPath)
    .webp({ quality: 85, effort: 4 })
    .toFile(outputPath);
}

/**
 * @param {string} inputPath
 * @param {string} outputPath
 * @param {{ keepAudio?: boolean }} [options]
 */
export async function convertVideoToWebm(inputPath, outputPath, options = {}) {
  const hasFfmpeg = await commandExists('ffmpeg');
  if (!hasFfmpeg) {
    throw new Error('ffmpeg が見つかりません。`brew install ffmpeg` 等でインストールしてください。');
  }

  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });

  const args = ['-y', '-i', inputPath, '-c:v', 'libvpx-vp9', '-crf', '35', '-b:v', '0'];
  if (options.keepAudio) {
    args.push('-c:a', 'libopus', '-b:a', '96k');
  } else {
    args.push('-an');
  }
  args.push(outputPath);

  await runCommand('ffmpeg', args);
}

/**
 * 動画ポスター（同名 .webp）を生成
 * @param {string} sourcePath 変換前または変換後の動画
 * @param {string} outputPath
 */
export async function extractVideoPosterWebp(sourcePath, outputPath) {
  const hasFfmpeg = await commandExists('ffmpeg');
  if (!hasFfmpeg) {
    throw new Error('ffmpeg が見つかりません。');
  }

  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
  await runCommand('ffmpeg', [
    '-y',
    '-ss',
    '0.5',
    '-i',
    sourcePath,
    '-vframes',
    '1',
    '-c:v',
    'libwebp',
    '-quality',
    '85',
    outputPath,
  ]);
}

/**
 * 入力がすでに webp/webm ならコピー、それ以外は変換
 * @param {string} inputPath
 * @param {string} outputPath
 * @param {'image' | 'video'} mediaType
 * @param {{ keepAudio?: boolean }} [options]
 */
export async function prepareMediaFile(inputPath, outputPath, mediaType, options = {}) {
  const ext = path.extname(inputPath).toLowerCase();

  if (mediaType === 'image') {
    if (ext === '.webp') {
      await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.promises.copyFile(inputPath, outputPath);
      return;
    }
    await convertImageToWebp(inputPath, outputPath);
    return;
  }

  if (ext === '.webm') {
    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.promises.copyFile(inputPath, outputPath);
    return;
  }

  await convertVideoToWebm(inputPath, outputPath, options);
}

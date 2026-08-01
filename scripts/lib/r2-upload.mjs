import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { requireEnv } from './env.mjs';

/** @returns {import('@aws-sdk/client-s3').S3Client} */
export function createR2Client(env = process.env) {
  const config = requireEnv(['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'], env);
  return new S3Client({
    region: 'auto',
    endpoint: `https://${config.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.R2_ACCESS_KEY_ID,
      secretAccessKey: config.R2_SECRET_ACCESS_KEY,
    },
  });
}

const CONTENT_TYPES = {
  '.webp': 'image/webp',
  '.webm': 'video/webm',
  '.svg': 'image/svg+xml',
};

/**
 * @param {object} options
 * @param {string} options.key R2 オブジェクトキー（例: izumo/strategy2024_p_1.webp）
 * @param {string} options.filePath ローカルファイル
 * @param {boolean} [options.dryRun]
 */
export async function uploadToR2(options, env = process.env) {
  const config = requireEnv(['R2_BUCKET_NAME'], env);
  const ext = path.extname(options.filePath).toLowerCase();
  const contentType = CONTENT_TYPES[ext] ?? 'application/octet-stream';

  if (options.dryRun) {
    return { key: options.key, bucket: config.R2_BUCKET_NAME, contentType, dryRun: true };
  }

  const client = createR2Client(env);
  const body = fs.createReadStream(options.filePath);

  await client.send(
    new PutObjectCommand({
      Bucket: config.R2_BUCKET_NAME,
      Key: options.key,
      Body: body,
      ContentType: contentType,
    })
  );

  return { key: options.key, bucket: config.R2_BUCKET_NAME, contentType, dryRun: false };
}

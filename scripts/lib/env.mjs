import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.join(__dirname, '../..');

/** @returns {Record<string, string>} */
export function loadEnvFile(envPath = path.join(repoRoot, '.env')) {
  if (!fs.existsSync(envPath)) return {};

  const env = {};
  const text = fs.readFileSync(envPath, 'utf8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

/** @param {string[]} keys */
export function requireEnv(keys, env = { ...process.env, ...loadEnvFile() }) {
  const missing = keys.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(`環境変数が不足しています: ${missing.join(', ')}\n.env.example を参照してください。`);
  }
  return env;
}

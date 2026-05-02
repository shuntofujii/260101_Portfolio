import { describe, expect, it } from 'vitest';
import {
  SITE_BROKEN_EVAL_MIN_MS,
  SITE_BROKEN_EVAL_MIN_MS_WHILE_BROKEN,
  SITE_BROKEN_EVAL_JITTER_MS,
  SITE_BROKEN_TO_NORMAL_CHANCE,
  SITE_BROKEN_TO_BROKEN_CHANCE
} from '../constants.js';

describe('siteBrokenPeriod 設定', () => {
  it('評価間隔の下限は 3 秒前後以上', () => {
    expect(SITE_BROKEN_EVAL_MIN_MS).toBeGreaterThanOrEqual(3000);
    expect(SITE_BROKEN_EVAL_MIN_MS_WHILE_BROKEN).toBeGreaterThanOrEqual(2000);
  });

  it('ジッターは非負', () => {
    expect(SITE_BROKEN_EVAL_JITTER_MS).toBeGreaterThanOrEqual(0);
  });

  it('確率は 0〜1', () => {
    expect(SITE_BROKEN_TO_NORMAL_CHANCE).toBeGreaterThanOrEqual(0);
    expect(SITE_BROKEN_TO_NORMAL_CHANCE).toBeLessThanOrEqual(1);
    expect(SITE_BROKEN_TO_BROKEN_CHANCE).toBeGreaterThanOrEqual(0);
    expect(SITE_BROKEN_TO_BROKEN_CHANCE).toBeLessThanOrEqual(1);
  });

  it('崩れから通常へ戻す抽選の方が、通常から崩れへ入るより高め（戻りを増やす意図）', () => {
    expect(SITE_BROKEN_TO_NORMAL_CHANCE).toBeGreaterThan(SITE_BROKEN_TO_BROKEN_CHANCE);
  });
});

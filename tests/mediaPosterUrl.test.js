import { describe, expect, it } from 'vitest';
import { posterImageUrlFromVideoUrl } from '../media.js';

describe('posterImageUrlFromVideoUrl', () => {
  it('クエリ付き webm を webp に差し替える', () => {
    expect(
      posterImageUrlFromVideoUrl('https://cdn.example.com/proj/foo_m_1.webm?v=20260801')
    ).toBe('https://cdn.example.com/proj/foo_m_1.webp?v=20260801');
  });

  it('クエリなしでも差し替える', () => {
    expect(posterImageUrlFromVideoUrl('https://x.com/a.webm')).toBe('https://x.com/a.webp');
  });

  it('ハッシュを維持する', () => {
    expect(posterImageUrlFromVideoUrl('https://x.com/v.webm?t=1#frag')).toBe(
      'https://x.com/v.webp?t=1#frag'
    );
  });

  it('拡張子の大文字 webm に対応する', () => {
    expect(posterImageUrlFromVideoUrl('https://x.com/a.WEBM?v=1')).toBe('https://x.com/a.webp?v=1');
  });
});

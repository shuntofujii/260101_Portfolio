import { describe, expect, it } from 'vitest';
import { collectProjectVideoUrls, collectVideoUrlsForProject } from '../projectVideoUrls.js';

describe('projectVideoUrls', () => {
  it('collectVideoUrlsForProject は hero/gallery/cases/explicitModal を統合抽出する', () => {
    const project = {
      projectSlug: 'demo',
      heroMedia: { type: 'video', src: '/hero.webm' },
      gallery: [{ type: 'video', src: '/gallery.webm' }],
      cases: [{ initiatives: [{ assetPrefix: 'alpha', videos: 2 }] }],
      explicitModal: {
        segments: [
          { type: 'video', file: 'raw.webm' },
          { type: 'mediaRow', items: [{ type: 'video', file: 'row.webm' }] }
        ]
      }
    };
    const { urls, heroVideo } = collectVideoUrlsForProject(project);
    expect(heroVideo).toBe('/hero.webm');
    expect(urls).toContain('/hero.webm');
    expect(urls).toContain('/gallery.webm');
    expect(urls.some((url) => url.endsWith('/demo/alpha_m_1.webm'))).toBe(true);
    expect(urls.some((url) => url.endsWith('/demo/alpha_m_2.webm'))).toBe(true);
    expect(urls.some((url) => url.endsWith('/demo/raw.webm'))).toBe(true);
    expect(urls.some((url) => url.endsWith('/demo/row.webm'))).toBe(true);
  });

  it('collectProjectVideoUrls は不正入力時に空配列を返す', () => {
    expect(collectProjectVideoUrls(null)).toEqual({ all: [], hero: [] });
    expect(collectProjectVideoUrls(undefined)).toEqual({ all: [], hero: [] });
  });
});

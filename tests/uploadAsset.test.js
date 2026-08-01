import { describe, expect, it } from 'vitest';
import {
  buildCaseFilename,
  buildPublicUrl,
  buildR2Key,
  findInitiative,
  findProject,
  getInitiativeImageCount,
  getInitiativeVideoCount,
} from '../scripts/lib/asset-paths.mjs';
import {
  applyProjectsJsonUpdate,
  resolveNextNumber,
} from '../scripts/lib/update-projects-json.mjs';

describe('buildCaseFilename', () => {
  it('画像・動画の命名規則に従う', () => {
    expect(buildCaseFilename('strategy2024', 'image', 2)).toBe('strategy2024_p_2.webp');
    expect(buildCaseFilename('murder_process', 'video', 1)).toBe('murder_process_m_1.webm');
  });
});

describe('buildR2Key / buildPublicUrl', () => {
  it('folder と filename を連結する', () => {
    expect(buildR2Key('izumo', 'strategy2024_p_1.webp')).toBe('izumo/strategy2024_p_1.webp');
    expect(buildPublicUrl('https://assets.example.com', 'izumo', 'a.webp')).toBe(
      'https://assets.example.com/izumo/a.webp'
    );
  });
});

describe('initiative counts', () => {
  it('hasVideo / imageGroups を考慮する', () => {
    expect(getInitiativeVideoCount({ hasVideo: true })).toBe(1);
    expect(getInitiativeVideoCount({ videos: 2 })).toBe(2);
    expect(getInitiativeImageCount({ images: 3 })).toBe(3);
    expect(getInitiativeImageCount({ imageGroups: [5, 5] })).toBe(10);
  });
});

describe('applyProjectsJsonUpdate', () => {
  const sample = [
    {
      projectSlug: 'demo',
      cases: [
        {
          title: 'Case A',
          initiatives: [
            { title: 'Main', assetPrefix: 'alpha', hasVideo: true, images: 2 },
          ],
        },
      ],
    },
  ];

  it('画像枚数を増やす', () => {
    const { projects } = applyProjectsJsonUpdate(
      {
        projectSlug: 'demo',
        assetPrefix: 'alpha',
        mediaType: 'image',
        number: 3,
      },
      structuredClone(sample)
    );
    const initiative = findInitiative(findProject(projects, 'demo'), 'alpha');
    expect(initiative.images).toBe(3);
  });

  it('hasVideo を videos に移行する', () => {
    const { projects } = applyProjectsJsonUpdate(
      {
        projectSlug: 'demo',
        assetPrefix: 'alpha',
        mediaType: 'video',
        number: 2,
      },
      structuredClone(sample)
    );
    const initiative = findInitiative(findProject(projects, 'demo'), 'alpha');
    expect(initiative.hasVideo).toBeUndefined();
    expect(initiative.videos).toBe(2);
  });

  it('imageGroups の末尾を増やす', () => {
    const data = structuredClone(sample);
    const initiative = findInitiative(findProject(data, 'demo'), 'alpha');
    delete initiative.images;
    initiative.imageGroups = [2, 3];

    const { projects } = applyProjectsJsonUpdate(
      {
        projectSlug: 'demo',
        assetPrefix: 'alpha',
        mediaType: 'image',
        number: 6,
      },
      data
    );
    const updated = findInitiative(findProject(projects, 'demo'), 'alpha');
    expect(updated.imageGroups).toEqual([2, 4]);
  });
});

describe('resolveNextNumber', () => {
  it('現在値 + 1 を返す', () => {
    expect(resolveNextNumber({ images: 2 }, 'image')).toBe(3);
    expect(resolveNextNumber({ videos: 1 }, 'video')).toBe(2);
  });
});

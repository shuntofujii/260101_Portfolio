import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  normalizePathname,
  getPathnameProjectSlug,
  findLegacyProjectFromHash,
  applyModalHistoryForProject,
  restoreBaseHistoryOnModalClose,
  applyModalDocumentMeta,
  restoreBaseDocumentMeta
} from '../appRouting.js';

const projects = [
  { id: 'project-01', pageSlug: 'ejic', projectSlug: 'ejic-old' },
  { id: 'project-02', pageSlug: 'sepila', projectSlug: 'sepila-old' }
];

afterEach(() => {
  document.body.removeAttribute('data-portfolio-page-slug');
  document.title = 'Base Title';
  vi.restoreAllMocks();
});

describe('appRouting.js', () => {
  it('normalizePathname は末尾スラッシュを除去する', () => {
    expect(normalizePathname('/ejic/')).toBe('/ejic');
    expect(normalizePathname('/')).toBe('/');
  });

  it('getPathnameProjectSlug は body data 属性を優先する', () => {
    document.body.dataset.portfolioPageSlug = 'from-body';
    history.replaceState(null, '', '/ejic/');
    expect(getPathnameProjectSlug()).toBe('from-body');
  });

  it('getPathnameProjectSlug は URL から slug を取得する', () => {
    history.replaceState(null, '', '/sepila/');
    expect(getPathnameProjectSlug()).toBe('sepila');
  });

  it('findLegacyProjectFromHash は pageSlug / projectSlug / id を解決する', () => {
    window.location.hash = '#ejic';
    expect(findLegacyProjectFromHash(projects)?.id).toBe('project-01');

    window.location.hash = '#sepila-old';
    expect(findLegacyProjectFromHash(projects)?.id).toBe('project-02');

    window.location.hash = '#project-01';
    expect(findLegacyProjectFromHash(projects)?.id).toBe('project-01');
  });

  it('applyModalHistoryForProject は path が異なる時のみ pushState する', () => {
    history.replaceState(null, '', '/');
    const pushSpy = vi.spyOn(history, 'pushState');

    applyModalHistoryForProject({ pageSlug: 'ejic' });
    expect(pushSpy).toHaveBeenCalledTimes(1);

    history.replaceState(null, '', '/ejic/');
    applyModalHistoryForProject({ pageSlug: 'ejic' });
    expect(pushSpy).toHaveBeenCalledTimes(1);
  });

  it('restoreBaseHistoryOnModalClose は slug path なら / へ戻す', () => {
    history.replaceState(null, '', '/ejic/');
    const replaceSpy = vi.spyOn(history, 'replaceState');

    restoreBaseHistoryOnModalClose('Base Title');
    expect(replaceSpy).toHaveBeenCalledWith(null, 'Base Title', '/');
  });

  it('applyModalDocumentMeta / restoreBaseDocumentMeta は title と description を更新する', () => {
    const meta = document.createElement('meta');
    meta.name = 'description';
    meta.setAttribute('content', 'base desc');

    applyModalDocumentMeta(
      {
        title: 'EJIC',
        description: 'first line\nsecond line'
      },
      meta
    );
    expect(document.title).toBe('EJIC | SHUNTO FUJII');
    expect(meta.getAttribute('content')).toContain('first line second line');

    restoreBaseDocumentMeta('Base Title', 'base desc', meta);
    expect(document.title).toBe('Base Title');
    expect(meta.getAttribute('content')).toBe('base desc');
  });
});

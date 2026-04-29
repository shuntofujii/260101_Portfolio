import { describe, expect, it } from 'vitest';
import {
  parseProfileModalFromPath,
  parseProjectSlugFromPath,
  pathForProfileModal,
  pathForProjectSlug
} from '../routing.js';

describe('routing.js', () => {
  describe('parseProjectSlugFromPath', () => {
    it('単一セグメントの pageSlug を取得する', () => {
      expect(parseProjectSlugFromPath('/ejic/')).toBe('ejic');
      expect(parseProjectSlugFromPath('/my%20project/')).toBe('my project');
    });

    it('ルート・複数セグメント・予約語・静的ファイルを除外する', () => {
      expect(parseProjectSlugFromPath('/')).toBeNull();
      expect(parseProjectSlugFromPath('/a/b')).toBeNull();
      expect(parseProjectSlugFromPath('/projects/')).toBeNull();
      expect(parseProjectSlugFromPath('/profile/')).toBeNull();
      expect(parseProjectSlugFromPath('/styles.css')).toBeNull();
      expect(parseProjectSlugFromPath('/site.webmanifest')).toBeNull();
    });
  });

  describe('pathForProjectSlug', () => {
    it('slug をURLエンコードして末尾スラッシュ付きで返す', () => {
      expect(pathForProjectSlug('ejic')).toBe('/ejic/');
      expect(pathForProjectSlug('my project')).toBe('/my%20project/');
    });
  });

  describe('profile modal path helpers', () => {
    it('pathForProfileModal は /profile/ を返す', () => {
      expect(pathForProfileModal()).toBe('/profile/');
    });

    it('parseProfileModalFromPath は /profile/ のみ true を返す', () => {
      expect(parseProfileModalFromPath('/profile/')).toBe(true);
      expect(parseProfileModalFromPath('/profile')).toBe(true);
      expect(parseProfileModalFromPath('/')).toBe(false);
      expect(parseProfileModalFromPath('/ejic/')).toBe(false);
      expect(parseProfileModalFromPath('/profile/x')).toBe(false);
    });
  });
});

import { describe, expect, it } from 'vitest';
import { applyLiteModeGuidance, initGuidanceTypewriter } from '../guidanceTypewriter.js';

describe('applyLiteModeGuidance', () => {
  it('タイプライターを止め、2行の静止表示にする', () => {
    const el = document.createElement('div');
    el.className = 'guidance-text';
    el.innerHTML =
      '<span class="guidance-main">Please select a project</span><span class="guidance-cursor">_</span>';

    initGuidanceTypewriter(el);
    applyLiteModeGuidance(el);

    expect(el.classList.contains('is-lite-guidance')).toBe(true);
    expect(el.classList.contains('visible')).toBe(true);
    expect(el.querySelector('.guidance-main')?.textContent).toBe('Please select a project');
    expect(el.querySelector('.guidance-lite-line')?.textContent).toBe('Operating in Lite Mode');
    expect(el.querySelector('.guidance-cursor')).toBeNull();
  });
});

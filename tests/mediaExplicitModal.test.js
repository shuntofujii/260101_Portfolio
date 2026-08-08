import { beforeEach, describe, expect, it } from 'vitest';
import { appendExplicitModal, appendExplicitModalLead } from '../media.js';

describe('appendExplicitModalLead', () => {
  let parent;

  beforeEach(() => {
    parent = document.createElement('div');
  });

  it('空文字や空白のみでは DOM を増やさない', () => {
    appendExplicitModalLead(parent, '');
    appendExplicitModalLead(parent, '   ');
    appendExplicitModalLead(parent, null);
    appendExplicitModalLead(parent, undefined);
    expect(parent.childElementCount).toBe(0);
  });

  it('テキストを p.explicit-modal-lead として追加する', () => {
    appendExplicitModalLead(parent, '  説明文  ');
    const lead = parent.querySelector('p.explicit-modal-lead');
    expect(lead).toBeTruthy();
    expect(lead.textContent).toBe('説明文');
  });
});

describe('appendExplicitModal', () => {
  let parent;

  beforeEach(() => {
    parent = document.createElement('div');
  });

  it('sectionTitle.description と subtitle.description を lead にする', () => {
    appendExplicitModal(
      {
        title: 'Others',
        projectSlug: 'others',
        explicitModal: {
          segments: [
            {
              type: 'sectionTitle',
              text: 'My Portfolio',
              description: '本サイトを制作しました。'
            },
            {
              type: 'subtitle',
              text: 'IVS 2026',
              description: 'IVS2026 MVのシナリオを担当しました。'
            }
          ]
        }
      },
      parent
    );

    const leads = parent.querySelectorAll('p.explicit-modal-lead');
    expect(leads).toHaveLength(2);
    expect(leads[0].textContent).toBe('本サイトを制作しました。');
    expect(leads[1].textContent).toBe('IVS2026 MVのシナリオを担当しました。');
    expect(parent.querySelector('h3.explicit-modal-section-title')?.nextElementSibling).toBe(leads[0]);
    expect(parent.querySelector('h4.explicit-modal-subtitle')?.nextElementSibling).toBe(leads[1]);
  });

  it('単独 type:text も同クラスの lead になる', () => {
    appendExplicitModal(
      {
        projectSlug: 'others',
        explicitModal: {
          segments: [{ type: 'text', text: '独立した段落です。' }]
        }
      },
      parent
    );

    const lead = parent.querySelector('p.explicit-modal-lead');
    expect(lead).toBeTruthy();
    expect(lead.textContent).toBe('独立した段落です。');
  });

  it('空の description は DOM を増やさない', () => {
    appendExplicitModal(
      {
        projectSlug: 'others',
        explicitModal: {
          segments: [
            { type: 'sectionTitle', text: 'Empty Lead', description: '' },
            { type: 'subtitle', text: 'Also Empty', description: '   ' }
          ]
        }
      },
      parent
    );

    expect(parent.querySelectorAll('p.explicit-modal-lead')).toHaveLength(0);
    expect(parent.querySelectorAll('h3, h4')).toHaveLength(2);
  });
});

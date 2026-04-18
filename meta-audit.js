/**
 * projects.json の meta 情報が「hover左上」と「モーダルmeta」で乖離しないように監査するスクリプト
 *
 * 使い方:
 *   node meta-audit.js
 *
 * 監査方針（現状ルールに合わせる）:
 * - Focus は role + scope を統合した単一ソース（重複除外）であること
 * - モーダルmeta（modalMetaItems）には、最低限 Domain / Year / Focus が含まれること
 * - tools があるプロジェクトは Toolkits が含まれること
 * - 旧来の分離ラベル（Direction 等）が残っていないこと（Focusへ統合済みの想定）
 */

const fs = require('fs');
const path = require('path');

function readProjectsJson() {
  const p = path.join(process.cwd(), 'projects.json');
  const raw = fs.readFileSync(p, 'utf8');
  return JSON.parse(raw);
}

function buildUnifiedFocus(role, scope) {
  const r = String(role || '').trim();
  const s = String(scope || '').trim();
  if (!r && !s) return '';
  if (!r) return s;
  if (!s) return r;
  const parts = s.split(' / ').map(x => x.trim()).filter(Boolean);
  if (parts.includes(r)) return parts.join(' / ');
  return [r, ...parts].join(' / ');
}

function resolveTokens(project) {
  const category = project.category || '';
  const year = project.year || '';
  const toolkits = Array.isArray(project.tools) && project.tools.length > 0 ? project.tools.join(' / ') : '';
  const focus = buildUnifiedFocus(project.role, project.scope);

  return {
    $domain: category,
    $year: year,
    $focus: focus,
    $toolkits: toolkits,
  };
}

function resolveMetaItems(project) {
  const tokens = resolveTokens(project);
  const raw = Array.isArray(project.modalMetaItems) ? project.modalMetaItems : null;
  const items = raw || [];

  const resolved = [];
  for (const it of items) {
    if (!it || !it.label) continue;
    const label = String(it.label).trim();
    let v = it.value ?? '';
    if (typeof v === 'string' && v in tokens) v = tokens[v];
    const value = String(v ?? '').trim();
    const icon = String(it.icon || '').trim();
    resolved.push({ label, value, icon });
  }
  return resolved;
}

function summarizeProject(project) {
  const id = project.id || '(no id)';
  const title = project.title || '(no title)';
  return `${title} (${id})`;
}

function audit() {
  const projects = readProjectsJson();
  if (!Array.isArray(projects)) {
    console.error('projects.json は配列である必要があります。');
    process.exit(2);
  }

  const errors = [];
  const warnings = [];

  // 「肩書き」要素は廃止（全プロジェクト共通）
  const forbiddenLabels = new Set([
    'Direction',
    'Direction & Created',
    'Marketing Manager',
    'Marketing & Community Manager',
    'Director',
    'Designer',
    'Art Director',
    'Founder',
    'Co-Founder'
  ]);

  for (const p of projects) {
    const label = summarizeProject(p);
    const resolved = resolveMetaItems(p);

    if (!Array.isArray(p.modalMetaItems) || p.modalMetaItems.length === 0) {
      errors.push(`${label}: modalMetaItems が未設定です（モーダルmetaに全て記載ルール）`);
      continue;
    }

    const byLabel = new Map();
    for (const it of resolved) {
      if (!byLabel.has(it.label)) byLabel.set(it.label, []);
      byLabel.get(it.label).push(it);
    }

    // 必須（モーダルmetaは完全版）
    for (const required of ['Domain', 'Year', 'Focus']) {
      if (!byLabel.has(required)) {
        errors.push(`${label}: modalMetaItems に ${required} がありません`);
      } else {
        const val = (byLabel.get(required)[0]?.value || '').trim();
        if (!val) errors.push(`${label}: ${required} が空です（トークン未解決/値なし）`);
      }
    }

    // tools があるなら Toolkits 必須
    const hasTools = Array.isArray(p.tools) && p.tools.length > 0;
    if (hasTools && !byLabel.has('Toolkits')) {
      errors.push(`${label}: tools はあるが modalMetaItems に Toolkits がありません`);
    }
    if (!hasTools && byLabel.has('Toolkits')) {
      const v = (byLabel.get('Toolkits')[0]?.value || '').trim();
      if (v) warnings.push(`${label}: tools が空だが Toolkits が表示されます（必要なら削除）`);
    }

    // Focus 統合ルール（role/scope の重複排除）
    const expectedFocus = buildUnifiedFocus(p.role, p.scope);
    const focusItem = byLabel.get('Focus')?.[0];
    if (focusItem && focusItem.value !== expectedFocus) {
      errors.push(`${label}: Focus が統合ルールと不一致 (expected='${expectedFocus}', actual='${focusItem.value}')`);
    }

    // 禁止/廃止ラベルの残存チェック
    for (const it of resolved) {
      if (forbiddenLabels.has(it.label)) {
        errors.push(`${label}: '${it.label}' は廃止済みラベルです（構成要素から削除してください）`);
      }
    }
  }

  if (warnings.length) {
    console.log('--- WARNINGS ---');
    for (const w of warnings) console.log(`- ${w}`);
    console.log('');
  }

  if (errors.length) {
    console.log('--- ERRORS ---');
    for (const e of errors) console.log(`- ${e}`);
    process.exit(1);
  }

  console.log('meta-audit: OK（乖離の原因になりやすい欠落/不整合は見つかりませんでした）');
}

audit();


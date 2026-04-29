/**
 * projects.json の meta 情報が「hover左上」と「モーダルmeta」で乖離しないように監査するスクリプト
 *
 * 使い方:
 *   node meta-audit.js
 *
 * 監査方針:
 * - projects.json の `disciplines` とモーダル内 Disciplines（$disciplines）が一致すること
 * - モーダルmeta（modalMetaItems）には、最低限 Domain / Year / Disciplines が含まれること
 * - tools があるプロジェクトは Toolkits が含まれること
 * - 廃止ラベル（Direction 等）が残っていないこと
 */

import fs from 'fs';
import path from 'path';

function readProjectsJson() {
  const p = path.join(process.cwd(), 'projects.json');
  const raw = fs.readFileSync(p, 'utf8');
  return JSON.parse(raw);
}

function resolveTokens(project) {
  const category = project.category || '';
  const year = project.year || '';
  const toolkits = Array.isArray(project.tools) && project.tools.length > 0 ? project.tools.join(' / ') : '';
  const disciplines = String(project.disciplines ?? '').trim();

  return {
    $domain: category,
    $year: year,
    $disciplines: disciplines,
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

/** explicitModal 内でセクション単位の meta（sectionMeta）がある場合はモーダル末尾の modalMetaItems を省略できる */
function hasExplicitSectionMeta(project) {
  const segments = project.explicitModal?.segments;
  if (!Array.isArray(segments)) return false;
  return segments.some((s) => {
    if (!s || s.type !== 'sectionMeta' || !Array.isArray(s.items)) return false;
    return s.items.some((it) => it && String(it.label ?? '').trim() && String(it.value ?? '').trim());
  });
}

function audit() {
  const projects = readProjectsJson();
  if (!Array.isArray(projects)) {
    console.error('projects.json は配列である必要があります。');
    process.exit(2);
  }

  const errors = [];
  const warnings = [];

  const slugToId = new Map();
  for (const p of projects) {
    const label = summarizeProject(p);
    if (!p.pageSlug || !String(p.pageSlug).trim()) {
      errors.push(`${label}: pageSlug が未設定です（/{slug}/ の静的URL用）`);
    } else {
      const slug = String(p.pageSlug).trim();
      if (slugToId.has(slug)) {
        errors.push(`${label}: pageSlug '${slug}' が重複しています（${slugToId.get(slug)} と）`);
      } else {
        slugToId.set(slug, p.id);
      }
    }
  }

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
    'Co-Founder',
    'Focus'
  ]);

  for (const p of projects) {
    const label = summarizeProject(p);

    if ('role' in p || 'scope' in p) {
      errors.push(`${label}: role / scope は廃止されました。disciplines に統合してください`);
    }
    if ('focus' in p) {
      errors.push(`${label}: focus フィールドは廃止されました。disciplines を使用してください`);
    }
    if (!String(p.disciplines ?? '').trim()) {
      errors.push(`${label}: disciplines が未設定または空です`);
    }

    const resolved = resolveMetaItems(p);

    if ((!Array.isArray(p.modalMetaItems) || p.modalMetaItems.length === 0) && !hasExplicitSectionMeta(p)) {
      errors.push(`${label}: modalMetaItems が未設定です（モーダルmetaに全て記載ルール）`);
      continue;
    }

    if (hasExplicitSectionMeta(p) && (!Array.isArray(p.modalMetaItems) || p.modalMetaItems.length === 0)) {
      continue;
    }

    const byLabel = new Map();
    for (const it of resolved) {
      if (!byLabel.has(it.label)) byLabel.set(it.label, []);
      byLabel.get(it.label).push(it);
    }

    // 必須（モーダルmetaは完全版）
    for (const required of ['Domain', 'Year', 'Disciplines']) {
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

    const expectedDisciplines = String(p.disciplines ?? '').trim();
    const disciplinesItem = byLabel.get('Disciplines')?.[0];
    if (disciplinesItem && disciplinesItem.value !== expectedDisciplines) {
      errors.push(`${label}: Disciplines が projects.json の disciplines と不一致 (expected='${expectedDisciplines}', actual='${disciplinesItem.value}')`);
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


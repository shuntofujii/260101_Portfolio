/**
 * projects.json から /{pageSlug}/index.html を生成する（静的サイト用・フラットURL）
 * 実行: node scripts/build-project-pages.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ASSETS_CACHE_V, baseAssetsUrl } from '../constants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function clipMeta(s, max = 155) {
  const raw = String(s || '')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (raw.length <= max) return raw;
  return `${raw.slice(0, max - 3)}...`;
}

function buildJsonLd(project, canonical, thumb) {
  const graph = [
    {
      '@type': 'CreativeWork',
      '@id': `${canonical}#work`,
      name: project.title,
      headline: project.tagline || undefined,
      description: clipMeta(project.description || project.tagline || '', 300),
      url: canonical,
      image: thumb,
      creator: { '@id': 'https://shuntofujii.com/#person' },
      inLanguage: 'ja-JP'
    },
    {
      '@type': 'WebPage',
      '@id': `${canonical}#webpage`,
      url: canonical,
      name: `${project.title} | SHUNTO FUJII`,
      description: clipMeta(project.description || project.tagline || ''),
      isPartOf: { '@id': 'https://shuntofujii.com/#website' },
      primaryImageOfPage: { '@type': 'ImageObject', url: thumb },
      mainEntity: { '@id': `${canonical}#work` },
      inLanguage: 'ja-JP'
    }
  ];
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 2);
}

function pageHtml(project) {
  const slug = project.pageSlug;
  const canonical = `https://shuntofujii.com/${encodeURIComponent(slug)}/`;
  const title = `${project.title} | SHUNTO FUJII`;
  const desc = clipMeta(project.description || project.tagline || '');
  const thumb =
    project.thumbnail || `${baseAssetsUrl}/top/ogp.webp${ASSETS_CACHE_V}`;
  const ogTitle = escapeHtml(title);
  const ogDesc = escapeHtml(desc);
  const jsonLd = buildJsonLd(project, canonical, thumb);

  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <script type="importmap">
      {
        "imports": {
          "matter-js": "/vendor/matter.js"
        }
      }
    </script>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />

    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(desc)}" />
    <meta name="author" content="SHUNTO FUJII（藤井 洵斗）" />
    <meta name="referrer" content="strict-origin-when-cross-origin" />

    <link rel="canonical" href="${canonical}" />
    <link rel="alternate" hreflang="ja" href="${canonical}" />
    <link rel="alternate" hreflang="x-default" href="${canonical}" />

    <meta name="theme-color" content="#0a0a0a" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />

    <meta property="og:type" content="article" />
    <meta property="og:title" content="${ogTitle}" />
    <meta property="og:description" content="${ogDesc}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:site_name" content="SHUNTO FUJII Portfolio" />
    <meta property="og:locale" content="ja_JP" />
    <meta property="og:image" content="${escapeHtml(thumb)}" />
    <meta property="og:image:type" content="image/webp" />
    <meta property="og:image:alt" content="${escapeHtml(project.title)}" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@shuntofujii" />
    <meta name="twitter:title" content="${ogTitle}" />
    <meta name="twitter:description" content="${ogDesc}" />
    <meta name="twitter:image" content="${escapeHtml(thumb)}" />
    <meta name="twitter:image:alt" content="${escapeHtml(project.title)}" />

    <link rel="icon" href="${baseAssetsUrl}/top/shuntofujii.webp${ASSETS_CACHE_V}" />
    <link rel="apple-touch-icon" href="${baseAssetsUrl}/top/favicon.ico${ASSETS_CACHE_V}" />

    <link rel="manifest" href="/site.webmanifest" />

    <link rel="preload" href="/projects.json" as="fetch" crossorigin="anonymous" />

    <link rel="dns-prefetch" href="https://assets.shuntofujii.com" />
    <link rel="preconnect" href="https://assets.shuntofujii.com" crossorigin />

    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

    <link rel="stylesheet" href="/styles.css" />
    <link
      rel="preload"
      href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&amp;display=swap"
      as="style"
      onload="this.onload=null;this.rel='stylesheet'"
    />
    <noscript>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&amp;display=swap"
      />
    </noscript>

    <script type="application/ld+json">
${jsonLd}
    </script>
  </head>
  <body data-portfolio-page-slug="${escapeHtml(slug)}">
    <a href="#main-content" class="skip-link">メインコンテンツへスキップ</a>
    <header class="portfolio-title" id="portfolioTitle">
      <h1 class="portfolio-title-text">SHUNTO FUJII</h1>
      <button
        type="button"
        class="profile-open-btn"
        id="profileOpenBtn"
        aria-label="プロフィールを開く"
      >
        <span class="profile-open-stack" aria-hidden="true">
          <img
            class="profile-open-img profile-open-img--back"
            src="${baseAssetsUrl}/top/shuntofujii_1.webp${ASSETS_CACHE_V}"
            alt=""
            width="609"
            height="720"
            decoding="async"
          />
          <img
            class="profile-open-img profile-open-img--front"
            src="${baseAssetsUrl}/top/shuntofujii_2.webp${ASSETS_CACHE_V}"
            alt=""
            width="609"
            height="720"
            decoding="async"
          />
        </span>
      </button>
    </header>

    <main id="main-content">
      <section
        class="context-panel hover-card"
        id="contextPanel"
        aria-label="プロジェクト概要"
      >
        <div class="context-content"></div>
      </section>

      <div class="focus-visual" id="focusVisual" aria-hidden="true">
        <div id="bgLayer" class="visual-container bg">
          <video
            id="bgVideo"
            class="bg__video bg__video--base hero-media"
            loop
            playsinline
            muted
            style="display: none"
            preload="none"
            aria-hidden="true"
          ></video>
        </div>
      </div>

      <div class="title-background" id="titleBackground">
        <div class="title-text" id="titleText">PORTFOLIO</div>
      </div>

      <div class="guidance-text" id="guidanceText"><span class="guidance-main">Please select a project</span><span class="guidance-cursor">_</span></div>

      <div class="noise-overlay" aria-hidden="true"></div>

      <nav
        class="project-navigation"
        id="projectNavigation"
        aria-label="プロジェクト一覧"
      ></nav>

      <section class="seo-project-list" aria-label="ポートフォリオ実績一覧">
        <h2 class="visually-hidden">ポートフォリオ実績</h2>
        <ol>
          <li><a href="/dates/"><strong>DATEs</strong></a> — 少子化対策 × 地域活性化。デートプラン投稿・評価サイト（Service Design / UIUX / Business Dev）</li>
          <li><a href="/ejic/"><strong>EJIC</strong></a> — マイクロソフト社主催 新規事業ピッチイベントのクリエイティブディレクション（Intro Video / Logo / Graphic）</li>
          <li><a href="/izumo/"><strong>IZUMO</strong></a> — AR×Web3のSNS。マーケティング・コミュニティ・クリエイティブ（Marketing Strategy / Product Video）</li>
          <li><a href="/deteqle/"><strong>デテクル</strong></a> — AR × 人から生まれる新体験。MR開発会社MuuMu社のマーケティング戦略・実行</li>
          <li><a href="/rockpaperdead/"><strong>グーチョキデッド</strong></a> — 国産英語長編映画の美術監督・マーケティング（Art Direction / Production Design）</li>
          <li><a href="/sepila/"><strong>SEPILA</strong></a> — 完全個室セルフマシンピラティス。レッスン動画ディレクション（Fitness Video）</li>
          <li><a href="/kujico/"><strong>久次米珈琲焙煎所</strong></a> — 珈琲焙煎所の共同創業（Opening Soon）</li>
          <li><a href="/others/"><strong>Others</strong></a> — グラフィック・映像・写真などその他制作</li>
        </ol>
      </section>

      <noscript>
        <div
          style="padding: 20px; color: #fff; position: absolute; bottom: 20px"
        >
          <p>
            藤井洵斗のポートフォリオサイトをご覧いただくにはJavaScriptを有効にしてください。
          </p>
          <p>
            主な実績: DATEs, EJIC, IZUMO, デテクル, グーチョキデッド, SEPILA, 久次米珈琲焙煎所, Others
          </p>
        </div>
      </noscript>
    </main>

    <div class="modal-overlay" id="modalOverlay" hidden aria-hidden="true">
      <div
        class="modal-container"
        data-state="closed"
        hidden
        role="dialog"
        aria-modal="true"
        aria-labelledby="modalTitleHeading"
      >
        <button class="modal-close" id="modalClose" aria-label="Close details">
          ×
        </button>
        <div class="modal-content" id="modalContent"></div>
      </div>
    </div>

    <div class="modal-overlay profile-modal-overlay" id="profileModalOverlay" hidden aria-hidden="true">
      <div
        class="modal-container profile-modal-container"
        id="profileModalContainer"
        data-state="closed"
        hidden
        role="dialog"
        aria-modal="true"
        aria-labelledby="profileModalTitleHeading"
      >
        <button class="modal-close" id="profileModalClose" type="button" aria-label="プロフィールを閉じる">
          ×
        </button>
        <div class="modal-content profile-modal-content" id="profileModalContent"></div>
      </div>
    </div>

    <div
      class="lightbox-overlay"
      id="lightboxOverlay"
      hidden
      aria-hidden="true"
    >
      <button
        class="lightbox-close"
        id="lightboxClose"
        aria-label="Close image view"
      >
        ×
      </button>
      <img class="lightbox-image" id="lightboxImage" alt="" />
      <video
        class="lightbox-video"
        id="lightboxVideo"
        controls
        playsinline
      ></video>
    </div>

    <script src="/vendor/matter.js"></script>
    <script type="module" src="/app.js"></script>
    <!--
      本HTMLは https://shuntofujii.com/ のポートフォリオテンプレートに基づいています。
      二次利用・改変時もこの出典表記は残してください（ライセンス・出典の明示のため）。
    -->
  </body>
</html>
`;
}

const projectsPath = path.join(root, 'projects.json');
const raw = fs.readFileSync(projectsPath, 'utf8');
const projects = JSON.parse(raw);

if (!Array.isArray(projects)) {
  console.error('projects.json が配列ではありません');
  process.exit(1);
}

let written = 0;
for (const project of projects) {
  const slug = project.pageSlug;
  if (!slug) {
    console.warn('skip (pageSlug なし):', project.id);
    continue;
  }
  const dir = path.join(root, slug);
  fs.mkdirSync(dir, { recursive: true });
  const html = pageHtml(project);
  fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
  written += 1;
  console.log('wrote', `/${slug}/index.html`);
}

console.log(`done: ${written} project pages`);

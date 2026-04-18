# ゲーム UI 風ポートフォリオ

ゲームのキャラクター選択 UI のように、8 つのプロジェクトを選んで体験できるポートフォリオサイトです。プロジェクトにホバーするとヒーロー動画と概要パネルが表示され、クリックでモーダルが開きます。モーダル内では案件（cases）ごとに画像・動画グリッドを表示でき、画像・動画のクリックでライトボックス表示に対応しています。

## 📁 ファイル構成

```
/260101_Portfolio/
├── index.html          # メインHTML（メタ・OGP・構造化データ・スキップリンク含む）
├── styles.css          # スタイルシート（CSS変数でテーマ・z-index・Safe Area を集約）
├── projects.json       # プロジェクトデータ（8件。cases 構造で施策別メディアも管理可）
├── app.js              # エントリポイント（初期化・ナビ描画・ホバー/クリック処理）
├── state.js            # 状態管理（currentState, 選択中プロジェクト等）
├── domRefs.js          # DOM 参照の保持（setRefs / getRefs）
├── constants.js        # 定数（ブレークポイント・時間・カーソル設定・ベースURL）
├── utils.js            # ユーティリティ（escapeHtml, フォーカストラップ）
├── modal.js            # モーダルの開閉・コンテンツ組み立て
├── lightbox.js         # ライトボックス（画像・動画の拡大表示）
├── media.js            # メディア表示（画像/動画グリッド、cases 用カード、動画プレイヤー）
├── videoCache.js       # 動画の fetch→Blob URL キャッシュ・`<link rel="preload">`・アイドル時プリロード
├── projectVideoUrls.js # projects.json からヒーロー・cases・gallery の動画 URL を列挙（上記と連携）
├── cursorEffect.js     # カーソル軌跡エフェクト・アクセント色の時間変化（Three.js を CDN から動的 import）
├── meta-audit.js       # meta監査（hover左上/モーダルmeta の乖離防止）
├── sitemap.xml         # サイトマップ（SEO・更新時に lastmod を更新推奨）
├── robots.txt          # クローラー許可と Sitemap 指定
├── CNAME               # GitHub Pages などでドメイン指定する場合に使用
├── SEO_RECOMMENDATIONS.md  # SEO 実施内容と運用で推奨すること
└── README.md           # このファイル
```

- **アセット（画像・動画）**: 本リポジトリには `assets/` フォルダは含まれていません。`projects.json` および `constants.js` の `baseAssetsUrl` で指定した外部 URL（例: `https://assets.shuntofujii.com`）から読み込みます。自前で配信する場合は `baseAssetsUrl` と各プロジェクトの `heroMedia.src` / `thumbnail` / cases のアセット命名規則を揃えてください。

### モジュールの役割（データの流れ）

1. **`app.js`** … `projects.json` を取得後、`collectProjectVideoUrls` で動画 URL 一覧を作り、`injectVideoLinkPreloads`（先読みヒント）と `ensureVideoPlayUrl` / `scheduleIdleVideoPreload`（Blob キャッシュ）を起動。その後 UI 描画と `initCursorEffect`。
2. **`videoCache.js`** … 同一 URL の動画は `fetch` で一度だけ取得し、可能なら Blob URL を `video.src` に割り当て（CORS 失敗時は元 URL のまま）。モーダル内 `<video>` は `attachVideoElement` でキャッシュ済みになるまで `src` を遅延。`pagehide` で Blob URL を `revoke`。
3. **`projectVideoUrls.js`** … `heroMedia`、トップレベル `initiatives`、`cases` 内の `videos` / `hasVideo`、および `gallery` 内の動画 URL を集約（`media.js` の `buildVideoUrl` と命名規則を共有）。
4. **`media.js`** … モーダル用の画像グリッド・動画グリッド・インラインプレイヤー。`modal.js` から `createCaseSection` 等が呼ばれる。
5. **`lightbox.js`** … 拡大表示の動画も `ensureVideoPlayUrl` 経由でキャッシュを再利用。

## 🚀 ローカル起動方法

### 方法 1: Python（推奨）

```bash
# Python 3の場合
python3 -m http.server 8000

# ブラウザで以下にアクセス
# http://localhost:8000
```

### 方法 2: Node.js（http-server）

```bash
# http-serverをインストール（初回のみ）
npm install -g http-server

# 起動
http-server -p 8000

# ブラウザで以下にアクセス
# http://localhost:8000
```

### 方法 3: VS Code Live Server

1. VS Code でこのフォルダを開く
2. `index.html` を右クリック
3. 「Open with Live Server」を選択

### 方法 4: その他のローカルサーバー

- PHP: `php -S localhost:8000`
- Ruby: `ruby -run -e httpd . -p 8000`

**注意**: `file://` プロトコルでは `projects.json` の読み込みが CORS エラーで失敗するため、必ずローカルサーバーを使用してください。

## 🎨 カスタマイズ

### アクセントカラー・テーマ

- **動的なアクセント色**: デフォルトでは `cursorEffect.js` がアクセント色を時間経過で変化させ、`document.documentElement.style.setProperty('--accent-color', color)` で CSS 変数 `--accent-color` を更新します。カーソル軌跡・ホバー時の枠・モーダル閉じるボタンなどがこの色に連動します。
- **固定色にしたい場合**: `styles.css` の `:root` で `--accent-color` を固定値にし、`app.js` から `initCursorEffect()` の呼び出しを外す、もしくは `cursorEffect.js` 内の色更新処理を無効化してください。

`styles.css` の `:root` では次の変数を変更できます。

```css
:root {
  --accent-color: #00d9ff;        /* アクセント（カーソルと連動時は JS で上書き） */
  --bg-gradient-start: #0a0a0f;
  --bg-gradient-end: #1a1a2e;
  --text-primary: #ffffff;
  --text-secondary: #b0b0b0;
  --text-muted: #666666;
  --panel-bg: rgba(255, 255, 255, 0.05);
  --panel-border: rgba(255, 255, 255, 0.1);
  /* トランジション・画像グリッド間隔・Safe Area・z-index なども :root で定義 */
}
```

### z-index 運用ルール（現行実装）

レイヤー管理は、`styles.css` の `:root` に定義した **CSS 変数を唯一の基準** として扱います。新しい全画面 UI（オーバーレイ、モーダル、固定パネル等）を追加する場合は、原則としてこの変数群に追加してから利用してください。

- **グローバルレイヤー**: `var(--z-*)` を使用（画面全体の前後関係）
- **ローカルレイヤー**: コンポーネント内部のみ `0/1/2/3/10` 等の直値を許容（親コンテキスト内の重なり調整）
- **例外**: キーボードアクセシビリティ優先の `.skip-link` は `z-index: 10000`
- **整合ルール**: JS 側カーソルレイヤー `CURSOR_Z_INDEX`（`constants.js`）は `--z-cursor` と同値を維持

#### グローバル z-index マップ（小 → 大）

| レイヤー変数 | 値 | 主な用途 |
|---|---:|---|
| `--z-focus-visual-back` | 9 | モーダル表示中に奥へ退避した背景ビジュアル |
| `--z-modal-back` | 90 | モーダル背景化した通常 UI（パネル/ナビ） |
| `--z-cursor` | 100 | カーソル軌跡エフェクト（Three.js） |
| `--z-guidance` | 110 | 中央ガイダンステキスト |
| `--z-focus-visual` | 115 | 通常時の背景ビジュアル |
| `--z-noise` | 120 | ノイズオーバーレイ |
| `--z-panels` | 140 | コンテキストパネル / 下部プロジェクトナビ |
| `--z-title-bg` | 200 | 巨大タイトル背景 |
| `--z-portfolio-title` | 250 | 左上のポートフォリオタイトル |
| `--z-modal-overlay` | 1000 | プロジェクト詳細モーダルのオーバーレイ |
| `--z-modal-close` | 1001 | モーダル閉じるボタン |
| `--z-lightbox-overlay` | 2000 | ライトボックスオーバーレイ |
| `--z-lightbox-close` | 2001 | ライトボックス閉じるボタン |

#### ローカル直値を使っている箇所（抜粋）

- サムネイル UI 内の疑似要素: `0/1/2`
- 動画プレイヤー UI 内オーバーレイ: `2/3/10`
- これらは親要素内で完結するため、グローバルレイヤーとは分離して管理

### ベースURL（アセット）

画像・動画のベースURLは `constants.js` の `baseAssetsUrl` で指定しています。自サイト用に変更してください。

```js
export const baseAssetsUrl = 'https://assets.shuntofujii.com';
```

### 「Opening Soon」表示（コンテキストパネル）

特定プロジェクトだけカテゴリ行に `(Opening Soon)` を付けるには、`constants.js` の `OPENING_SOON_PROJECT_ID` を、そのプロジェクトの `projects.json` 上の `id` と一致させてください（デフォルトは `project-08`）。

## ✅ 差し替えチェックリスト

### 1. プロジェクトデータ（`projects.json`）

- [ ] 各プロジェクトの `id` / `title` を実際のプロジェクト名に変更
- [ ] `category` / `role` / `scope` / `year` を実際の内容に変更
- [ ] `tools` 配列を実際に使用したツールに変更
- [ ] `tagline` / `description` を各プロジェクトの説明に変更
- [ ] `heroMedia`（`type`, `src`）をホバー時に表示する動画・画像に変更
- [ ] `thumbnail` をサムネイル画像の URL に変更
- [ ] `links` 配列に外部リンク（Behance / YouTube / Web など）を追加
- [ ] **cases を使う場合**: `projectSlug` と `cases` を追加（後述「アセットルール」参照）。モーダル内に案件・施策ごとの画像・動画グリッドが表示されます。`cases` がないプロジェクトは、モーダルではヘッダー・メタ・説明文・リンクのみ表示されます。

### プロジェクトmeta（hover左上 / モーダルmeta）運用ルール

このプロジェクトでは「hover左上（コンテキストパネル）」と「モーダル最下部meta」で情報が乖離しないよう、次のルールで運用します。

#### 構成要素（肩書き要素は廃止）

プロジェクトごとのmeta構成要素は次の8種です（存在しない要素は省略してOK）。

- `Client`
- `Domain`
- `Prize`
- `Year`
- `Founder`
- `Focus`
- `Toolkits`
- `Team`

#### Focus統合（Role/Scopeと同義）

`Focus` は **Role/Scopeと同義**として扱い、表示用の `Focus` は次のルールで統合します。

- `Focus = role + scope`（区切りは `" / "`）
- ただし `scope` 側に `role` と同一の語が含まれている場合は **重複表示しない**

#### 表示ルール

- **hover左上（コンテキストパネル）**: 現行フォーマットのまま、次の4つのみ表示
  - `Domain`（= `category`）
  - `Year`（= `year`）
  - `Focus`（= 上記統合ルールで生成）
  - `Toolkits`（= `tools` を `" / "` 連結）
- **モーダルmeta（最下部）**: そのプロジェクトに存在する要素は **`projects.json` の `modalMetaItems` にすべて記載**

#### `projects.json` の `modalMetaItems` 仕様

各プロジェクトに `modalMetaItems`（配列）を追加し、表示順もここで管理します。

```json
{
  "modalMetaItems": [
    { "label": "Client", "value": "株式会社○○", "icon": "https://assets.shuntofujii.com/icons/client.svg" },
    { "label": "Domain", "value": "$domain", "icon": "https://assets.shuntofujii.com/icons/domain.svg" },
    { "label": "Year", "value": "$year", "icon": "https://assets.shuntofujii.com/icons/year.svg" },
    { "label": "Focus", "value": "$focus", "icon": "https://assets.shuntofujii.com/icons/focus.svg" },
    { "label": "Toolkits", "value": "$toolkits", "icon": "https://assets.shuntofujii.com/icons/toolkits.svg" },
    { "label": "Team", "value": "Role：Name / ...", "icon": "https://assets.shuntofujii.com/icons/team.svg" }
  ]
}
```

`value` は固定文字列のほか、次のトークンを利用できます。

- `$domain`（= `category`）
- `$year`（= `year`）
- `$focus`（= 統合Focus）
- `$toolkits`（= `tools` を `" / "` 連結）

#### 監査（乖離防止）

`projects.json` の更新後は次を実行し、metaの欠落/不整合を検出してください。

```bash
node meta-audit.js
```

### 2. 画像・動画ファイル（アセット）

- [ ] 各プロジェクトのヒーロー用メディア（`heroMedia.src`）を配置
- [ ] 各プロジェクトのサムネイル（`thumbnail`）を配置
- [ ] cases を使う場合は、アセット命名規則に従ってファイルを配置し、`projects.json` の `assetPrefix` / `videos` / `images` / `imageGroups` と一致させる

### 3. メタ情報・構造化データ（`index.html`）

- [ ] `<title>` と `meta name="description"` / `meta name="keywords"` を変更
- [ ] OGP（`og:title`, `og:description`, `og:image`, `og:url` 等）を変更
- [ ] Twitter 用メタ（`twitter:card`, `twitter:title`, `twitter:image` 等）を変更
- [ ] `application/ld+json` の ProfilePage / WebPage の名前・説明・`sameAs`（SNS 等）を変更
- [ ] `link rel="canonical"` を本番 URL に変更
- [ ] `theme-color` / `favicon` / `apple-touch-icon` を必要に合わせて変更

### 4. デザイン調整（`styles.css`）

- [ ] `:root` の `--accent-color` / `--bg-gradient-*` / `--text-*` 等を好みに合わせて調整
- [ ] フォントは Google Fonts の Inter を利用。差し替える場合は `index.html` の `link` と `styles.css` の `font-family` を変更

### 5. 動作確認

- [ ] ローカルサーバーで起動できるか確認
- [ ] プロジェクトにホバーでヒーロー動画・コンテキストパネルが表示されるか確認
- [ ] プロジェクトをクリックでモーダルが開くか確認
- [ ] モーダル内の画像・動画が正しく表示され、クリックでライトボックスが開くか確認
- [ ] 外部リンクが正しく動作するか確認
- [ ] ESC キーと × ボタンでモーダル・ライトボックスが閉じるか確認
- [ ] スキップリンク（フォーカス時）・キーボード操作が期待どおりか確認
- [ ] スマホ表示で問題がないか確認（Safe Area・横スクロール・レイアウト崩れなど）

---

## 📦 アセットルール（projectSlug / cases 型プロジェクト）

`projectSlug` と `cases` を持つプロジェクトは、案件・施策ごとにメディアを管理し、モーダル内にセクションとして表示されます。

### ファイル命名規則（統一ルール）

```
{prefix}_{mediaType}_{number}.{ext}
```

| 要素 | 説明 |
|------|------|
| `prefix` | 施策の識別子。`assetPrefix` の値（単一のときは案件名なし、細分する場合は `initiativeName_caseName` 形式） |
| `mediaType` | `m` = 動画、`p` = 画像 |
| `number` | 通番（1 から） |
| `ext` | 動画 `.webm`、画像 `.webp` |

**例**

- `strategy2024_m_1.webm`, `strategy2024_p_1.webp`（prefix = strategy2024、案件名なし）
- `murder_process_m_1.webm`, `content_zombie_p_1.webp`（prefix = initiativeName_caseName 形式）

### ベースURL

`constants.js` の `baseAssetsUrl` と組み合わせて次の形式です。

```
{baseAssetsUrl}/{projectSlug}/{filename}
```

例: `https://assets.shuntofujii.com/izumo/strategy2024_p_1.webp`

動画のポスター画像は、動画と同じ basename で拡張子を `.webp` にしたファイルを利用します（コード内で `.webm` → `.webp` に置換）。

### projects.json の記述（cases / initiatives）

各案件（case）は `title` と `initiatives` 配列を持ち、各 initiative は次のプロパティでメディアを宣言します。

| プロパティ | 説明 |
|-----------|------|
| `title` | 施策の表示名 |
| `assetPrefix` | ファイル名の prefix（例: `strategy2024`, `murder_process`） |
| `videos` | 動画の本数（0 または省略 = なし。`hasVideo: true` は 1 本として扱う） |
| `images` | 画像の枚数（1 グリッドで表示） |
| `imageGroups` | 画像を複数行に分ける場合の各グループの枚数（例: `[5, 5]` → 1〜5 枚目と 6〜10 枚目） |

**例 1** 動画 1 本 + 画像 2 枚

```json
{
  "title": "Main",
  "assetPrefix": "strategy2024",
  "hasVideo": true,
  "images": 2
}
```

**例 2** 動画複数本

```json
{
  "title": "Process",
  "assetPrefix": "murder_process",
  "videos": 2
}
```

→ `murder_process_m_1.webm`, `murder_process_m_2.webm`

**例 3** 画像を 2 行に分ける（imageGroups）

```json
{
  "title": "ゾンビに襲われた",
  "assetPrefix": "content_zombie",
  "videos": 2,
  "imageGroups": [5, 5]
}
```

→ 動画 2 本、画像は 1〜5 枚目と 6〜10 枚目でそれぞれ 1 行ずつ表示。

### 画像グリッドの表示（左右の高さを揃える）

2 列以上で複数枚並ぶ画像グリッドでは、**同行の高さを揃える**ルールが適用されます。

- 行の高さは、その行内でいちばん背の高い画像に合わせる。
- 高さが足りない画像は拡大してセルを埋め、はみ出た部分は**左右をトリミング**（中央基準の `object-fit: cover`）して表示する。
- **クリック時**はライトボックスで**画像全体**が表示される。

※ 1 列のみのグリッドや、`data-force-horizontal` の横並びグループには適用されません。

---

## 🐛 トラブルシューティング

### 画像が表示されない

- ファイルパスが正しいか確認（`baseAssetsUrl` + `projectSlug` + ファイル名の組み合わせ）
- ファイル名の大文字小文字が一致しているか確認
- ブラウザのコンソールでエラーを確認

### 動画が再生されない

- ヒーロー用は `.webm` を推奨。モーダル内インライン動画も `.webm` + ポスター `.webp` を想定
- ファイルサイズが大きすぎないか確認
- ブラウザが対応しているコーデックか確認

### JSON が読み込めない

- ローカルサーバーを使用しているか確認（`file://` では動作しません）
- `projects.json` の構文エラーがないか確認（JSON バリデーターで確認）

### モーダルが開かない

- ブラウザのコンソールでエラーを確認
- `projects.json` が正しく読み込まれているか確認

### カーソルエフェクトが動かない

- `cursorEffect.js` は WebGL（Three.js 相当の処理）を使用。非対応環境ではエラーになる可能性があります。その場合は `app.js` の `initCursorEffect()` を呼ばないようにすると、アクセント色は CSS の `--accent-color` のみで表示されます。

---

## 📝 技術仕様

- **フレームワーク**: なし（Vanilla HTML/CSS/JS）
- **モジュール**: ES Modules（`<script type="module" src="app.js" defer>`）
- **外部リソース**: Google Fonts（Inter）、アセットは `baseAssetsUrl` で指定したドメインから読み込み
- **対応ブラウザ**: モダンブラウザ（Chrome, Firefox, Safari, Edge）。ES Modules 対応環境を想定
- **レスポンシブ**: 対応（スマホ・タブレット・PC）。Safe Area（ノッチ・ホームインジケータ）を CSS 変数で考慮
- **アクセシビリティ**: スキップリンク、`aria-label`（ナビ・ダイアログ・ライトボックス）、モーダル/ライトボックス内のフォーカストラップ、ESC で閉じる
- **SEO**: `robots.txt`、`sitemap.xml`、メタタグ（OGP・Twitter）、構造化データ（ProfilePage / WebPage + ItemList）、視覚非表示の実績一覧テキスト。詳細は `SEO_RECOMMENDATIONS.md` を参照
- **動画読み込み**: ヒーロー・モーダル・ライトボックスで同一 URL の二重取得を減らすため、`videoCache.js` による Blob キャッシュと `<link rel="preload" as="video">` を利用（サーバー側は CORS でクロスオリジン読み取り可能にすると Blob 化しやすくなります）

---

## 📄 ライセンス

このポートフォリオテンプレートは自由にカスタマイズしてご利用ください。

**出典の保持**  
本リポジトリのコード（HTML / JS / CSS）には、テンプレート元の出典表記（https://shuntofujii.com/）がコメントとして含まれています。二次利用・改変の際も、ライセンスおよび出典の明示のため、これらの表記は残してください。

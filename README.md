# ゲーム UI 風ポートフォリオ

ゲームのキャラクター選択 UI のように、8 つのプロジェクトを選んで体験できるポートフォリオサイトです。プロジェクトにホバーするとヒーロー動画と概要パネルが表示され、クリックでモーダルが開きます。モーダル内では案件（cases）ごとに画像・動画グリッドを表示でき、画像・動画のクリックでライトボックス表示に対応しています。

## 🧭 読み方ガイド

### 初めて触る人向け（最短ルート）

1. `🚀 ローカル起動方法` で起動
2. `✅ 差し替えチェックリスト` の「1. プロジェクトデータ」を実施
3. `🔁 デプロイ・データ更新時の推奨手順` を順に実施
4. 問題があれば `🐛 トラブルシューティング` を確認

### 運用・実装担当者向け

- 実装構成を把握: `📁 ファイル構成` と `モジュールの役割（データの流れ）`
- 動画の先読み・ホバー再生の調整: `動画プリロード・ヒーロー再生（実装メモ）`
- データ仕様を確認: `📦 アセットルール`
- UIルールを確認: `🎨 カスタマイズ`
- SEO運用を確認: `🔁 デプロイ・データ更新時の推奨手順`

## 📁 ファイル構成（実装者向け）

```
/260101_Portfolio/
├── index.html          # メインHTML（メタ・OGP・構造化データ・スキップリンク含む）
├── styles.css          # スタイルシート（CSS変数でテーマ・z-index・Safe Area を集約）
├── projects.json       # プロジェクトデータ（8件。cases 構造で施策別メディアも管理可）
├── {pageSlug}/         # 各案件の静的HTML（例: ejic/index.html → shuntofujii.com/ejic/）
├── scripts/
│   └── build-project-pages.mjs  # projects.json から {pageSlug}/index.html を再生成
├── routing.js          # /{pageSlug}/ のパス解釈（純粋なルーティング関数）
├── app.js              # エントリポイント（初期化・各モジュールのオーケストレーション）
├── appRouting.js       # URL/履歴/title・description更新の制御
├── appNavigation.js    # プロジェクトナビ（サムネイルDOM生成・イベント紐付け）
├── appHeroMedia.js     # ヒーロー動画の再生切替・表示タイミング制御
├── appStateTransitions.js # hover/initial/modal の状態遷移ユーティリティ
├── appEventBindings.js # グローバルイベント登録（ESC/クリック/touch）
├── state.js            # 状態管理（currentState, 選択中プロジェクト等）
├── domRefs.js          # DOM 参照の保持（setRefs / getRefs）
├── constants.js        # 定数（ブレークポイント・時間・カーソル設定・ベースURL）
├── utils.js            # ユーティリティ（escapeHtml, フォーカストラップ）
├── modal.js            # モーダルの開閉・コンテンツ組み立て
├── lightbox.js         # ライトボックス（画像・動画の拡大表示）
├── media.js            # メディア表示（画像/動画グリッド、cases 用カード、動画プレイヤー）
├── videoCache.js       # 動画URL解決・`<link rel="preload">`・アイドル時プリロード
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

1. **`app.js`** … エントリポイント。`projects.json` の取得、初期プリロード、初期UI起動を順序制御します（詳細処理は専用モジュールへ委譲）。
2. **`appRouting.js`** … `/{pageSlug}/` ルートの解釈、履歴 API、モーダル開閉時の title/description 更新を担当します。
3. **`appNavigation.js`** … 下部プロジェクトナビのDOM描画とアイテムのイベント紐付けを担当します。
4. **`appHeroMedia.js`** … ホバー時ヒーロー動画の切替、再生、表示フォールバックを担当します。
5. **`appStateTransitions.js` / `appEventBindings.js`** … 画面状態遷移ユーティリティとグローバルイベント登録を担当します。
6. **`videoCache.js`** … 動画URL解決（現在は canonical URL ベース）と `<link rel="preload">`、アイドル時プリロードキューを提供します。
7. **`projectVideoUrls.js`** … `heroMedia`、トップレベル `initiatives`、`cases` 内の `videos` / `hasVideo`、`gallery` 内の動画 URL を集約します。
8. **`media.js` / `modal.js` / `lightbox.js`** … モーダル内メディア、モーダル開閉、拡大表示（ライトボックス）を分担します。

### 動画プリロード・ヒーロー再生（実装メモ）

ホバー時の体感は **ファイルサイズ・CDN・回線** に強く依存します。コード側では次で調整できます。

#### `constants.js`（先読み本数・タイミング）

| 定数 | 役割 |
|------|------|
| `VIDEO_PRELOAD_LINK_MAX_MOBILE` / `VIDEO_PRELOAD_LINK_MAX_DESKTOP` | 起動時に挿入する `<link rel="preload" as="video">` の最大本数 |
| `HERO_VIDEO_PREFETCH_COUNT_MOBILE` / `HERO_VIDEO_PREFETCH_COUNT_DESKTOP` | 起動時に `ensureVideoPlayUrl` で登録するヒーロー動画の先頭 N 本 |
| `VIDEO_UPDATE_FADE_DELAY_MS` | ホバー切替時、実際に `src` を差し替えるまでの遅延（ms） |
| `VIDEO_SHOW_FALLBACK_MS` | 再生イベントが来ないときの表示フォールバックまでの待ち（ms） |

ヒーロー動画URLの列挙順は `projectVideoUrls.js` → `collectProjectVideoUrls` の結果に従います（`projects.json` の並び・`heroMedia.src` が未設定の項目はスキップ）。存在する本数だけが先読み対象になります（例: `video-01` 未配置なら残りのみ）。

#### 起動時の挙動（`app.js`）

- `collectProjectVideoUrls` でヒーロー用 URL 一覧を取得し、`injectVideoLinkPreloads` と `ensureVideoPlayUrl`（先頭 N 本）で先読みヒントを張る。
- **`isConservativeVideoPreload()`** が真のとき（`navigator.connection.saveData`、または `effectiveType` が `slow-2g` / `2g`）、起動時の先読みは行わない。極低速・データ節約時はホバーで初取得になる。

#### ホバー時のヒーロー動画（`appHeroMedia.js`）

- ブラウザの自動再生ポリシー対策のため、背景ヒーローは **muted** で再生する。
- 表示は **`loadeddata` / `playing`** を使い、最初のフレーム取得後に見えやすくする。

#### モーダル開閉と document meta（`appRouting.js`）

- モーダル表示中は title / `meta name="description"` をプロジェクトに合わせ、閉じたときはトップの既定値へ戻す。
- canonical / `sitemap.xml` は **`https://shuntofujii.com/`（非 www）** 前提でリポジトリ内を統一。**Search Console** のプロパティURLも同一ホストに揃えること。

### プロジェクト別URL（静的ページ）

各案件は **`https://shuntofujii.com/{pageSlug}/`**（フラットURL）で個別にインデックス可能です。`projects.json` の各オブジェクトに **`pageSlug`** を定義し、トップのUIはそのままモーダルで表示します。

- トップから案件を開くと、履歴APIで **`/{pageSlug}/`** にURLが合わせられます（リロードすると該当の静的HTMLが読み込まれます）。
- ルート直下に **`{pageSlug}/index.html`** が生成されます（例: `ejic/index.html` → 本番では `/ejic/`）。

#### `pageSlug` の付け方（必読）

| 項目 | 内容 |
|------|------|
| **推奨** | 英小文字、数字、ハイフン（`-`）。短く一意なスラッグ（例: `ejic`, `dates`, `rockpaperdead`）。 |
| **禁止（予約語）** | スラッグ **`projects` は使わないでください**。ルーティング上、案件URLとして扱いません（`routing.js` の予約）。 |
| **将来のページと衝突しないように** | 今後ルート直下に `about` や `contact` などの固定ページを置く予定がある場合、その名前と同じ `pageSlug` は避けてください。 |
| **`projects.json` との関係** | データファイル名は **`projects.json`**（リポジトリ直下）。ブラウザは **`/projects.json`** として取得します。これは **案件URL `/projects/` とは無関係**です（`/projects/` というパスの案件ページは作りません）。 |

#### 静的HTMLの再生成（データ変更のたび）

`projects.json` の **タイトル・説明文・`pageSlug`・サムネイル** などを変えたら、各 `{pageSlug}/index.html` 内の **canonical・OGP・JSON-LD** を更新するため、必ず次を実行してください。

```bash
node scripts/build-project-pages.mjs
```

案件を **追加・削除** した場合は、あわせて **`index.html`**（トップ）の構造化データ・SEO用実績リスト、**`sitemap.xml`** のURL一覧を手作業で整合させてください。

## 🔁 デプロイ・データ更新時の推奨手順（運用者向け）

`projects.json` を編集したあと、次の順序を踏むと抜け漏れが減ります。

1. **`node meta-audit.js`** … モーダルmetaとDisciplinesの整合を確認（エラー時は修正してから次へ）。
2. **`node scripts/build-project-pages.mjs`** … 全 `{pageSlug}/index.html` を再生成。
3. **`sitemap.xml`** … 必要に応じて `lastmod` やURL一覧を更新（案件の追加・削除・URL変更時）。
4. **トップ `index.html`** … ItemListの `url` や `.seo-project-list` のリンクを、案件追加・削除に合わせて更新（手動）。
5. 本番反映後、**Search Console** のサイトマップ送信済みであれば、必要に応じて再送信。

## 🚀 ローカル起動方法（初めて触る人向け）

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

### 本番URLの前提（ルート相対パス）

`index.html` および各 `{pageSlug}/index.html` は **`/app.js`・`/styles.css`・`/projects.json`** のように **サイトルート基準の絶対パス**でリソースを読み込みます。**ドメイン直下（例: `https://shuntofujii.com/`）にホストする**想定です。サブディレクトリ配下だけに公開する場合は、パス解決を見直す必要があります。

## 🎨 カスタマイズ（実装者向け）

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

## ✅ 差し替えチェックリスト（運用者向け）

### 更新内容別の最短ルート

#### A. 文言・リンク・画像差し替えだけ（案件数やURLは変えない）

1. `projects.json` を更新（タイトル/説明/画像/リンクなど）
2. `node meta-audit.js`
3. `node scripts/build-project-pages.mjs`
4. `5. 動作確認` の **必須最小チェック**

#### B. 案件追加・削除・`pageSlug` 変更あり（URL構成が変わる）

1. `projects.json` を更新（`pageSlug` を含む）
2. `node meta-audit.js`
3. `node scripts/build-project-pages.mjs`
4. `sitemap.xml` のURLと `lastmod` を更新
5. トップ `index.html` の ItemList / SEO実績リンクを整合
6. `5. 動作確認` の **必須最小チェック** + 直リンク確認

### 必須（公開前に必ず実施）

- [ ] 各プロジェクトに **`pageSlug`** を設定（一意・**`projects` は使わない**・将来の固定ページ名と重複させない）
- [ ] 各プロジェクトの `id` / `title` を実際のプロジェクト名に変更
- [ ] `category` / `disciplines` / `year` を実際の内容に変更
- [ ] `tagline` / `description` を各プロジェクトの説明に変更
- [ ] `heroMedia`（`type`, `src`）をホバー時に表示する動画・画像に変更
- [ ] `thumbnail` をサムネイル画像の URL に変更
- [ ] 編集後 **`node meta-audit.js`** → **`node scripts/build-project-pages.mjs`** を実行
- [ ] 案件追加・削除・URL変更時は、**`sitemap.xml`** とトップ **`index.html`**（ItemList・SEOリスト）を整合
- [ ] 公開前に最低限の動作確認を実施（下記「5. 動作確認」）

### 任意（必要な場合のみ）

- [ ] `tools` 配列を実際に使用したツールに変更
- [ ] `links` 配列に外部リンク（Behance / YouTube / Web など）を追加
- [ ] **cases を使う場合**: `projectSlug` と `cases` を追加（後述「アセットルール」参照）
- [ ] メタ情報・構造化データ（`index.html`）を用途に合わせて調整
- [ ] デザイン（`styles.css`）をブランドに合わせて調整

### 1. プロジェクトデータ（`projects.json`）

- [ ] 必須項目（`pageSlug`, `id`, `title`, `category`, `disciplines`, `year`, `tagline`, `description`, `heroMedia`, `thumbnail`）を更新
- [ ] 任意項目（`tools`, `links`, `cases`, `modalMetaItems`）を必要に応じて更新

### プロジェクトmeta（hover左上 / モーダルmeta）運用ルール

このプロジェクトでは「hover左上（コンテキストパネル）」と「モーダル最下部meta」で情報が乖離しないよう、次のルールで運用します。

#### 構成要素

プロジェクトごとのmeta構成要素は次の7種です（存在しない要素は省略してOK）。**自分の関わり方・担当領域の要約は `projects.json` の `disciplines` に書き、モーダルでは `Disciplines` として表示します**（チーム記載は `Team` に任せ、個人の肩書きだけを増やさない運用）。

- `Client`
- `Domain`
- `Prize`
- `Year`
- `Disciplines`
- `Toolkits`
- `Team`

#### `disciplines` フィールド

各プロジェクトに **`disciplines`**（文字列）を1つ置きます。関わり方全体（Founding / Creative Direction / 具体的な担当領域など）をこの1行で表現し、ホバー左上の2行目・モーダルの `$disciplines` の参照元になります。

#### 表示ルール

- **hover左上（コンテキストパネル）**: 次の4つのみ表示
  - `Domain`（= `category`）
  - `Year`（= `year`）
  - `Disciplines`（= `disciplines`）
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
    { "label": "Disciplines", "value": "$disciplines", "icon": "https://assets.shuntofujii.com/icons/focus.svg" },
    { "label": "Toolkits", "value": "$toolkits", "icon": "https://assets.shuntofujii.com/icons/toolkits.svg" },
    { "label": "Team", "value": "Role：Name / ...", "icon": "https://assets.shuntofujii.com/icons/team.svg" }
  ]
}
```

`value` は固定文字列のほか、次のトークンを利用できます。

- `$domain`（= `category`）
- `$year`（= `year`）
- `$disciplines`（= `disciplines`）
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

- [ ] `<title>` と `meta name="description"` を変更（`keywords` は検索エンジンの利用価値が低いため、トップでは未使用。任意で追加する場合は各ページの文脈に合わせる）
- [ ] OGP（`og:title`, `og:description`, `og:image`, `og:url` 等）を変更
- [ ] Twitter 用メタ（`twitter:card`, `twitter:title`, `twitter:image` 等）を変更
- [ ] `application/ld+json` の ProfilePage / WebPage の名前・説明・`sameAs`（SNS 等）を変更
- [ ] `link rel="canonical"` を本番 URL に変更
- [ ] `theme-color` / `favicon` / `apple-touch-icon` を必要に合わせて変更

### 4. デザイン調整（`styles.css`）

- [ ] `:root` の `--accent-color` / `--bg-gradient-*` / `--text-*` 等を好みに合わせて調整
- [ ] フォントは Google Fonts の Inter を利用。差し替える場合は `index.html` の `link` と `styles.css` の `font-family` を変更

### 5. 動作確認

- [ ] **必須最小チェック**: 起動 / hover表示 / モーダル開閉 / ESC閉じる / ライトボックス開閉 / 直リンク `/{pageSlug}/`
- [ ] ローカルサーバーで起動できるか確認
- [ ] プロジェクトにホバーでヒーロー動画・コンテキストパネルが表示されるか確認
- [ ] プロジェクトをクリックでモーダルが開くか確認
- [ ] モーダル内の画像・動画が正しく表示され、クリックでライトボックスが開くか確認
- [ ] 外部リンクが正しく動作するか確認
- [ ] ESC キーと × ボタンでモーダル・ライトボックスが閉じるか確認
- [ ] スキップリンク（フォーカス時）・キーボード操作が期待どおりか確認
- [ ] スマホ表示で問題がないか確認（Safe Area・横スクロール・レイアウト崩れなど）

---

## 📦 アセットルール（実装者向け）

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

## 🐛 トラブルシューティング（共通）

### 画像が表示されない

- ファイルパスが正しいか確認（`baseAssetsUrl` + `projectSlug` + ファイル名の組み合わせ）
- ファイル名の大文字小文字が一致しているか確認
- ブラウザのコンソールでエラーを確認

### 動画が再生されない

- ヒーロー用は `.webm` を推奨。モーダル内インライン動画も `.webm` + ポスター `.webp` を想定
- **cases の `assetPrefix` と実ファイル名**: `buildVideoUrl` は `https://{base}/{projectSlug}/{assetPrefix}_m_{番号}.webm` を要求します。CDN にその名前のファイルが無いと（HTTP 404）再生できません。ブラウザの開発者ツールの Network で該当 URL を確認するか、ターミナルで `curl -I` してステータスを確認してください。実ファイル名に合わせて `projects.json` の `assetPrefix` を直すか、アップロード側のファイル名を規則に揃えてください。
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
- **SEO**: `robots.txt`、`sitemap.xml`、メタタグ（OGP・Twitter）、構造化データ（ProfilePage / WebPage + ItemList）、視覚非表示の実績一覧テキスト。案件別は **`/{pageSlug}/`** の静的HTML（ビルドスクリプト生成）。詳細は `SEO_RECOMMENDATIONS.md` を参照
- **動画読み込み**: 形式は WebM のみ。`videoCache.js` により canonical URL の解決、`<link rel="preload" as="video">`、アイドル時プリロードキューを利用。先読み本数・ホバー挙動の詳細は `動画プリロード・ヒーロー再生（実装メモ）` を参照

---

## 📄 ライセンス

このポートフォリオテンプレートは自由にカスタマイズしてご利用ください。

**出典の保持**  
本リポジトリのコード（HTML / JS / CSS）には、テンプレート元の出典表記（https://shuntofujii.com/）がコメントとして含まれています。二次利用・改変の際も、ライセンスおよび出典の明示のため、これらの表記は残してください。

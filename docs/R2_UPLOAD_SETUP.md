# Cloudflare R2 アップロード設定ガイド

ポートフォリオのアセット（画像・動画）を **Cloudflare R2** にアップロードし、`assets.shuntofujii.com` から配信するための設定手順です。

CLI 本体: `scripts/upload-asset.mjs`（`npm run upload`）

---

## 全体像

```
ローカルPC
  │
  │  npm run upload
  │    ├─ sharp / ffmpeg で WebP・WebM に変換
  │    ├─ R2 API でアップロード
  │    └─ projects.json 更新 → git push
  ▼
Cloudflare R2 バケット
  │
  │  カスタムドメイン assets.shuntofujii.com
  ▼
ポートフォリオサイト（shuntofujii.com）
  └─ constants.js の baseAssetsUrl から読み込み
```

---

## 前提条件

| 項目 | 内容 |
|------|------|
| Cloudflare アカウント | R2 が有効なプラン（無料枠あり） |
| ドメイン | `shuntofujii.com` が Cloudflare で管理されていること |
| ローカル環境 | Node.js 20+、`npm install` 済み |
| 動画変換 | `ffmpeg`（`brew install ffmpeg`） |

---

## Step 1: R2 バケットを作成

1. [Cloudflare ダッシュボード](https://dash.cloudflare.com/) → **R2 Object Storage**
2. **Create bucket** をクリック
3. バケット名を入力（例: `portfolio-assets`）
   - この名前を `.env` の `R2_BUCKET_NAME` に使います
4. リージョンは **Automatic**（または希望のリージョン）で作成

> **既存バケットがある場合**  
> すでに `assets.shuntofujii.com` で配信しているバケットがあれば、新規作成は不要です。そのバケット名を `R2_BUCKET_NAME` に設定してください。

---

## Step 2: カスタムドメインを接続

サイトは `constants.js` の `baseAssetsUrl`（`https://assets.shuntofujii.com`）からアセットを読み込みます。R2 バケットにこのドメインを接続します。

1. R2 → 対象バケット → **Settings** → **Custom Domains**
2. **Add domain** → `assets.shuntofujii.com` を入力
3. Cloudflare が DNS レコードを自動設定（`shuntofujii.com` が同一アカウント内にある場合）
4. ステータスが **Active** になるまで数分待つ

### DNS を手動設定する場合

`shuntofujii.com` が Cloudflare 外で管理されている場合:

1. R2 の Custom Domains 画面に表示される CNAME ターゲットを確認
2. DNS プロバイダーに CNAME レコードを追加:
   - **Name**: `assets`
   - **Target**: Cloudflare が提示する R2 エンドポイント

### 公開アクセスの確認

```bash
curl -I https://assets.shuntofujii.com/top/thumbnail-01.webp
```

`HTTP/2 200` が返れば公開設定は OK です。404 の場合はファイルが未配置、403 の場合は公開設定を確認してください。

---

## Step 3: R2 API トークンを発行（既存バケット向け・ここだけ手動）

CLI が既存バケット `assets` に書き込むためのキーを作ります。**この画面は Cloudflare にログインしているあなたしか操作できません。**

### 3-1. トークン管理画面を開く

どちらかの方法で開きます。

**方法 A（おすすめ）**  
今開いている `assets` バケット画面の左サイドバーで、**R2 オブジェクトストレージ** の少し下、またはページ上部のアカウント系メニューから **「R2 API トークンを管理」 / Manage R2 API Tokens** を探してクリック。

**方法 B（直リンク）**  
ブラウザのアドレスバーに次を貼り付けて Enter:

```
https://dash.cloudflare.com/5e43a7ccc0fff081fab0e695b875ea2c/r2/api-tokens
```

### 3-2. 新しいトークンを作成

1. **Create API token**（API トークンを作成）をクリック
2. 次のように設定します（日本語 UI の場合も同じ意味の項目を選びます）

| 項目 | 選ぶ内容 |
|------|----------|
| Token name | 例: `portfolio-upload-cli`（わかりやすい名前でOK） |
| Permissions | **Object Read & Write**（オブジェクトの読み取りと書き込み） |
| Specify bucket(s) | **Apply to specific buckets only** → バケット **`assets`** だけを選択 |
| TTL / 有効期限 | 空欄（無期限）でOK。不安なら 1 年などでも可 |

3. **Create API Token** をクリック

### 3-3. 画面に出た 2 つの値をコピー（再表示できません）

成功画面に次が出ます。**この画面を閉じると Secret は二度と見えません。**

1. **Access Key ID** … 長い英数字の ID
2. **Secret Access Key** … もっと長い秘密キー（表示用のコピーボタンを使う）

メモ帳などに一時保存して構いません（あとで `.env` に移したらメモ帳は削除推奨）。

> Account ID はすでに `.env` に入れ済みです（`5e43a7ccc0fff081fab0e695b875ea2c`）。  
> バケット名も `assets` で入れ済みです。

### 3-4. キーをチャットに貼らないでください

セキュリティのため、**Access Key / Secret をこのチャットに送らないでください。**  
作成できたら「トークン作った」とだけ返信してもらえれば、こちらで `.env` の記入方法を案内します（または Cursor で `.env` を開いて 2 行だけ埋めてもらいます）。

---

## Step 4: `.env` を設定

リポジトリルートで:

```bash
cp .env.example .env
```

`.env` を編集:

```env
R2_ACCOUNT_ID=あなたのAccount ID
R2_ACCESS_KEY_ID=発行したAccess Key ID
R2_SECRET_ACCESS_KEY=発行したSecret Access Key
R2_BUCKET_NAME=portfolio-assets

R2_PUBLIC_BASE_URL=https://assets.shuntofujii.com
```

| 変数 | 説明 |
|------|------|
| `R2_ACCOUNT_ID` | Cloudflare アカウント ID |
| `R2_ACCESS_KEY_ID` | API トークンの Access Key |
| `R2_SECRET_ACCESS_KEY` | API トークンの Secret Key |
| `R2_BUCKET_NAME` | R2 バケット名 |
| `R2_PUBLIC_BASE_URL` | 公開 URL のベース（省略時は `constants.js` の `baseAssetsUrl`） |

> `.env` は `.gitignore` に含まれています。**絶対に Git にコミットしないでください。**

---

## Step 5: 初回アップロードのテスト

### 5-1. dry-run で計画を確認

```bash
npm run upload -- \
  --project izumo \
  --prefix strategy2024 \
  --type image \
  --file ./path/to/photo.jpg \
  --dry-run
```

出力例:

```
--- アップロード計画 ---
  izumo/strategy2024_p_3.webp
```

ファイル名・フォルダが期待どおりか確認します。

### 5-2. 実際にアップロード

```bash
npm run upload -- \
  --project izumo \
  --prefix strategy2024 \
  --type image \
  --file ./path/to/photo.jpg \
  --update-json \
  --commit \
  --push
```

### 5-3. 反映確認

```bash
# R2 上のファイル
curl -I "https://assets.shuntofujii.com/izumo/strategy2024_p_3.webp"

# サイト（projects.json 更新後）
# ローカル: python3 -m http.server 8000 → モーダル内で画像表示を確認
```

---

## Step 6: GitHub Actions デプロイ（初回のみ）

`projects.json` を push するとサイトが自動更新されるようにします。

### 6-1. GitHub Pages を Actions ソースに変更

1. GitHub リポジトリ → **Settings** → **Pages**
2. **Build and deployment** → Source: **GitHub Actions**

### 6-2. ワークフローの確認

`.github/workflows/deploy.yml` が `main` ブランチへの push で:

1. `meta-audit.js`
2. `build-project-pages.mjs`
3. `_site` を準備（`node_modules` / `tests` / `scripts` / `docs` 等を除外）
4. GitHub Pages へデプロイ

を実行します。

### 6-3. 初回 push 後

Actions タブで **Deploy site** ワークフローが成功することを確認してください。

---

## Step 7: GitHub API 連携（任意）

ローカルで commit せず、リモートの `projects.json` だけ更新したい場合に使います。

### Personal Access Token の作成

1. GitHub → **Settings** → **Developer settings** → **Personal access tokens**
2. **Fine-grained token**（推奨）または **Classic token**
3. 権限: 対象リポジトリへの **Contents: Read and write**

`.env` に追加:

```env
GITHUB_TOKEN=ghp_xxxxxxxx
GITHUB_OWNER=shuntofujii
GITHUB_REPO=260101_Portfolio
GITHUB_BRANCH=main
```

使用例:

```bash
npm run upload -- \
  --project izumo \
  --prefix strategy2024 \
  --type image \
  --file ./photo.jpg \
  --update-json \
  --github-commit
```

---

## よく使うコマンド一覧

### cases 用画像

```bash
npm run upload -- \
  --project <projectSlug> \
  --prefix <assetPrefix> \
  --type image \
  --file ./raw/photo.jpg \
  --update-json --commit --push
```

### cases 用動画（WebM + ポスター自動生成）

```bash
npm run upload -- \
  --project <projectSlug> \
  --prefix <assetPrefix> \
  --type video \
  --file ./raw/clip.mp4 \
  --update-json --commit --push
```

### ヒーロー動画（top フォルダ）

```bash
npm run upload -- \
  --project izumo \
  --type hero \
  --folder top \
  --dest-name video-04.webm \
  --file ./raw/hero.mp4 \
  --update-json --commit --push
```

### サムネイル（top フォルダ）

```bash
npm run upload -- \
  --project izumo \
  --type thumbnail \
  --folder top \
  --dest-name thumbnail-04.webp \
  --file ./raw/thumb.jpg \
  --update-json --commit --push
```

### 同名 prefix が複数 case ある場合

```bash
npm run upload -- \
  --project dates \
  --case "Process" \
  --prefix murder_process \
  --type video \
  --file ./raw/process.mp4 \
  --update-json --commit --push
```

---

## ファイル命名規則（R2 上のパス）

CLI は README のアセットルールに従って自動命名します。

| 種別 | R2 キー例 |
|------|-----------|
| cases 画像 | `{projectSlug}/{prefix}_p_{n}.webp` |
| cases 動画 | `{projectSlug}/{prefix}_m_{n}.webm` |
| 動画ポスター | `{projectSlug}/{prefix}_m_{n}.webp` |
| ヒーロー | `top/video-04.webm` + `top/video-04.webp` |
| サムネイル | `top/thumbnail-04.webp` |

公開 URL:

```
https://assets.shuntofujii.com/{projectSlug}/{filename}?v=20260803
```

`?v=` は `constants.js` の `ASSETS_CACHE_V` です。CDN キャッシュを更新したい場合は、この値を変更してから再デプロイしてください。

---

## トラブルシューティング

### `環境変数が不足しています`

`.env` がリポジトリルートにあるか、4 つの R2 変数がすべて埋まっているか確認してください。

### `ffmpeg が見つかりません`

```bash
brew install ffmpeg
ffmpeg -version
```

### R2 アップロードで 403 / Access Denied

- API トークンの権限が **Object Read & Write** か確認
- `R2_BUCKET_NAME` が正しいバケット名か確認
- `R2_ACCOUNT_ID` が Access Key 発行時の Account ID と一致しているか確認

### ブラウザで 404（ファイルが見つからない）

1. R2 ダッシュボード → バケット → オブジェクト一覧でキー名を確認
2. CLI の dry-run 出力と一致しているか比較
3. `projects.json` の `assetPrefix` / `projectSlug` が正しいか確認

```bash
curl -I "https://assets.shuntofujii.com/izumo/strategy2024_p_1.webp"
```

### 画像は R2 にあるがサイトに表示されない

- `projects.json` の `images` / `videos` カウントが実ファイル数と一致しているか
- ブラウザ DevTools → Network で 404 / CORS エラーを確認
- `ASSETS_CACHE_V` を更新してキャッシュを bust

### `--update-json` で initiative が見つからない

`projects.json` に対象の `assetPrefix` が存在する必要があります。先に JSON 側で case / initiative を追加してからアップロードしてください。

### GitHub Actions が失敗する

- Settings → Pages → Source が **GitHub Actions** か確認
- Actions タブでエラーログを確認（`meta-audit.js` 失敗が多い）
- 初回デプロイ時は **Settings → Pages → GitHub Pages** の environment 承認が必要な場合あり

### 動画が再生されない

- 形式が `.webm`（VP9）か確認（CLI は自動変換）
- ポスター `.webp` が同名で R2 に存在するか確認
- ファイルサイズが大きすぎないか（ヒーロー動画は回線・CDN 依存）

---

## セキュリティ注意事項

- `.env` / API キー / GitHub Token を Git にコミットしない
- R2 トークンは **必要最小限のバケット** にスコープを絞る
- GitHub Token は **repo の Contents 権限のみ** に限定
- トークン漏洩時は Cloudflare / GitHub 両方で即座にローテーション

---

## 関連ファイル

| ファイル | 役割 |
|---------|------|
| `scripts/upload-asset.mjs` | CLI エントリポイント |
| `scripts/lib/r2-upload.mjs` | R2 へのアップロード |
| `scripts/lib/convert-media.mjs` | WebP / WebM 変換 |
| `scripts/lib/update-projects-json.mjs` | projects.json 更新 |
| `.env.example` | 環境変数テンプレート |
| `.github/workflows/deploy.yml` | GitHub Pages 自動デプロイ |
| `constants.js` | `baseAssetsUrl`, `ASSETS_CACHE_V` |
| `README.md` | アセットルール・命名規則 |

---

## 推奨運用フロー（まとめ）

```
1. 素材を用意（jpg / png / mp4 等）
2. dry-run でキー名を確認
3. npm run upload -- ... --update-json --commit --push
4. GitHub Actions の成功を確認
5. 本番サイトで表示確認
6. 必要なら ASSETS_CACHE_V を更新してキャッシュ bust
```

静的ページ（`/{pageSlug}/index.html`）の OGP を更新したい場合は `--rebuild` を追加してください。cases の画像・動画枚数変更だけなら `--update-json` のみで十分です。

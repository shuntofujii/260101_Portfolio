# ゲーム UI 風ポートフォリオ

ゲームのキャラクター選択 UI のように、9 つのプロジェクトを選んで体験できるポートフォリオサイトです。

## 📁 ファイル構成

```
/260101_Portfolio/
├── index.html          # メインHTML
├── styles.css          # スタイルシート
├── app.js              # JavaScript（状態管理・インタラクション）
├── projects.json       # プロジェクトデータ（9件）
├── assets/             # 画像・動画ファイル
└── README.md           # このファイル
```

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

### アクセントカラーの変更

`styles.css` の `:root` セクションで、アクセントカラーを変更できます：

```css
:root {
  --accent-color: #00d9ff; /* シアン（デフォルト） */
  /* --accent-color: #a8ff00; */ /* ライム */
  /* --accent-color: #ffb800; */ /* アンバー */
  /* --accent-color: #ff6b9d; */ /* ピンク */
}
```

コメントアウトを切り替えて、お好みの色に変更してください。

## ✅ 差し替えチェックリスト

### 1. プロジェクトデータ（`projects.json`）

- [ ] 各プロジェクトの `title` を実際のプロジェクト名に変更
- [ ] `category` を適切なカテゴリに変更（Branding / Motion / Visual など）
- [ ] `role` を実際の役割に変更
- [ ] `year` を実際の制作年に変更
- [ ] `tools` 配列を実際に使用したツールに変更
- [ ] `tagline` を各プロジェクトのキャッチフレーズに変更
- [ ] `description` をプロジェクトの説明文に変更
- [ ] `heroMedia.src` を実際の画像/動画パスに変更
- [ ] `thumbnail` をサムネイル画像のパスに変更
- [ ] `gallery` 配列に実際の画像/動画を追加
- [ ] `links` 配列に外部リンク（Behance / YouTube / Web など）を追加

### 2. 画像・動画ファイル（`assets/`）

- [ ] 各プロジェクトのヒーロー画像/動画を配置
- [ ] 各プロジェクトのサムネイル画像を配置
- [ ] ギャラリー用の画像/動画を配置
- [ ] ファイル名が `projects.json` のパスと一致しているか確認

### 3. プロフィール情報（`index.html`）

- [ ] プロフィールアイコン（右下の「P」）のリンク先を設定
- [ ] コンタクトアイコン（Email / Twitter / Instagram）のリンク先を設定
  - Email: `mailto:` リンクに変更
  - Twitter: 実際の Twitter URL に変更
  - Instagram: 実際の Instagram URL に変更

### 4. メタ情報（`index.html`）

- [ ] `<title>` タグの内容を変更
- [ ] 必要に応じて `<meta>` タグを追加（OGP など）

### 5. デザイン調整（`styles.css`）

- [ ] アクセントカラーを決定し、`:root` で設定
- [ ] フォントサイズや余白を必要に応じて調整
- [ ] 背景グラデーションを好みに合わせて調整

### 6. 動作確認

- [ ] ローカルサーバーで起動できるか確認
- [ ] 各プロジェクトの hover で ①②③ が正しく切り替わるか確認
- [ ] 各プロジェクトの click でモーダルが開くか確認
- [ ] モーダル内の画像/動画が正しく表示されるか確認
- [ ] 外部リンクが正しく動作するか確認
- [ ] スマホ表示で問題がないか確認（横スクロール、レイアウト崩れなど）
- [ ] ESC キーと × ボタンでモーダルが閉じるか確認

---

## 📦 アセットルール（izumo / deteqle 型プロジェクト）

`projectSlug` を持つプロジェクトは、`cases` 構造で案件・施策ごとにメディアを管理します。

### ファイル命名規則（統一ルール）

```
{prefix}_{mediaType}_{number}.{ext}
```

| 要素 | 説明 |
|------|------|
| `prefix` | 施策の識別子。`initiativeName` のみ、または `initiativeName_caseName`（案件を細分する場合） |
| `mediaType` | `m` = 動画、`p` = 画像 |
| `number` | 通番（1 から） |
| `ext` | 動画 `.webm`、画像 `.webp` |

**案件名なし**（caseName が null）は、`prefix = initiativeName` のみのケースです。

**例**  
- `strategy2024_m_1.webm`, `strategy2024_p_1.webp`（prefix = strategy2024、案件名なし）
- `murder_process_m_1.webm`, `content_zombie_p_1.webp`（prefix = initiativeName_caseName）

### ベースURL

```
https://assets.shuntofujii.com/{projectSlug}/{filename}
```

動画のポスター画像は、動画と同じ basename で拡張子を `.webp` にしたファイルを使用します。

### projects.json の記述（統一形式）

各施策は `assetPrefix` で prefix を指定し、動画・画像は本数・枚数で宣言します。

| プロパティ | 説明 |
|-----------|------|
| `title` | 施策の表示名 |
| `assetPrefix` | ファイル名の prefix（例: `strategy2024`, `murder_process`） |
| `videos` | 動画の本数（0 または省略 = なし。`hasVideo: true` は 1 本として扱う） |
| `images` | 画像の枚数（1 グリッドで表示） |
| `imageGroups` | 画像を複数行に分ける場合の各グループの枚数（例: `[5, 5]` → 1〜5 枚目と 6〜10 枚目） |

**例 1** 動画 1 本 + 画像 2 枚（従来の IZUMO 形式）

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

---

## 🐛 トラブルシューティング

### 画像が表示されない

- ファイルパスが正しいか確認（`assets/` ディレクトリ内にファイルがあるか）
- ファイル名の大文字小文字が一致しているか確認
- ブラウザのコンソールでエラーを確認

### 動画が再生されない

- MP4 形式であることを確認
- ファイルサイズが大きすぎないか確認
- ブラウザが対応しているコーデックか確認

### JSON が読み込めない

- ローカルサーバーを使用しているか確認（`file://` では動作しません）
- `projects.json` の構文エラーがないか確認（JSON バリデーターで確認）

### モーダルが開かない

- ブラウザのコンソールでエラーを確認
- `projects.json` が正しく読み込まれているか確認

## 📝 技術仕様

- **フレームワーク**: なし（Vanilla HTML/CSS/JS）
- **外部ライブラリ**: Google Fonts（Inter）のみ
- **対応ブラウザ**: モダンブラウザ（Chrome, Firefox, Safari, Edge）
- **レスポンシブ**: 対応（スマホ・タブレット・PC）

## 📄 ライセンス

このポートフォリオテンプレートは自由にカスタマイズしてご利用ください。



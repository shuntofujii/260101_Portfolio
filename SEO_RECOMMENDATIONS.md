# SEO 実施内容と追加で推奨すること

## 本リポジトリで実施したSEO対応（コード側）

- **robots.txt** … クローラー許可と `sitemap.xml` の指定
- **sitemap.xml** … トップ・案件・profile を登録（更新時に `lastmod` を更新推奨）
- **メタタグ** … `theme-color`, `robots`, OGP（`og:locale`, `og:image` / alt）, Twitter, `apple-touch-icon`
- **構造化データ** … ProfilePage/Person に加え、WebPage + ItemList（8プロジェクト名）を JSON-LD で追加。案件ページは CreativeWork + WebPage
- **クローラー向けテキスト** … トップの実績一覧に加え、各案件ページに固有の `.seo-project-detail`（タイトル・説明・メタ）
- **noscript** … 実績名の表記を整理
- **画像の alt / aria-label** … モーダル内グリッド画像に意味のある alt（caption があれば優先）、ライトボックスで引き継ぎ
- **アクセシビリティ** … スキップリンク、`aria-label`（ナビ・コンテキストパネル）を日本語で統一

---

## コードでは完結しない・運用で行うとよいこと

### 0. www → 非 www リダイレクト（必須）

`https://www.shuntofujii.com/` を **301 で `https://shuntofujii.com/` へ**。手順は [`docs/WWW_REDIRECT_SETUP.md`](docs/WWW_REDIRECT_SETUP.md)。

### 1. Google Search Console（GSC）

- **プロパティ登録**  
  https://search.google.com/search-console で `https://shuntofujii.com` を追加（ドメイン or URLプレフィックス）。
- **sitemap 送信**  
  「サイトマップ」から `https://shuntofujii.com/sitemap.xml` を送信。
- **インデックス確認**  
  「URL検査」でトップURLがインデックスされているか確認。問題があれば「インデックス登録をリクエスト」。

### 2. OGP画像の実サイズ

- `index.html` では `og:image:width` / `og:image:height` を **1200×630** にしています。
- `https://assets.shuntofujii.com/top/ogp.webp` も **1200×630** に揃えています（`ASSETS_CACHE_V` / `?v=` とあわせて更新）。
- 案件ページの OGP は各 `thumbnail`（正方形寄り）を使用。必要なら案件専用の 1200×630 を別途用意してもよい。

### 3. sitemap.xml の lastmod

- デプロイやコンテンツ更新のたびに、`sitemap.xml` の `lastmod` を**その日の日付（YYYY-MM-DD）**に更新すると、検索エンジンに「いつ更新されたか」を伝えやすくなります。

### 4. プロジェクト別URL（実装済み）

- 各案件は **`/{pageSlug}/`** の静的HTML（`{pageSlug}/index.html`）を持ちます。`projects.json` を更新したら **`node scripts/build-project-pages.mjs`** で再生成し、`sitemap.xml` の `lastmod` を更新してください。
- 追加で「about / contact」などのページを増やす場合も、固有の `title` / `description` / `canonical` とサイトマップ登録を揃えてください。

### 5. 画像 caption（任意・段階的）

- `explicitModal` の `imageRow.captions` / `mediaRow` の `caption` で alt を上書きできる。
- **公開ブロッカーではない。** 自動生成 alt（「案件名 セクションのビジュアル N」）で十分なため、全枚への投入は不要。
- スクリーンリーダーや画像検索を厚くしたいキービジュアルだけ、後から部分投入するのが費用対効果が高い。

### 6. 表示速度・Core Web Vitals

- 画像はすでに WebP などを利用されている想定です。  
  - さらに遅延読み込み（`loading="lazy"`）はモーダル内画像で利用済みです。
- フォントは `preconnect` 済み。  
  - 体感が重い場合は、**必要なウェイトだけ読み込む**・**フォント表示を `optional` にする**などの調整を検討してください。
- 本番環境で **Core Web Vitals（LCP, FID/INP, CLS）** を計測（PageSpeed Insights や GSC の「ユーザーエクスペリエンス」）し、悪化要因があれば画像サイズ・JSの実行タイミングなどを調整するとよいです。

### 7. 被リンク・ブランド検索

- 検索順位は「被リンク」と「ブランド名での検索」にも左右されます。
- SNS・ブログ・登壇・メディア掲載などで **「SHUNTO FUJII」「藤井洵斗」「shuntofujii.com」** がリンク付きで言及されると、検索での評価と認知につながりやすいです。

---

## まとめ

- コード上でできる **メタ・構造化データ・クローラー向けテキスト・alt・sitemap/robots** は実施済みです。
- **www の 301・Search Console・sitemap 送信・lastmod 更新**は運用で必須に近いです。
- さらに強化する場合は、**案件固有 OGP・部分的 caption・Core Web Vitals** を検討してください。

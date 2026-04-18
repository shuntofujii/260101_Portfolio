# SEO 実施内容と追加で推奨すること

## 本リポジトリで実施したSEO対応（コード側）

- **robots.txt** … クローラー許可と `sitemap.xml` の指定
- **sitemap.xml** … トップURLを登録（更新時に `lastmod` を更新推奨）
- **メタタグ** … `theme-color`, `robots`, OGP（`og:locale`, `og:image:width/height/alt`）, Twitter（`twitter:image`, `twitter:image:alt`）, `apple-touch-icon`
- **構造化データ** … ProfilePage/Person に加え、WebPage + ItemList（8プロジェクト名）を JSON-LD で追加
- **クローラー向けテキスト** … 視覚非表示の「ポートフォリオ実績一覧」セクション（見出し＋プロジェクト名・短い説明）をHTMLに追加
- **noscript** … 実績名の表記を整理
- **画像の alt / aria-label** … モーダル内グリッド画像に意味のある alt、ライトボックス表示時に alt を引き継ぎ
- **アクセシビリティ** … スキップリンク、`aria-label`（ナビ・コンテキストパネル）を日本語で統一

---

## コードでは完結しない・運用で行うとよいこと

### 1. Google Search Console（GSC）

- **プロパティ登録**  
  https://search.google.com/search-console で `https://shuntofujii.com` を追加（ドメイン or URLプレフィックス）。
- **sitemap 送信**  
  「サイトマップ」から `https://shuntofujii.com/sitemap.xml` を送信。
- **インデックス確認**  
  「URL検査」でトップURLがインデックスされているか確認。問題があれば「インデックス登録をリクエスト」。

### 2. OGP画像の実サイズ

- `index.html` では `og:image:width` / `og:image:height` を **1200×630** にしています。
- 実際の `https://assets.shuntofujii.com/top/ogp.webp` が別サイズの場合は、**画像を1200×630に揃える**か、**メタの width/height を実寸に合わせる**と、SNSプレビューが崩れにくくなります。

### 3. sitemap.xml の lastmod

- デプロイやコンテンツ更新のたびに、`sitemap.xml` の `lastmod` を**その日の日付（YYYY-MM-DD）**に更新すると、検索エンジンに「いつ更新されたか」を伝えやすくなります。

### 4. プロジェクト別URL（実装済み）

- 各案件は **`/{pageSlug}/`** の静的HTML（`{pageSlug}/index.html`）を持ちます。`projects.json` を更新したら **`node scripts/build-project-pages.mjs`** で再生成し、`sitemap.xml` の `lastmod` を更新してください。
- 追加で「about / contact」などのページを増やす場合も、固有の `title` / `description` / `canonical` とサイトマップ登録を揃えてください。

### 5. 表示速度・Core Web Vitals

- 画像はすでに WebP などを利用されている想定です。  
  - さらに遅延読み込み（`loading="lazy"`）はモーダル内画像で利用済みです。
- フォントは `preconnect` 済み。  
  - 体感が重い場合は、**必要なウェイトだけ読み込む**・**フォント表示を `optional` にする**などの調整を検討してください。
- 本番環境で **Core Web Vitals（LCP, FID/INP, CLS）** を計測（PageSpeed Insights や GSC の「ユーザーエクスペリエンス」）し、悪化要因があれば画像サイズ・JSの実行タイミングなどを調整するとよいです。

### 6. 被リンク・ブランド検索

- 検索順位は「被リンク」と「ブランド名での検索」にも左右されます。
- SNS・ブログ・登壇・メディア掲載などで **「SHUNTO FUJII」「藤井洵斗」「shuntofujii.com」** がリンク付きで言及されると、検索での評価と認知につながりやすいです。

---

## まとめ

- コード上でできる **メタ・構造化データ・クローラー向けテキスト・alt・sitemap/robots** は実施済みです。
- **Search Console の登録・sitemap 送信・OGP画像サイズの確認・lastmod の更新**は運用で行うと効果的です。
- さらに強化する場合は、**ページ数の拡充**と**表示速度・Core Web Vitals の計測と改善**を検討してください。

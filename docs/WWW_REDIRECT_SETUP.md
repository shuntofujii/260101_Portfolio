# www → 非 www（apex）リダイレクト設定

本番の正規 URL は **`https://shuntofujii.com/`**（非 www）です。

**DNS（維持）**

- apex … GitHub Pages の A（DNS only）
- `www` … CNAME → `shuntofujii.com`（**Proxied / オレンジ雲**必須）
- DNS は変えず、**Redirect Rule だけ**追加

---

## 手順（Redirect Rules・ワイルドカード）

1. Cloudflare → `shuntofujii.com` → **ルール** → **リダイレクトルール**
2. **ルールを作成**（「一括リダイレクト」ではない）
3. 入力:

| 項目 | 値 |
|------|-----|
| ルール名 | `www to apex` |
| 一致条件 | **ワイルドカードパターン** |
| リクエスト URL | `https://www.shuntofujii.com/*` |
| ターゲット URL | `https://shuntofujii.com/${1}` |
| ステータス | **301** |
| クエリ文字列を保存 | **オン** |

4. **デプロイ**

概要画面ではマッチが `*https://www.shuntofujii.com/*` のように見えることがあります（Full URI ワイルドカードの表記）。

---

## 確認

```bash
curl -sI https://www.shuntofujii.com/ | head -20
# 期待: HTTP/2 301 / location: https://shuntofujii.com/

curl -sI https://www.shuntofujii.com/ejic/ | head -20
# 期待: location: https://shuntofujii.com/ejic/
```

---

## うまくいかないとき

| 症状 | 確認 |
|------|------|
| まだ 403 | `www` が **Proxied** か |
| 常にトップへ | `${1}` が入っているか（Static になっていないか） |
| 一括リダイレクトの画面 | キャンセルし、**リダイレクトルール（単一）** へ |

---

## Search Console

プロパティは **`https://shuntofujii.com`**（非 www）に揃える。

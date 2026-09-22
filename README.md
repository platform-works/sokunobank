# SOKUNOBANK(即納バンク)※仮称

法人向け「急ぎ発注・最短納期比較サイト」。
「今日中/明日までに◯◯が欲しい」という法人の発注担当者向けに、カテゴリーごとの最短納期・料金を比較する。

> **注記:** 「SOKUNOBANK」は暫定名称。商標の最終確認(J-PlatPat)は未完了。

selected-by(ファッション・美容EC比較サイト)とは完全に別プロジェクト。リポジトリ・デプロイ先とも分離している。

---

## アーキテクチャ

ダイレクトメール(DM)は最初の1カテゴリーに過ぎない。今後、印刷・段ボール・名刺・印鑑・胡蝶蘭などを
追加していく前提で、カテゴリーをデータ駆動で扱う設計にしている。

- **カテゴリー定義**: `src/data/categories/*.json`(スキーマは `src/data/schema.ts`)
  - 比較項目(発送スピード・最低依頼数・単価帯など)はカテゴリーごとに可変な `comparisonFields` として定義する
  - DM固有の項目名やテキストはコンポーネント側にハードコードしない
  - 新しいカテゴリーを追加する場合は、同じスキーマの JSON ファイルを1つ置くだけでよい(ルーティング・コンポーネントの変更は不要)
- **ルーティング**: `/categories/<slug>/`(比較ページ)、`/lp/<slug>/`(広告LP、`lp` データを持つカテゴリーのみ生成・`noindex`)
- **コンポーネント**: `src/components/*` はすべてカテゴリー非依存。テキスト・項目名はすべて props 経由でデータから受け取る

### 今回のスコープ

- 上記の設計を実装した上で、実際にデータを入れて公開するのは **DMカテゴリーのみ**
- `src/data/categories/printing.json` は将来カテゴリー追加用の空テンプレート(`status: "draft"` のためルート未生成)

---

## 技術スタック

- [Astro](https://astro.build/)(静的サイト生成、`output: "static"`)
- Cloudflare Workers(Static Assets 機能でホスティング。`wrangler.jsonc` 参照)
- TypeScript

## セットアップ

```bash
npm install
npm run dev
```

### ビルド・Cloudflareへのプレビュー/デプロイ

```bash
npm run build
npm run cf:preview   # wrangler dev でローカル確認
npm run cf:deploy    # 本番デプロイ(必ず内容を確認してから実行すること)
```

初回は `wrangler login` でCloudflareアカウントにログインしておく必要がある。

ドメイン取得・Cloudflare接続・カスタムドメイン設定などコード以外の外部手続きの詳細な手順は [DEPLOY.md](DEPLOY.md) を参照。

---

## DMカテゴリーの内容について(重要)

- メイン推奨(送客軸)は **ラクスル(ラクスルDM便)**。ValueCommerceに広告主登録あり・提携確認済みという前提で設計しているが、実際のアフィリエイトリンクは未発行(`officialUrl` / `affiliateUrl` は空欄)。
- 参考掲載の4社(セルマーケ / NEXLINK / ゼンリンマーケティングソリューションズ / DM発送代行センター(メディアボックス))には**アフィリエイトリンクを付けない**。比較・信頼性のための参考情報としてのみ掲載し、データ上も `officialUrl` は空欄・比較項目は「要確認」としている(数値の推測・古い情報での穴埋めはしていない)。
- コンテンツには「フルおまかせ型」と「データ持ち込み型」の2軸を設けている。即日発送が実現できるかは業者の処理速度よりも、発注者側が宛名リスト・デザインデータをどれだけ事前に用意できているかに左右される、という視点を反映するため。

### 公開前に必ず確認すること(TODO)

各カテゴリーJSONの `todos` フィールドにも同内容を記載しているが、サイト全体に関わる項目をここにまとめる。

- [ ] ラクスル「最短当日発送」の正確な条件(データ入稿締切時刻、対応エリア等)を公式サイトで確認
- [ ] 「ラクスルDM便」と「ラクスルダイレクトメール(一般プラン)」が同一サービスか別プランか確認
- [ ] 単価情報(45円〜 / 56.1円〜など)を公式サイトの最新表示で確認
- [ ] セルマーケ・NEXLINK等がA8.net/ValueCommerceに広告主登録されているか、管理画面で確認
- [ ] 参考掲載4社の一次情報(速度・最低依頼数・単価帯・API連携・リストレンタル可否・対応エリア)を公式サイトで確認し、`values` の「要確認」を埋める
- [ ] ラクスルの公式URL・ValueCommerce経由のアフィリエイトリンクを発行し、`raksul` プロバイダーの `officialUrl` / `affiliateUrl` に設定
- [ ] 広告LP(`/lp/dm/`)の `hookNote`(「見積もり〜注文完了が最短1日に短縮」)を公式情報で最終確認し、`hookVerified: true` にする
- [ ] 商標「SOKUNOBANK」の正式確認(J-PlatPat)

料金・納期の数値は変動するため、**推測や古い情報で埋めない**こと。ビルド時、`lastVerifiedAt` が未設定のカテゴリーや `hookVerified: false` のLPについては警告ログを出す(`npm run build` のコンソール出力を確認)。

---

## 運営者情報の秘匿

サイトを辿って運営者が特定の個人であると外部から判明しないよう、以下を徹底している/徹底すること。

- 運営者情報・お問い合わせ先には屋号「SOKUNOBANK運営事務局」を使用し、個人の本名・住所・電話番号は掲載しない(`src/pages/about.astro`, `src/components/Footer.astro`)
- お問い合わせ用メールアドレスは `contact@example.com` のプレースホルダーになっている。**公開前に実際の事業用メールアドレスに差し替えること**(個人の普段使いのメールアドレスは使わない)
- HTMLメタデータ(`<meta name="author">` 等)に個人名・個人メールアドレスは含めていない
- 画像・PDF等を追加する場合は、EXIF等のメタデータに個人を特定できる情報(撮影者名・GPS位置情報等)が残らないよう、掲載前に確認すること
- Gitのコミット履歴は本プロジェクト専用のユーザー名・メールアドレスをローカル設定済み(`git config --local`、`user.name = "SOKUNOBANK運営事務局"`, `user.email` はプレースホルダー)。**`user.email` は実際の事業用メールアドレスに差し替えること**。グローバル設定は変更していないため、他のリポジトリには影響しない
- ドメイン登録時は、レジストラのWHOIS情報公開代行(プライバシープロテクション)を必ず有効にすること(実際の登録作業はユーザー本人が行う)

### 前提として理解していること

- ValueCommerceへの登録自体(本人確認情報の提出)は法律上必須のため対象外
- ValueCommerce経由の通常の仕組みでは、広告主(ラクスル)に個々のアフィリエイターの個人情報が直接開示されることはない。上記の対応は、あくまで「サイトから辿って外部の第三者が個人を特定できる経路」を塞ぐためのもの

---

## ディレクトリ構成

```
src/
  data/
    schema.ts              # カテゴリー横断の型定義
    loadCategories.ts       # カテゴリーJSONの読み込みヘルパー
    categories/
      dm.json               # DMカテゴリー(公開データ)
      printing.json         # 将来カテゴリー追加用の空テンプレート(draft)
  layouts/
    Layout.astro
  components/               # すべてカテゴリー非依存
    Header.astro
    Footer.astro
    Hero.astro
    Disclaimer.astro
    ComparisonTable.astro
    ProviderCard.astro
    ProcessSteps.astro
    ReaderPathways.astro
    CtaButton.astro
  pages/
    index.astro              # トップページ(公開カテゴリー一覧)
    about.astro               # 運営者情報
    categories/[slug]/index.astro   # カテゴリー比較ページ
    lp/[slug]/index.astro           # カテゴリー広告LP(noindex)
```

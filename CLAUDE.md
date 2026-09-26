# このプロジェクトでの作業ルール

## 言語
- ユーザーへの指示出し・確認・質問・作業報告は、すべて**日本語**で行うこと。
- コード中のコメント・コミットメッセージも日本語を基本とする(既存の英語コメントは無理に統一しなくてよい)。
- コード自体(変数名・関数名など)は通常通り英語でよい。

## 事業方針(カテゴリー横断で適用)

- 各カテゴリーでは**メイン事業者を1社(isPrimary: true)に定め、そこへの送客を主軸**とする。DMカテゴリーではラクスルがこれにあたる。
- メイン事業者以外は**比較・信頼性のための参考情報としてのみ掲載**し、アフィリエイトリンク等の送客導線は付けない。
- 広告LP(`/lp/<slug>/`)のCTAは常にメイン事業者(`lp.ctaProviderId`)のみを対象とする。参考事業者向けのCTAは作らない。
- 新しいカテゴリーを追加する際も、この「メイン1社+比較参考複数社」の構成を踏襲する。
- 参考掲載企業(メイン以外)の `description` には、**「比較・信頼性のための参考情報として掲載」のような社内向けの編集方針メモを書かない**。利用者に見える文章には、その企業に関する事実(何をしている会社か等)のみを書き、確認が取れていなければ `description` 自体を省略する。

### ラクスルDM「スピード優先/コスト優先」の重要な区別(2026-09-23判明)

ラクスルのDM発送には**プランが2種類**あり、混同すると誤った情報になる。

- **スピード優先**:納期重視・料金は高め。少部数なら最短当日発送を狙える(部数が多いほど納期は延びる。例:10万通規模で目安6営業日)
- **コスト優先(ラクスルDM便)**:料金重視・納期は長め。**「ラクスルDM便」という名称は、このコスト優先プランを指す**のであって、最速のプランではない

即納バンクは納期優先のサイトなので、比較表・LP・FAQ等で速度を語る際は常に**スピード優先プラン基準**で記述し、「ラクスルDM便=最速」という誤解を招く表現をしない。仕様(はがき/封筒等)ごとの単価・納期は `Provider.formatOptions`(`schema.ts`)に持たせ、`FormatOptionsTable.astro` で表示する。はがき・A4大判はがきは即納向けに推奨、OPP封筒系は納期が長い(目安12営業日)ため推奨しない。

ラクスルのWEB発注手順(テンプレートページ・商品ページの実URLを含む)は `Provider.webOrderSteps`(`ProcessStep[]` を再利用、`href`/`hrefLabel` 追加)に持たせ、カテゴリーページでメイン事業者のものだけ自動表示される。新しいメイン事業者・カテゴリーでも同じ仕組みを使う。

**定期監視**:ラクスル公式サイトの料金・納期は変動するため、毎週月曜9時に自動チェックのスケジュールタスク(`check-raksul-dm-pricing`)を設定済み。差分が見つかった場合はタスクからの報告を確認し、ユーザーの承認を経てdm.jsonを更新すること(タスク自体は自動でコードを変更しない)。

## Amazonアソシエイト連携ルール(2026-09-23 審査完了・実装開始)

トラッキングタグ: `sokunobank-22`。180日ルール(3件以上の販売が必要)の期限: **2027-03-22**。

- Amazonへの送客は「レジ横」方式のみ。独立したAmazonカテゴリー・比較ページ・商品一覧・バナーは作らない
- 各専業サービスの記事内で、文脈が自然な箇所にのみテキストリンクを挿入する(実装例: [dm-self-shipping.astro](src/pages/guides/dm-self-shipping.astro))
- リンク形式は検索結果ページのみ:`https://www.amazon.co.jp/s?k=<キーワード>&tag=sokunobank-22`。PA-API/Creators APIは**使わない**(価格・在庫・配達日はAmazon側に委ねる)
- **商品画像は検索結果から取得・自社ホスティングしない**(Amazon運営規約違反。画像はCreators API等の公式手段でのみ使用可)。代わりに、既存デザインシステムに合わせた線画アイコン(SVG、`--color-accent-soft` 背景+`--color-accent-vivid` の36pxアイコンバッジ、`CategoryCard.astro` と同じパターン)を使う
- Creators APIは**直近30日で10件以上の販売実績**がないと利用できない(取得後も実績が切れると自動停止)。この条件を継続的に満たすようになるまでは、上記アイコン運用を続ける
- 2027年3月が近づいても対象アソシエイトタグでの売上実績が確認できない場合は、180日ルールによるアカウント閉鎖リスクをユーザーに知らせること

## APIキー・アフィリエイトIDの管理ルール(2026-09-26 導入)

Yahoo!ショッピング(Yahoo!デベロッパーAPI)・ValueCommerceなど、APIキーやアフィリエイトIDを扱う際は以下を厳守する。

- **ローカル開発**:`.dev.vars`(Wranglerが自動読み込み)に実値を記載する。このファイルは`.gitignore`済みで、コミットしない
- **本番(Cloudflare Workers)**:`wrangler.jsonc`(または`wrangler.toml`)には実値を書かない。git管理される前提のファイルのため、書くと流出する。代わりに `wrangler secret put <NAME>` で対話式に登録する(Cloudflare側で暗号化保存)。**このコマンドの実行自体はユーザー本人が行う**ため、完了報告やREADMEに「以下のコマンドをユーザー自身が実行する必要がある」旨を明記すること
- **`.env.example`**:変数名のみを記載し、実際の値は絶対に含めない(コミット対象)
- 現在管理対象の変数名:`YAHOO_APP_ID`、`VALUECOMMERCE_AFFILIATE_ID`(値は`.dev.vars`/Cloudflareシークレットのみに存在し、このリポジトリのどこにも実値を書かない)

### 禁止事項
- コード内へのAPIキー・アフィリエイトIDの直書き
- `wrangler.jsonc`/`wrangler.toml` の `vars` セクションへの実値記載
- コミットメッセージ・コメント・ログ出力への値の含有
- クライアントサイドJS(ブラウザで実行されるコード)への値の露出

### 補足
- 別プロジェクト(selected-by)でも同様のYahoo!デベロッパーAPIキー管理パターン(`wrangler secret`)を使っている。ただしsokunobankとselected-byは別リポジトリ・別Workersのため、`wrangler secret put` は**sokunobank側で改めて実行が必要**
- (2026-09-26更新)sokunobankは`output: "hybrid"` + `@astrojs/cloudflare`アダプタ構成。ほとんどのページはビルド時に静的prerenderされるが、`src/pages/api/**`のみ`export const prerender = false`で動的化し、サーバー側でAPIキーを使う(`context.locals.runtime.env`経由)。新しい動的ルートを追加する場合もこのパターンを踏襲する

## commerce系(Yahoo!ショッピング商品ランキング型)カテゴリーの変更禁止事項(2026-09-26 テンプレート化に伴い制定)

`projector`(会議用プロジェクター)を皮切りに、「Yahoo!ショッピングから商品を検索し独自ランキングする」型のカテゴリー(DM型の事業者比較とは別系統、`src/lib/commerce/`配下)が今後増える。この型のカテゴリーに共通して守るべき仕様と作業ルールを以下に定める。新カテゴリー追加の具体的な手順は [docs/new-category-checklist.md](docs/new-category-checklist.md)、設定ファイルのひな形は [docs/category-config-template.ts](docs/category-config-template.ts) を参照。

- **到着希望に「当日」は入れない**。Yahoo!ショッピングAPI経由での当日到着は現実的に成立しづらいため、選択肢・API双方で0(当日)を受け付けない
- 「在庫・配送予定は変動します…」の注意書きを商品一覧の**上と下**に表示する(現状:hero内の`delivery-note`が上、`Disclaimer`コンポーネントが下)
- PR表記とアフィリエイト開示を必ず表示する(広告バナーには「PR」ラベル、フッターにアフィリエイト開示文)
- **ValueCommerceのYahoo!ショッピングアフィリエイトバナー(PC用`pcBannerHtml`+スマホ用`mobileOverlayHtml`)を`ads`に必ず設定する**。この型のカテゴリー共通の送客導線であり、特定カテゴリー専用の任意項目ではない。新カテゴリー追加時に省略しない(タグは`projector.config.ts`のものをそのまま複製して使う。規約上コード自体の改変は禁止のため書き換えない)。2026-09-26、胡蝶蘭ページでこの項目が省略されていたことが発覚したため明文化した
- Amazon商材はメインの比較対象にしない(既存のAmazonアソシエイト連携ルールと同じ方針。commerce系カテゴリーもYahoo!ショッピングが主軸)
- 秘密情報(Yahoo! Client ID、バリューコマースのsid/pid等)はコード・設定ファイルのどちらにも書かない。`.dev.vars`(ローカル)/Cloudflare Secrets(本番)のみを使う
- 既存カテゴリー(projector等)のURL・文言・metaは、ユーザーの明示的な指示がない限り変更しない
- 共通テンプレート(`src/components/commerce/CommerceCategoryPage.astro`・`src/lib/commerce/handleProductsRequest.ts`・`src/components/commerce/CommerceFilterPanel.astro`・`ProductGrid.astro`等)を修正したときは、`npm run test`で全カテゴリーのスナップショットテストを実行し、既存カテゴリーの出力が変わっていないことを確認してから次の作業に進む
- このセクション自体のルールは、ユーザーの指示がない限り変更しない
- デプロイ(`wrangler deploy`)はユーザー本人が行う。Claudeはデプロイコマンドを実行しない(リポジトリ全体のルールと同一だが、commerce系の作業でも徹底する)

## SEO / AI検索最適化(GEO)ルール(2026-09-23 導入)

「検索エンジン」だけでなく「ChatGPT等のAI回答エンジンに引用・選定される」ことも最適化目標に含める。

- `astro.config.mjs` の `site: "https://sokunobank.com"` を必ず維持する(canonical URL・sitemap生成に使用)
- `public/robots.txt`:GPTBot / ChatGPT-User / OAI-SearchBot / PerplexityBot / ClaudeBot / Google-Extended 等の主要AIクローラーを明示的に許可する。新しいAIクローラーが登場したら追記する
- `public/llms.txt`:サイト概要・主要ページ・注意事項をMarkdownで要約したAI向け案内。**新しいカテゴリー・ページを追加したら必ずここにも追記する**
- `src/pages/sitemap.xml.ts`:静的ページ+公開カテゴリーを自動集計する動的生成。カテゴリー追加時の変更は不要だが、`guidePaths` の配列だけは新しいガイド記事追加時に手動追加が必要
- `Layout.astro` で全ページ共通の `canonical` / OGP / Twitter Card / `WebSite`・`Organization` JSON-LDを出力済み。個人名は一切含めない(`Organization` は屋号「SOKUNOBANK運営事務局」のみ)
- カテゴリーページ:`CategoryData.summary`(1〜2文の結論)を `SummaryBox.astro` で比較表より前に表示する。**単独で読んで意味が通る、直接引用できる文章にする**(AIが抜き出して回答に使うことを想定)。新しいカテゴリーを追加したら必ず `summary` を書く
- `ProcessSteps.astro` は `HowTo` 構造化データを自動出力する。`FaqSection.astro` は `FAQPage`、`Breadcrumbs.astro` は `BreadcrumbList` を自動出力済み。新しい記事ページを追加する場合は `Article` 構造化データ(`headline`/`description`/`datePublished`/`author`/`publisher`)も追加する(実装例: [dm-self-shipping.astro](src/pages/guides/dm-self-shipping.astro))
- 比較表の「要確認」は欠落ではなく「未検証であることの明示」である旨を `llms.txt` に明記している。AI側に誤って「情報がない」と解釈されないようにするため、この位置づけを崩す表現に変えない
- **運営者匿名化との兼ね合い**:E-E-A-T(専門性・権威性・信頼性)の観点では実名の著者情報があった方が有利だが、本プロジェクトは「運営者情報の秘匿」を優先方針としている(本ファイル冒頭・README参照)。個人名を出さずに信頼性を担保する(一次情報の出典明記、「要確認」の透明性、屋号での一貫した発信)方針を継続する

## ロゴ・favicon運用(2026-09-23 実装)

マスターロゴ: `public/images/sokuno-bank-logo.png`(1254x1254、フルカラー・グラデーション版、文字入り)。ユーザー本人が配置。

- **ヘッダー**(横長スペース):文字入りフルロゴのうち、マーク+「SOKUNOBANK」英字部分のみを横長にクロップした `public/images/header-logo.webp` を使用(「即納バンク」の日本語サブテキストと上下の余白は除外。表示高さ40px)
- **フッター・favicon等**(狭いスペース):マーク単体(S+B+虫眼鏡、速度線含む、テキストなし)を正方形にクロップした `public/images/logo-mark.webp` / `public/favicon*` を使用
- **favicon一式**:`public/favicon.ico`(16x16+32x32のマルチサイズ、Node標準ライブラリで手組み生成。外部パッケージ不使用)、`favicon-16x16.png`、`favicon-32x32.png`、`apple-touch-icon.png`(180x180)。すべてマスターロゴからマーク単体を切り出して生成
- **OGP画像**:`public/ogp.png`(1200x630、文字入りフルロゴを白背景に中央配置)。`Layout.astro` の `og:image`/`twitter:image` で全ページ共通利用
- マスターロゴの元画像は正方形(マーク+英字+和文が縦積み)のため、ヘッダー用の横長クロップは座標を手動で特定して実施した。**ロゴを差し替える場合は、切り出し座標を再計算すること**(スクリプトはこのセッションの作業ログを参照)
- **フルカラー版のみ現状提供されている。単色版(白黒)は別途デザイン側で用意予定のため、コード側で自動色変換して代用しない**こと

## デザインルール(2026-09-22 全面リニューアルで確立)

コンセプト:「価格.com × BtoB SaaS比較サイト × 即納サービス」。法人担当者が仕事中に使う検索・比較ツールであり、
企業サイトでもブログでもない。**装飾 < 検索性 < 比較性 < 意思決定のしやすさ**の優先順位を常に守ること。

### トークン(すべて `src/layouts/Layout.astro` の `:root` に集約。値を変える場合は必ずここを直す)

- 背景:`--color-bg` #FFFFFF / `--color-bg-soft` #F3FAF6 / `--color-bg-soft-2` #EDF8F1(2026-09-23:より明るいグリーン寄りのトーンに調整)
- テキスト:`--color-text` #10243E(ダークネイビー) / `--color-text-muted` #5B6B80
- 罫線:`--color-border` #DCEEE4
- ブランドアクセント(グリーン、2026-09-23調整):`--color-accent` #108A5F / `--color-accent-dark` #05815B / `--color-accent-soft` #E3F7EC / `--color-accent-vivid` #0C9A66
  - `--color-accent` / `--color-accent-dark` は白文字ボタンやリンクテキストにも使うため、白背景に対してそれぞれ約4.35:1 / 4.89:1のコントラスト比を確保している。**この2つの値を変える場合は必ずコントラスト比を再計算すること**(`node -e` でWCAG相対輝度を計算するスクリプトをこれまで使用)
  - `--color-accent-vivid` はテキストを乗せない装飾専用(アイコンのstroke、グラデーション背景など)。白背景に対し約3.6:1(非テキストの下限3:1をクリア)。ボタンやリンクの文字色には使わない
- **即納・緊急性の強調(オレンジ)**:`--color-urgent` #F59E0B系。**「最短当日」「本日発送」など即納に関係する情報だけに使う**。装飾目的で多用しない
- 角丸:6〜10px(`--radius-sm/md/lg`)。過度に丸くしない
- シャドウ:`--shadow-sm` のみ、非常に弱く
- コンテナ幅:`--container-width` 1200px
- フォント:Noto Sans JP + Inter(Google Fonts、Layout.astroでpreconnect+読み込み済み)。見出し600〜700、本文400〜500

### コンポーネント規約

- ボタンは共通クラス `.btn` `.btn-primary`(ティール)`.btn-secondary`(アウトライン)`.btn-disabled` を使う。個別コンポーネントでボタンCSSを再定義しない。高さ44px、`.btn-lg`は48px
- カードは `.card`、チップ(キーワード等)は `.chip`(`.is-disabled`で非活性)、バッジは `.badge`(メイン事業者用)と `.badge-urgent`(即納強調・オレンジ)、`.badge-soon`(準備中)を使い分ける
- 比較表は `ComparisonTable.astro` を使い、`table.responsive-table` クラスでモバイル時にJSなし(CSSのみ)でカード表示に変換する。新しい比較データを出す時もこのコンポーネントを再利用し、独自の表を作らない
- 条件検索は `ComparisonFilter.astro` + `provider.facets` + `category.filterFields`(schema.ts参照)で実装。値が不明な項目は絞り込みで除外せず常に表示する設計(誤って対象外に見せない)
- パンくずは全ページ `Breadcrumbs.astro` で統一(BreadcrumbList構造化データも自動出力)
- 未公開のリンク先(将来カテゴリー・関連記事など)は**リンクを張らず「準備中」(`.badge-soon`)表示にする**。存在しないページへのリンクは作らない
- モバイルメニューは `<details>/<summary>` によるJS不要の実装を維持する(不要なJSを増やさない方針)
- クリック領域は44px以上を確保する(チップ・ナビリンク・フィルタ操作すべて)

### 避けるべきこと(ユーザー指定)

派手なLP、安売りEC風、金融機関のような重いデザイン、過度なグラデーション・アニメーション、意味のない大きな写真、
カードを大量に並べただけのUI、AI生成サイト特有の過剰な丸角。

### 写真背景の例外運用(2026-09-23〜)

上記の「意味のない大きな写真」禁止の原則は維持しつつ、**トップページのヒーローセクションに限り**、
ユーザーが用意したバナー画像を背景に使うことを認めている(現状 `public/images/hero-banner.webp`)。
今後同様の画像を追加・差し替える場合は以下を必ず守ること。

- 元画像がPNG/JPEG等で重い場合は、`sharp` で **WebPに変換して軽量化**してから `public/images/` に配置する(元の重いファイルはコミットしない)
- 背景画像は **PC(900px以上)のみ表示し、モバイルでは非表示**にする(通信量・表示速度・情報量のバランスを優先。モバイルは装飾より軽さ・コンパクトさを優先する)
- テキストが乗る側は白系グラデーションを重ねて、見出し・検索欄の可読性を必ず確保する
- ユーザーから参考画像・モックアップを提示された場合は、実装前に**実在する他社サイトかどうかを確認する**(商標・名称衝突リスクの点検のため)

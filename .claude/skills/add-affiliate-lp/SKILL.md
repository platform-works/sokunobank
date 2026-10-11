---
name: add-affiliate-lp
description: SOKUNOBANK の「ASP(A8.net等)アフィリエイト広告LP」を新規に作る手順と設計図。Up-T(オリジナルプリント、/lp/original-print/)で確立したパターン — 商品選択UI(PCプルダウン+検索/スマホ画像ボタン)、回答連動コピー、A8広告コードの原文保持、商品マスター、画像のWebP/AVIF変換とマスター管理、GA4計測、サイト内導線(トップバナー・ヘッダー・記事内リンク)、公開前チェックを扱う。ユーザーが「◯◯のLPを作って」「広告LPを追加」「Up-Tと同じ形で」「ASPの広告主の送客ページを作りたい」「ランディングページを作成」と言ったとき、または既存LPに商品を足す・導線を足すときに使う。Yahoo!ショッピング商品ランキング型カテゴリーの追加は add-yahoo-shopping-category、ValueCommerceバナーの設置は embed-valuecommerce-banner を使う(このスキルはA8等のASP広告主の送客LP用)。
---

# ASPアフィリエイト広告LPの作成(Up-Tパターン)

最初の実装: `src/pages/lp/original-print.astro`(2026-10-11)。以下は、その作業で確立した設計と、実際に踏んだ落とし穴。

## 0. 着手前に確認すること(ユーザーに聞くのは1回でまとめる)

1. **広告コード**: A8管理画面の素材(ID・種別・サイズ)。ユーザーがCSVを `docs/` に置く運用(例: `docs/upt_ads_1_15_74.csv`)。スプレッドシートは非公開(401)で読めないため、CSVか貼り付けを依頼する。**アカウント台帳など他シートは読まない・貼らせない**
2. **広告主規約**: NGワード、画像・表現の制限、テキスト広告のボタン化の可否は、こちらでは確認できない。ユーザーにA8の案件ページ(レギュレーション)の確認を促す
3. **広告主の公式情報**: 商品名・取扱カテゴリ・納期・料金は公式で確認できた事実のみ書く。**公式サイトが取得できない場合は `verified: false` で保持し、画面に「公式で確認」と明記する**。二次情報(プレスリリース引用記事等)の数値は使わない
4. **写真素材**: 商品写真・利用シーン写真はこちらでは用意できない。無ければ自作のイメージ図(SVG)を「実際の商品写真ではありません」と明記して使い、差し替え口(`uses[].image`)を残す

## 1. ファイル構成(Up-Tの実例)

| 役割 | ファイル |
|---|---|
| ページ | `src/pages/lp/<slug>.astro`(`noindex`。既存の `/lp/[slug]/` より静的ルートが優先される) |
| 広告コード原文 | `src/data/lp/<name>-ads.ts`(CSVから機械転記。`JSON.stringify`で文字列化し、手で書き写さない) |
| コピー・質問・案内文 | `src/data/lp/<slug>.ts`(`QUESTIONS`、`HEADLINE_BY_ANSWER`、`buildGuide()`、`FAQ_ITEMS`) |
| 商品マスター | `src/data/lp/<slug>-products.ts`(`publish` / `verified` / `keywords` / `uses` / `design` / `checks`) |
| イメージ図 | `src/data/lp/product-art.ts` |
| 画像変換 | `scripts/build-lp-images.mjs <lp名>` |
| 画像マスター | `assets/lp-master/<lp名>/`(原寸・`manifest.json`・生成される`index.html`) |
| 画像出力 | `public/images/lp/<lp名>/`(WebP/AVIF、複数幅) |

## 2. 広告コードの扱い(最重要・規約違反で提携解除のリスク)

- コード(URL・`a8mat`・1x1計測画像を含む)は**一切改変しない**。文言も変えない(テキスト広告のリンク文言は素材のまま)
- 描画は `set:html={RAW}` のみ。Astroテンプレート構文で書き直さない(`data-astro-cid-*`が付く)
- **Astroでは `<template set:html>` を使わない**。内容が文書末尾へ出力され、条件式つきだとビルドが停止した。バナーは `<script type="text/plain" data-variant="pc|mobile" set:html=…>` に入れ、画面幅で**該当する方だけ**を `innerHTML = textContent` で挿入する(二重描画・二重インプレッション防止)
- PC用(例: 728×90)とスマホ用(例: 300×250)は別素材。720px以下でスマホ用
- テキスト広告をボタン風にするのは親要素のCSSのみ(`.ad-button :global(a) {…}`)。**文言は変えられない**ことをユーザーに伝える
- 広告主の公式URL(`https://…/`)は**直リンクにしない**(A8の計測を通らず成果が付かない)。ドメインは文字表記のみ
- 検証時にタグ内URLをcurlで叩かない。確認は built HTML を `includes(原文)` で照合する
- 同じ素材を複数箇所に置く場合も、GA4の `ad_position`(hero/guide/footer)で区別する

## 3. 画面設計(モック準拠・スマホ最優先)

- ファーストビュー: **PR表記を先頭**に置く。見出し(商品名連動)→サブコピー(直近の回答連動)→画像→選択フォーム→メインCTA(広告コードのボタン)
- 質問: デザイン有無 / 商品 / 納期 / 数量。Q1・Q3・Q4はチップ(ラジオ)。選択済みはチェック付き
- **商品選択**: PC=階層(グループ見出し)+検索つきのコンボボックス(矢印・Enter・Esc、`aria-activedescendant`)。スマホ=グループタブ+3列の画像ボタン+「すべてのアイテムから選ぶ」(6件→全件)。選択中はチェック+強調枠。**選択してもフォームの他の回答をリセットしない**
- キーワード流入(`?item=` / `?intent=` / `utm_term` 等)で**商品が1つに特定できるときだけ**初期選択。曖昧(複数一致)なら選ばない。ユーザーの選択を常に優先
- 中段: 商品に連動して 商品名・紹介・デザイン方法・チェックポイント・利用シーン を切り替える。高さが大きく変わらないよう `min-height` とカード構造を固定
- 最下部: 紹介先の情報(名称・サービス・ドメイン表記・確認事項)+バナー(最後の念押し)
- ファーストビューの主要画像は遅延読み込みしない(`fetchpriority="high"`)。`<picture>`でAVIF/WebP、`srcset`/`sizes`/`width`/`height`を指定
- 背景画像はPCのみ(軽さ優先の既存方針)。左端は mask で背景へなじませ、フォームと人物が重ならないようにする

## 4. コピーの禁止事項(事業方針)

- 納期を計算・保証しない。「発送日と到着日は別」「商品・数量・配送先・注文確定時刻で変わる」「公式で確認」を併記
- 使用日を入れさせる場合も、出すのは暦日の残り日数だけ(納期の目安ではないと明記)
- 割引・最短日数・「1枚から」等、公式未確認の事実は書かない。公式で確認できない商品は `publish: false`
- 見積もり依頼は主導線にしない。メイン事業者1社のみ(他社へのCTAを作らない)
- 利用者に見える文章に社内メモ(「比較のため掲載」等)を書かない

## 5. 計測(既存の関数のみ。`Layout.astro`は変更しない)

- `window.sokunobankTrackEvent(name, params)` を使う(空値は自動で省略される)。UTMは `sokunobankGetAttribution()` で付与
- **`sokunobankTrackOutboundClick` は使わない**(Yahoo!広告の離脱クリックCVを発火してしまう。使うかはユーザー判断)
- イベント: `lp_select`(question/answer)、`product_selected`(product/product_group/source)、`upt_ad_click`(ad_id/ad_type/ad_position/…)、`lp_guide_open`、`promo_click`(promo/placement)
- 値は固定IDのみ。日付そのもの・自由入力・個人情報は送らない(日付は `within_7` / `8_to_14` / `15_plus` の区分)
- 広告クリックは document の capture リスナーで取得し、`preventDefault`・自動クリック・リダイレクトをしない
- 導線(ヘッダー・記事・フッター・トップバナー)のクリックは `Header.astro` の共通ハンドラーが `data-promo` / `data-placement` で計測する。個別コンポーネントに別ハンドラーを足すと二重発火する

## 6. サイト内導線(LPへ送客する)

- トップ: `UptPromoBanner.astro`(ヒーロー直下の大型カード、PR・広告表記)。`site-nav.ts` のキーワード/目的/部署にも `(PR)` 付きで追加
- ヘッダー: 常時ボタン(PC「Tシャツ・グッズを作る」/スマホ「Tシャツ作成」+PR)。**ヘッダーはもともと `position: sticky` で追従する**
- 記事内: `UptTextLink.astro`(`placement`を渡す)。文脈が自然な記事(ノベルティ・採用パンフ等)にだけ置く。独立の比較ページは作らない
- 広告LPは `noindex`・sitemap/`llms.txt` 対象外。新しいindex対象URLは増えないことを報告する(CLAUDE.mdのSEOポリシー)

## 7. 画像運用

1. マスターを `assets/lp-master/<lp>/` に原寸のまま置き、`manifest.json` に `source` / `license` / `usage` / `widths` を記録
2. `node scripts/build-lp-images.mjs <lp>` で WebP/AVIF(960/1672等)を生成。**元より大きい幅は生成しない(拡大しない)**
3. 管理者向け一覧 `assets/lp-master/<lp>/index.html`(プレビュー・原寸ダウンロード・出典・ライセンス)が生成される。マスターはWebに公開されない
4. 生成画像・ユーザー提供画像は、実在する広告主の商品写真・制作実績と誤認させない。提供元の利用条件が不明なら `license: 要確認` と記録する

## 8. 検証(実装後に必ず実施・報告)

1. `npm run build` → `npm test`。**共通テンプレート(Header/Footer等)を変えるとprojectorのスナップショット(`bodyText`)が変わる**。差分が意図した追加分だけであることを確認してから更新し、報告する(テストを合わせにいくのではなく、差分を説明する)
2. built HTML: 広告コード原文一致、`text/plain`外の `a8mat` 数(= テキスト広告の2のみ)、公式URL直リンクが無いこと
3. ブラウザ(PC 1280・スマホ 375・320): 横スクロール無し、ヘッダー重なり無し、5商品以上で 見出し・紹介・用途・チェックポイントが連動、タブ/「すべて」展開、キーボード操作、`product_selected` / `upt_ad_click` が発火、`yss_conversion` が0件
4. 広告リンクの遷移は検証側で `preventDefault`(`window.addEventListener('click', …, false)`)して実クリックを発生させない
5. スクリーンショットが取れない時は、JSで要素の位置・高さ・表示を数値で確認する

## 9. 落とし穴(実際に踏んだもの)

- ビルドが「Building hybrid entrypoints」で止まる → `<template set:html>` が原因だった。止まったプロセス(`astro build` のnode)が残るので、PowerShellで該当PIDを確認して終了してから再ビルドする
- `dev` サーバー起動中に `npm run build` を走らせると競合することがある → `preview_stop` してからビルド
- Git Bash で `echo "/$u"` のように先頭が `/` の文字列は `C:/Program Files/Git/…` に変換される(表示だけ。curlのURLは `$B/$u` で組む)
- `git add` に削除済みファイルのパスを渡すと `&&` 連鎖が止まり、コミットされないままデプロイが走る → `git add -A <dir>` を使い、デプロイは別コマンドで結果を確認する
- デプロイ直後の数秒〜十数秒は旧版が返る(キャッシュ)。1回の旧版/404で失敗と判断しない
- CRLF: このリポジトリはCRLF。文字列置換で改行コードを失わないよう、ファイルの改行を検出して書き戻す
- 非表示(`display:none`)の要素の背景画像は読み込まれない。スマホ専用画像はこれを利用して通信量を節約できる
- 回答の「商品」を `<select>` にするとモックの見た目と合わない → チップ(ラジオ)+PC用コンボボックスにした経緯。モック画像が来たらまずモックに合わせる

## 10. デプロイ・運用ルール

- コミット・デプロイは、ユーザーが「コミットして」「デプロイして」と明示したときだけ実行する(`wrangler deploy` の前に `npm run build` と `npm test`)
- デプロイ後、本番URLが200であること・追加した要素がHTMLにあることを `curl` で確認し、広告ページは何度も開かない(インプレッションとして計測される)
- 公開後、A8の「広告掲載URL管理」への掲載URL提出はユーザー本人の作業。報告で必ず伝える
- 新しいASPを使う場合は CLAUDE.md の「現在利用しているASP」に追記する

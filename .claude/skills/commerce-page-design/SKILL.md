---
name: commerce-page-design
description: SOKUNOBANK の「Yahoo!ショッピング商品ランキング型」ページ(発電機・シュレッダー・プリンター・複合機など、src/lib/commerce と src/components/commerce 配下)のページ設計と拡張機能の設計図。発電機ページの STEP 選択・容量計算・安全情報・折りたたみ、ProductGrid の variant 拡張ポイント、説明つき広告セクション(sponsoredSection)、取得件数の設定、ガイド記事との内部リンク設計を扱う。商品カードやフィルターを変更するとき、generator ページを直すとき、既存カテゴリーに機能を足すとき、別カテゴリーへ同じ機能を展開するときに使う。新カテゴリーの追加手順そのものは add-yahoo-shopping-category、ブランドカードは add-popular-brand-section を使う。情報系サイト(pharmabank 等)や DM 型(事業者比較)には使わない。
---

# 商品ランキング型ページの設計図

各ページが「なぜ今の形なのか」と、機能を足すときの決まりごとをまとめる。新カテゴリー追加の手順は `add-yahoo-shopping-category`、ブランド導線は `add-popular-brand-section`、広告タグの一般ルールは `affiliate-tag-handling`、事実確認の一般ルールは `content-source-check`、GA4 の一般ルールは `ga4-event-design` を使う。ここには、このサイト固有の設計だけを書く。

## 1. ページは3層で考える

| 層 | 実体 | 使うカテゴリー |
|---|---|---|
| 標準テンプレート | `CommerceCategoryPage.astro`(設定ファイルを渡すだけの薄いページ) | projector / orchid / monitor / office-chair / shredder / printer |
| 設定による拡張 | `popularBrands`、`sponsoredSection`、`candidatesTargetCount`、`maxDisplayCount`、`sortOptions` | カテゴリーごとに任意 |
| 専用ページ | `src/pages/categories/generator/index.astro` と `components/commerce/generator/*` | generator のみ |

**共通テンプレートを変えたくないときは、専用ページを作る**(generator がそう)。共通ファイル(`CommerceCategoryPage` / `ProductGrid` / `CommerceFilterPanel` / `handleProductsRequest`)を変えたら、必ず `npm run test` と、他カテゴリーのビルド出力が変わっていないことを確認する。

標準テンプレートの表示順: hero(+PCバナー) → ブランドカード(任意) → 絞り込みパネル → 説明 → 商品一覧 → 注意書き → **説明つき広告セクション(任意)** → 選び方 → FAQ。

## 2. ProductGrid の拡張ポイント(variant)

`ProductGrid.astro` は全カテゴリー共通。カテゴリー固有の挙動は `variant` プロップ(例: `variant="generator"`)と `window.sokunobankCardExtensions[variant]` に登録したオブジェクトで足す。`variant` 未指定、または未登録なら従来どおりで、他カテゴリーには影響しない。**共通ファイルに `if (slug === "generator")` のような分岐を書かない。**

拡張オブジェクトが持てる関数(すべて任意):

- `decorateCard(p, bodyEl, ctx)` — カードに行を追加する(例: ブランド・容量・出力)
- `deliveryText(p, ctx)` — 配送表示の差し替え。文字列を返せば採用、`null` なら既定
- `trackParams(p, ctx)` — `outbound_product_click` に足すパラメータ
- `filterProducts(products, ctx)` — 取得済みの商品をクライアント側で絞る
- `emptyMessage(ctx)` — 絞り込みで 0 件のときの文言
- `afterRender({root, shown, total}, ctx)` — 描画後の処理(注記の挿入など)
- `ctx.params` は直近の取得条件(`area` など)。再描画だけしたいときは `document.dispatchEvent(new CustomEvent("commerce:rerender", {detail:{slug}}))`

登録は `src/lib/commerce/generatorClient.ts` の `registerGeneratorExtension()`(`GeneratorRuntime.astro` が1回だけ呼ぶ)。**登録を複数箇所で呼ばない**(クロージャが別になり状態がずれる)。

## 3. generator ページの設計

表示順(上から): Hero(H1・更新日・PRバナー) → **STEP選択**(お届け先・用途・種類・容量/出力) → お届け先に早く届く商品(4件) → 発電機とポータブル電源の違い(比較表) → 災害・防災用に選ぶ(家電の消費電力の目安) → 必要容量の計算ツール → 出力から選ぶ → 用途別に選ぶ(H3×5) → ブランド → **商品一覧** → 選び方 → 安全情報 → FAQ。

- 比較表〜ブランドは `FoldSection.astro` で包む。**サーバーでは常に `<details open>` を出力**(初期HTMLに本文が残る)し、スマホ幅(720px以下)のときだけ `index.astro` のインライン script が `open` を外す。PC は全部開いたまま。スマホで商品一覧までの距離が約15,000px→約2,300pxになった。絞り込みパネルの開閉と `PickupBrandSection` の開閉も同じ方式。
- 専用ページにする理由: 共通テンプレートを変えると他4カテゴリーに波及するため。
- 構造化データは `WebPage` + `ItemList`(**ページ上に静的に表示している用途別の項目だけ**)。商品は JS で取得するので `Product` / `ItemList(商品)` は出さない。自社販売ではないので `Offer` / `MerchantListing` は使わない。FAQPage / BreadcrumbList は既存コンポーネントが出す。

### STEP 選択とクライアント状態(`generatorClient.ts`)

- 選択状態は1か所(`getSelection` / `setSelection`)。変更すると `generator:selection-change` と `commerce:rerender` が飛ぶ。
- **容量・出力の帯は閉区間**(境界値は両隣の帯に含まれる。「500Wh以下」「1,000Wh以上」の表記と一致させるため)。
- **用途は商品の属性として取れない**ので、商品名に用途語(防災・車中泊・キャンプ・工事・業務用・家庭用など)が書かれた商品だけに絞る。語の一覧は `useCaseKeywords`。推測で分類しない。
- **エンジン式(ガソリン/カセットガス)には容量Whの表記がない**ため、種類と容量は同時に指定できない(`mergeSelection`)。エンジン式を選ぶと容量は解除され、容量ボタンは無効になる。
- 値を商品名から確認できない商品は、絞り込み中は表示せず「N件は表示していません」と注記する(推測で含めない・黙って消さない)。
- 0件のときは、その条件で確認できた範囲(例: 出力 1,800〜5,700W)を案内する(`availableRanges`)。
- お届け先を変えるときは、絞り込みパネルの select を操作して「商品を探す」を押すのと同じ経路にする(取得と計測の経路を増やさない)。

### 容量・出力の抽出(`extractSpecs.ts`)

商品名に**単位付きの明確な数値**があるときだけ拾い、曖昧なら `null`。この関数は文字列としてブラウザへ渡す設計ではなくなった(モジュールとして import する)が、**外部変数に依存しない純関数**のまま保つ。ルール:

- Wh: 値が1種類だけのときだけ採用。複数(拡張バッテリー込み等)は採用しない。`Wh` を出力 `W` と取り違えない。
- W: **ラベル付き(定格出力・連続出力・AC出力・出力)を優先**。「最大」「瞬間」「サージ」の直後は除外。`USB-C出力100W` のような付属ポートは除外。直前が「ソーラーパネル」なら除外。
- ラベルがない場合、**ポータブル電源は「1024Wh/1800W」のように Wh の直後に続く W だけ**採用する。ただし出力が容量の **0.2倍未満なら採用しない**(ソーラーパネルの W を拾う誤検出を実データで確認したため)。直後が USB/PD/ポート/パネルの語なら採用しない。
- ラベルがない裸の W は、**エンジン式(商品名にガソリン・エンジン等がある)**のときだけ採用。
- kVA は W に換算しない(表示のみ。絞り込み対象外)。
- 変更したら `tests/extractSpecs.test.ts` に例を足し、**実データ約340件で目視確認**する(Yahoo API で `発電機` `ポータブル電源` を各2ページ取得し、値が取れた商品を全件見る)。

### 安全情報・家電の消費電力(`generatorContent.ts`)

**確認できた内容だけを載せる。推測や一般知識で補わない。**

- 公的機関のページは**本文を取得して読む**(WebFetch は小さなモデルによる要約なので、サブエージェントの報告もそのまま信用せず、掲載する出典は自分で取り直す)。WebFetch が 403 のサイトはブラウザペインで開く。
- **取得できなかった機関は出典に書かない**(経済産業省のページは 403 で確認できず外した)。出典名は実際に確認した機関だけ。
- 確認できなかったので**載せていない**項目: ガレージ・車庫・軒下の可否、開口部から何mという公的基準、CO濃度の数値、エンジン冷却後の給油、ポータブル電源の純正ケーブル・充電に関する公的機関の注意。載せるなら一次情報を取得して確認してから。
- 各項目に出典機関名を付け、ページに確認日を表示する。家電の消費電力は電力会社等の「想定値・参考値」で機種により異なる旨を添える。スマートフォンは確認できる公的値がないので初期値を空にして利用者に入力させる。電気ケトルはメーカー1機種の値であることを明記。
- 計算ツールの結果は必ず「目安」とし、変換ロスで表示容量すべては使えない旨を添える。

## 4. 計測(GA4)

**新しいイベント名を作らず、既存イベントにパラメータを足す。** 商品クリックは `outbound_product_click`、ブランドカードは `brand_click`(+`outbound_product_click`)、絞り込み操作は `filter_use`。

- generator の `outbound_product_click` に足すパラメータ: `use_case` / `capacity_wh` / `power_w` / `delivery_days` / `shop_name`(取得できないものは送らない)。
- `filter_use` の `filter_name`: `area` / `submit` / `use_case` / `product_type` / `capacity_band` / `power_band` / `capacity_calculator` / `step_confirm`。
- 用途別カードと出力別カードの外部リンクは、既存の `generator_usage_outbound` / `generator_power_outbound` を維持(`use_case`・`link_type` を追加)。特定商品のクリックではないので `outbound_product_click` は発火しない。
- 確認方法: `window.dataLayer` の増分を見る。1回の操作で同じイベントが2回出ていないこと。広告・外部遷移は `preventDefault` で止めて確認する。

## 5. 説明つき広告セクション(`sponsoredSection`)

設定に `sponsoredSection` を書くと、商品一覧の下に「見出し+説明+判断の目安+注記+バナー」が出る(プリンター・複合機が最初の利用者。業務用コピー機の A8.net バナー)。

- `bannerHtml` に渡された広告タグは**1バイトも変えず**(改行・`rel`・サイズ属性を含む)、`set:html` で描画する。ビルド後に `dist/…/index.html` を grep して**原文がそのまま1回だけ**あることを確認する(広告URLにはアクセスしない)。
- 必ず「PR」表記と、広告であること・条件は提供元サイトで確認することを示す `caption` を付ける。
- **広告主名・案件の具体的な内容・料金・実績は書かない**(案件規約を私たちは確認できないため)。書くのは「なぜこのページに置くのか」と「判断の目安」だけ。断定・煽りは避け、選択肢の一つとして示す。
- `active: false` にすると説明ごと出なくなる(案件停止・規約違反が分かったとき用)。
- バナーが固定幅(468px)でスマホ幅より広い場合、タグは改変できないので縮小せず、**枠内だけ横スクロール**にする(ページ全体の横スクロールは出さない)。A8 に狭幅のバナーがあれば差し替える。

## 6. 内部リンクの設計

- 用途別セクションの各用途に、関連する既存ガイドを**1〜2本**リンクする(災害→停電対策、家庭→発電機手配、工事→工事現場の物資、キャンプ→イベント用発電機)。
- 印刷物の記事(チラシ印刷・名刺印刷)は、「本当に急ぎのときは自社で印刷する」節から `/categories/printer/` へリンクする。説明は「最短で用意できる場合がある」と書き、仕上がりの違いも併記する。
- **未解決(触らない・判断待ち)**: 発電機・停電関連の `urgent-*` ガイド7本は検索意図が重なっている。統合・削除・noindex・301は、検索意図・重複・流入・index状況・被リンク・統合候補・301候補を整理した統合案を作り、ユーザーが判断するまで行わない。`urgent-*` 10本は `sitemap.xml.ts` の `guidePaths` に未掲載で、パンくずの `/guides/` 一覧ページも未作成(リンク切れ)。これも統合案とあわせて判断する。

## 7. 現在のカテゴリー設定と根拠

| slug | 検索語の要点 | 足切り | refMax | 取得目標/返却 | ブランド | 備考 |
|---|---|---|---|---|---|---|
| projector / orchid / monitor / office-chair | 各 config 参照 | 各 config 参照 | 各 config 参照 | 既定(100/50) | 一部あり | 標準テンプレート |
| generator | 発電機 / ポータブル電源 | 500円 | 3500 | 200/150 | 6社 | 専用ページ。Yamaha は事業終了のため非掲載 |
| shredder | シュレッダー / 業務用 / オフィス | 200円 | 1600 | 既定 | 4社 | 500円だと62→31件になるため200円 |
| printer | **レーザー複合機**(先頭)/ 複合機 / インクジェット複合機 | 200円 | 1200 | 200/50 | 3社(除外検索) | `sponsoredSection` あり |
| whiteboard | ホワイトボード 脚付き / ホワイトボード | 50円 | 200 | 既定(100/50) | なし | 大型・低報酬。足切りなしで約84件、50円で約43件。200円では4〜5件で成立しない |
| office-desk | **スチール書庫**(先頭)/ オフィスデスク | 150円 | 3000 | 200/100 | なし | デスクと書庫の統合。デスクを先頭にすると書庫が1〜5件しか入らない。オフィスチェアは除外(office-chairと重複) |

ブランド数は「件数が突出した上位だけ」(ストアブランドが大半のカテゴリーには付けない。基準は `add-popular-brand-section`)。足切りは必ず `fetchCandidates` で実測してから決める(カテゴリーごとに報酬の分布が大きく違う)。

### 新カテゴリーを足すときの設計の流れ(2026-10-03〜04 に4カテゴリーで確立)

1. `profile_category.cjs` で候補を評価 → 2. 除外語を `check_filters.cjs` で検証(本体にも併記される語を外す) → 3. `measure_candidates.cjs` で検索語の順序・目標件数・足切り・API回数を決める → 4. 設定ファイルを書く(根拠をコメントに残す) → 5. 登録・導線・`llms.txt` → 6. ビルド・テスト・実機確認 → 7. 報告して「デプロイして」の指示を待つ。詳細は `add-yahoo-shopping-category`。報告には、実測値(件数・足切り・API回数)と、そのカテゴリー固有の注意(大型で件数が少ない・低報酬・ブランド非掲載の理由)を必ず書く。

## 8. テストと確認の手順

- `npm run test`: `tests/projector.snapshot.test.ts`(共通テンプレートの不変確認)、`extractSpecs.test.ts`、`generatorClient.test.ts`。**`ProductGrid.astro` の script を変えると projector の `bodyText` スナップショットが変わる**ので、差分が意図した script だけであること(他のキーが同一)を確認してから再生成する。
- ローカル確認は `.claude/launch.json` の `astro-dev`(`preview_start`)。起動後 10秒ほど待ってから開く。
- 実機で見るもの: 商品が出る(`area=13` で明日到着対象が多い)、`dataLayer` の増分が1回、コンソールエラーなし、スマホ幅で横スクロールなし、PCでは開・スマホでは閉。
- デプロイは指示があったときだけ。デプロイ後は `curl "…?cb=$(date +%s)"` で配信HTMLを確認する(ブラウザは古い画面や一時的な404を出すことがある)。
- この環境では `python` が使えない。ファイルの一括編集は Edit か node スクリプト。**`git stash` などで作業ツリーを動かさない**(未コミットの作業が大量にある)。

## 9. 未実施・次の候補

- Rich Results Test / Schema Markup Validator / Lighthouse(公開URLが必要。デプロイ済みの本番URLで実施できる)
- 重複ガイド7本の統合案、`/guides/` 一覧ページ、`urgent-*` の sitemap 掲載の判断
- 他カテゴリーへのカード拡張(`variant`)の展開
- 商品名から取れない容量・出力を補う正式な手段の調査

# 新カテゴリー追加チェックリスト(Yahoo!ショッピング商品ランキング型)

DM型(事業者比較、`src/data/categories/*.json`)とは別系統の、「Yahoo!ショッピングから商品を検索し独自ランキングする」型カテゴリー(`projector`が最初の実装)を追加する手順。CLAUDE.mdの「commerce系(Yahoo!ショッピング商品ランキング型)カテゴリーの変更禁止事項」を必ず守ること。

## 1. 実データを調査してから設定を書く

新カテゴリーの検索キーワード・除外キーワード・報酬スコアの基準値(`revenueScoreReferenceMax`)を勘で決めない。Yahoo!ショッピングAPIで実際に候補となる検索語を叩き、以下を確認する。

- 想定される`price * affiliateRate / 100`(想定成果報酬額)の分布(中央値・最大値) → `revenueScoreReferenceMax`はここから決める(projectorでは中央値約170円・最大約5,200円に対して3,000を採用。カテゴリーごとに再計算すること)
- 商品説明(`description`/`headLine`)に「お取り寄せ」「予約」等の長納期表記がある商品が混入していないか
- `requiredKeywords`(必須キーワード)で無関係な商品を弾けているか、逆に絞りすぎていないか
- **検索語自体に「法人」「業務用」「オフィス」等の限定語を付けすぎていないか**。実物の商品名にこれらの語がほぼ含まれないカテゴリーでは、限定語付きの検索語がYahoo側の該当件数自体を極端に減らしてしまう(2026-09-26、PCモニターで実際に発生。都道府県を絞ると4件しか出なかった原因は除外条件ではなく検索語だった)。プレーンな商品名の検索語(例:「PCモニター」)と限定語付きの両方をサンプリングし、件数と関連度を比較すること。逆にprojectorの「プロジェクター」のように、限定語なしだと無関係な意味(車のヘッドライト部品・おもちゃ等)の商品が大量に混入するカテゴリーもあるため、どちらが良いかは必ず実データで確認する

**検索語・除外語の検証には `.claude/skills/add-yahoo-shopping-category/scripts/check_filters.cjs` を使う**(除外語ごとの件数とサンプルが出る)。次の落とし穴に注意する:

- 除外語は、一般語の一部にならない具体的な語にする(「ラック」は色名「ブラック」に、「インク」は「インクジェット」に部分一致して本体を誤除外した)
- 検索語の順序: 候補が目標件数に達すると後ろの検索語は実行されない。外したくないセグメントの語を先頭に置く(プリンターは「レーザー複合機」を先頭にした)
- 重複除去(JAN・同名)で、最終件数は取得件数より大きく減る(同じ商品を多数の店が出品している)
- 消耗品が大量にあるカテゴリー(プリンターのインク・用紙など)は、本体にしか出ない語で検索する
- **本体の商品名にも併記される語は除外語にしない**: 出品者は検索語を商品名に詰め込むため、別の商品種を連想させる語が本体にも付く(「本棚」はスチール書庫に、「勉強机」「ゲーミング」は法人向けデスクに、「お絵かき」「マーカー」はホワイトボードに、「配線」「モニター台」はデスクに併記)。`check_filters.cjs` の除外語別サンプルに本体が出たら、その語を外すか具体的な語に変える
- **報酬の外れ値**: 最大の報酬が通常品の数倍なら正体を確認する(ホワイトボードで65インチの電子黒板が報酬3,480円、通常品は最大約200円)。別種の機器なら除外し、`revenueScoreReferenceMax` は外れ値を除いた最大付近にする
- 候補カテゴリーを作る前の評価は `profile_category.cjs`、東京宛ての実際の件数・足切り・API回数の測定は `measure_candidates.cjs`(いずれも `.claude/skills/add-yahoo-shopping-category/scripts/`)
- 大型・重量物のカテゴリーは東京宛ての翌々日判定で件数が少なくなる。FAQに「大型の商品は地域によって翌日到着の対象にならない場合がある」旨を入れる

`docs/category-config-template.ts`のコメントも参照。

## 2. 設定ファイルを作成する

`src/lib/commerce/categories/<slug>.config.ts`を作成し、`CommerceCategoryConfig`型を満たす(`docs/category-config-template.ts`をコピーして埋める)。特に以下は既存の判断を踏襲する(理由はCLAUDE.md参照):

- 到着希望は「明日まで(1)」「翌々日まで(2)」のみ。「当日(0)」は入れない
- `weights`のデフォルトは`{ delivery: 0.29, conversionProxy: 0.21, review: 0.12, store: 0.08, revenue: 0.30 }`(2026-09-26改訂。`minEstimatedCommission`による足切りとセットでrevenueの重みを50%→30%に引き下げた。変更する場合はユーザーの指示に基づく)
- `minEstimatedCommission`(任意): 想定成果報酬額がこの額未満の商品を検索結果から除外する。設定する場合は必ず実データで影響件数を確認すること(カテゴリーによって報酬額の分布が大きく異なるため、同じ閾値でも影響の大きさが全く違う。2026-09-26、PCモニターは中央値152円のため500円足切りで件数が50→9に激減した例がある)
- `sortOptions`に報酬額を直接示すソート項目(例:「報酬期待値」)は入れない
- コピー文言に「今日」「当日」「収益性」「報酬」を含めない
- `excludeKeywords`(付属品等)は商品名のみが対象、`longLeadTimeExcludeKeywords`(お取り寄せ等)は商品名+説明文が対象、という役割分担を守る。付属品系の語を説明文まで対象にすると、本体商品の仕様・同梱品表記(例:「光源:ランプ」「HDMIケーブル付属」)に誤反応して正規品を除外してしまう(2026-09-26、projectorで実際に発生)
- **`ads`(ValueCommerceのYahoo!ショッピングバナー、`pcBannerHtml`+`mobileOverlayHtml`)を省略しない**。この型のカテゴリー共通の送客導線であり任意項目ではない。`projector.config.ts`のタグをそのまま複製する(規約上コード自体の改変は禁止)
- 取得件数を増やす必要があるカテゴリーだけ `candidatesTargetCount` / `maxDisplayCount` を設定する(未設定=100件/50件)。増やすとキャッシュミス時のYahoo API呼び出しが約4〜5回になる(レート制限は1分30回)
- `minEstimatedCommission` は `fetchCandidates` で実測して決める(シュレッダー・プリンターは500円だと半減したため200円)
- ブランドカード(`popularBrands`)は `add-popular-brand-section` スキル、説明つき広告セクション(`sponsoredSection`)や専用ページの設計は `commerce-page-design` スキルを参照。ユーザーの指示がない限り付けない

## 3. レジストリに登録する

`src/lib/commerce/registry.ts`の`configs`配列に新しい設定をimportして追加する。必須項目が空だとビルド時にエラーになるので、そこで気づける。

## 4. ページの薄いラッパーファイルを作成する

`src/pages/categories/<slug>/index.astro`を作成する。内容はこれだけでよい:

```astro
---
import CommerceCategoryPage from "../../../components/commerce/CommerceCategoryPage.astro";
import { yourConfig } from "../../../lib/commerce/categories/<slug>.config";
---

<CommerceCategoryPage config={yourConfig} />
```

APIルート(`/api/<slug>/products/`)は動的ルート`src/pages/api/[slug]/products.ts`が自動的に処理するため、**新しいファイルを作る必要はない**。

## 5. サイト導線に登録する

- `src/data/site-nav.ts`の`commerceCategories`配列に追加(トップページ・カテゴリー一覧に自動反映される)
- `sitemap.xml.ts`はレジストリから自動的にパスを集計するため、**変更不要**(2026-09-26改修済み)
- `public/llms.txt`に新カテゴリーの1行を追加する(CLAUDE.mdのSEOルール。配送日は確定ではない旨も書く)
- 必要であれば`popularKeywords`/`purposeFinder`/`departmentFinder`(いずれも`site-nav.ts`)にも追加(projector/orchidの実装を参考に、「今日」「当日」を含めない文言にする)

## 6. ローカルで確認する

```bash
npm run build
```

Windowsで`EPERM ... dist\_worker.js`が出た場合は、前回の`wrangler dev`が残っている可能性がある:

```bash
taskkill //F //IM wrangler.exe
taskkill //F //IM workerd.exe
```

その後もう一度`npm run build`を実行してから:

```bash
npx wrangler dev
```

- `/categories/<slug>/` を開き、hero・フィルター・FAQ等の静的部分が表示されることを確認
- 都道府県を選んで「商品を探す」を押し、`/api/<slug>/products/?area=13`相当のレスポンスに実商品が返ることを確認(`deliveryDay`が`null`ばかりでないか、無関係な商品が混ざっていないかを目視)
- **GA4/LINEヤフー広告の計測タグが発火することを確認する**(2026-09-28導入。手順は次のステップ参照)。`CommerceCategoryPage.astro`・`ProductGrid.astro`・`CommerceFilterPanel.astro`・`PickupBrandSection.astro`という共通テンプレートを使っている限り、計測コード自体は自動的に効く(タグの追加設置は不要)が、`slug`の受け渡しミス等がないか実機で必ず確認すること

## 7. GA4計測タグの動作確認(必須、タグ追加設置は不要)

GA4(gtag)・LINEヤフー広告(Yahoo!タグ)は`src/layouts/Layout.astro`に全ページ共通で設置済みで、計測コード自体は`ProductGrid.astro`・`PickupBrandSection.astro`・`CommerceFilterPanel.astro`という共通テンプレート内に実装されている。**新カテゴリー追加時にタグを新しく設置する作業は発生しない**——各コンポーネントが受け取る`slug`(=カテゴリーのスラッグ)がそのままイベントの`category`パラメータになる仕組みのため、ステップ2〜4を通常通り実装していれば自動的に計測される。

ただし「効くはず」で済ませず、新カテゴリーごとに以下を実機(ブラウザのdevtools)で確認すること:

```js
// 商品カードのCTA等をクリックする前後でdataLayerの増分を確認
const before = window.dataLayer.length;
document.querySelector(".product-cta").click(); // 実際に遷移してしまうため、確認後はタブを閉じる想定で
window.dataLayer.slice(before);
```

確認項目:
- `outbound_product_click`が商品カードクリックで1回だけ発火し、`category`が新カテゴリーのslugになっている
- `popularBrands`を設定した場合、ブランドカードクリックで`outbound_product_click`と`brand_click`の両方が1回ずつ発火する
- `filter_use`がお届け先/到着希望/並び順の変更・「商品を探す」クリックで発火する
- ブラウザのコンソールにJavaScriptエラーが出ていない
- クリック後のリンク先がLinkSwitch変換後のURL(`dalr.valuecommerce.com/...`)になっている(LinkSwitchとの競合がないことの確認)

詳細な実装の考え方は`project_yahoo_shopping_affiliate_pattern.md`(メモリ)を参照。

## 8. テストを実行する

```bash
npm run test
```

既存カテゴリー(projector等)のスナップショットテストが引き続き全通過することを確認する。**このコマンドは新カテゴリー自体をテストするものではない**(スナップショットは既存カテゴリーの巻き戻り防止用)。新カテゴリーの検証はステップ6・7の目視確認で行う。

## 9. デプロイ

ユーザーが「デプロイして」と指示したときだけ、`npm run build` → `npx wrangler deploy` を実行する(CLAUDE.mdのcommerce系ルールの通り。指示がない限り自発的には実行しない)。変更点と確認結果をまとめて報告し、デプロイの指示を待つ。デプロイ後は配信されたHTMLをキャッシュバスター付き(`?cb=…`)で取得して確認する。ブラウザペインは古い画面や一時的な404を表示することがある。

## 関連スキル

- `add-yahoo-shopping-category` — このチェックリストの実行手順と、実データ検証の落とし穴
- `add-popular-brand-section` — ブランドカードの追加(データからのブランド選定、画像・事実の確認基準)
- `commerce-page-design` — 各ページの設計(generatorの専用ページ、ProductGridの拡張ポイント、説明つき広告セクション、内部リンク設計)
- `affiliate-tag-handling` / `content-source-check` / `ga4-event-design` — 広告タグ・事実確認・計測の一般ルール

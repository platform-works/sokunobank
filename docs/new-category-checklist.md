# 新カテゴリー追加チェックリスト(Yahoo!ショッピング商品ランキング型)

DM型(事業者比較、`src/data/categories/*.json`)とは別系統の、「Yahoo!ショッピングから商品を検索し独自ランキングする」型カテゴリー(`projector`が最初の実装)を追加する手順。CLAUDE.mdの「commerce系(Yahoo!ショッピング商品ランキング型)カテゴリーの変更禁止事項」を必ず守ること。

## 1. 実データを調査してから設定を書く

新カテゴリーの検索キーワード・除外キーワード・報酬スコアの基準値(`revenueScoreReferenceMax`)を勘で決めない。Yahoo!ショッピングAPIで実際に候補となる検索語を叩き、以下を確認する。

- 想定される`price * affiliateRate / 100`(想定成果報酬額)の分布(中央値・最大値) → `revenueScoreReferenceMax`はここから決める(projectorでは中央値約170円・最大約5,200円に対して3,000を採用。カテゴリーごとに再計算すること)
- 商品説明(`description`/`headLine`)に「お取り寄せ」「予約」等の長納期表記がある商品が混入していないか
- `requiredKeywords`(必須キーワード)で無関係な商品を弾けているか、逆に絞りすぎていないか
- **検索語自体に「法人」「業務用」「オフィス」等の限定語を付けすぎていないか**。実物の商品名にこれらの語がほぼ含まれないカテゴリーでは、限定語付きの検索語がYahoo側の該当件数自体を極端に減らしてしまう(2026-09-26、PCモニターで実際に発生。都道府県を絞ると4件しか出なかった原因は除外条件ではなく検索語だった)。プレーンな商品名の検索語(例:「PCモニター」)と限定語付きの両方をサンプリングし、件数と関連度を比較すること。逆にprojectorの「プロジェクター」のように、限定語なしだと無関係な意味(車のヘッドライト部品・おもちゃ等)の商品が大量に混入するカテゴリーもあるため、どちらが良いかは必ず実データで確認する

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

## 7. テストを実行する

```bash
npm run test
```

既存カテゴリー(projector等)のスナップショットテストが引き続き全通過することを確認する。**このコマンドは新カテゴリー自体をテストするものではない**(スナップショットは既存カテゴリーの巻き戻り防止用)。新カテゴリーの検証はステップ6の目視確認で行う。

## 8. デプロイを依頼する

Claudeは`wrangler deploy`を実行しない。変更点をまとめてユーザーに報告し、デプロイの実行を依頼する。

# LINEヤフー広告 サイトリターゲティングタグ 本番動作確認手順(即納バンク)

作成: 2026-10-15 / 対象: 検索広告用(`yss_retargeting`、ID 1001413776)とディスプレイ広告用(`yjad_retargeting`、ID NLEVOMGY4G)

## 実装の要点
- タグは `src/layouts/Layout.astro` に1か所。全ページ共通。`ytag.js` のローダーは1つを共用(二重ロードなし)
- ページロード1回につき、検索広告用1回・ディスプレイ広告用1回
- 検索広告用のみ、LPで商品を**利用者が選択したとき**に、カスタムパラメーター(`item`・`item_group` の固定ID)で追加送信する
- ディスプレイ広告用は、ページロード時の1回のみ(商品選択時の追加送信は、正式仕様が未確認のため未実装)
- 送信するのは、ページのURL・訪問日時・識別子と、商品ID(固定値)。氏名・メール・住所等は送らない

## 本番デプロイ後の確認(ブラウザ)
1. シークレットウィンドウで `https://sokunobank.com/lp/original-print/?item=cap` を開く。
2. 開発者ツール > Console で、次を実行して、タグのキューを確認する。
   ```js
   window.yjDataLayer.map(a => a[0].type)
   // 期待: ["ycl_cookie", "yss_retargeting", "yjad_retargeting"]  (各1回)
   ```
3. `ytag.js` のローダーが1つであること。
   ```js
   [...document.scripts].filter(s => /ytag\.js/.test(s.src)).length  // 期待: 1
   ```
4. Network タブで `ytag.js` の読み込みが1回であること。
5. LPで別の商品(例: マグカップ)を選択し、再度キューを確認する。
   - 期待: 検索広告用が、`{item:"mug", item_group:"goods"}` つきで1件増える(ディスプレイ広告用は増えない)
6. トップページ・記事ページでも、2.の期待どおり(各1回)であること。

## 広告管理ツールでの確認(反映に時間がかかる場合あり)
1. **ディスプレイ広告アカウント(1002840891)**: ライブラリー > オーディエンスソース >「ウェブサイト訪問」の状態が「利用中」(または、タグの受信あり)になる。
2. **検索広告アカウント(1469491)**: ライブラリー > オーディエンスリスト > デフォルトリストの「ユーザーサイズ」が増える(反映まで数日かかることがある)。
3. 「タグチェッカー」機能(LINEヤフー広告ヘルプ参照)で、サイトURLを入力し、タグが検知されること。

## キャップ訪問者のオーディエンスリスト(ご本人の操作)
- **ディスプレイ広告**: ウェブサイト訪問ソースから、URL条件「URLに `item=cap` を含む」でリストを作成する(商品IDに `cap` で始まる他の商品はない)。
- **検索広告**: URL条件「URLに `item=cap` を含む」と、カスタムパラメーター条件 `item = cap`(LPで画面上でキャップを選んだ利用者)の2本立て。
- 拡張: 他の商品も、商品マスター(`src/data/lp/original-print-products.ts`)の `id` を使い、`item=<id>` で同様に作成できる。

## 確認時の注意
- 広告ページやアフィリエイトのタグを、curl等で繰り返し叩かない(インプレッション・クリックとして計測される)。
- 動作確認で作った訪問は、自分のブラウザのCookie・識別子でリストに入る。確認後はシークレットウィンドウを閉じる。

## 本番Networkでの計測リクエスト確認手順(2026-10-15 追記)

アプリ内ブラウザー・広告ブロッカー拡張ありの環境では、送信が見えないことがある。**拡張を無効にした通常のChrome(シークレットウィンドウ)**で行う。

1. `https://sokunobank.com/lp/original-print/?item=cap` を開く前に、開発者ツール(F12)を開き、Network タブで「Preserve log」をオン、フィルターを空にする。
2. ページを読み込む。
3. 次を確認する(ホスト名・パスは変わることがあるため、固定の期待値にしない。Yahoo!広告の公式ヘルプのタグ確認方法も併用する)。
   - `s.yimg.jp/images/listing/tool/cv/ytag.js` が **1回だけ** 読み込まれている(Status 200)。
   - フィルターに `yahoo.co.jp` / `yimg.jp` / `yjtag` を入れ、ytag.js 読み込み後に、`yahoo` 系ドメインへのリクエストが発生している。その Query String に、検索広告用ID `1001413776` とディスプレイ広告用ID `NLEVOMGY4G` が含まれるか(または、それぞれ別のリクエストになっているか)を確認する。
   - ディスプレイ広告用のリクエストに、ラベル `cap` が含まれる(`?item=cap` のとき)。`?item=` なしでは、ラベルが空であること。
4. `window.yjDataLayer` はytag.js読み込み後にキューが処理済みとなり、空になる。Console では、`typeof ytag`(`"function"`)・ローダー数(`[...document.scripts].filter(s=>/ytag\.js/.test(s.src)).length` が `1`)・Consoleにエラーが無いことを確認する。
5. 広告管理ツール側: ディスプレイ広告のウェブサイト訪問ソース、検索広告のオーディエンスリストの「タグの確認」(「Yahoo!タグ確認」機能)で、受信を確認する(反映に時間がかかる)。
6. 送信が見えない場合は、まず「Consoleに構文エラーがないか」「`typeof ytag` が `function` か」を確認する。構文エラーなら、`npm run check:dist` が検出する種類の不具合。

## デプロイ前の自動検査(再発防止)

- `npm run check:syntax`(`scripts/ci/check-inline-js-syntax.mjs`): dist の全HTMLのインラインJSの構文検査(広告タグ以外も対象)。
- `npm run check:ad-tags`(`scripts/ci/check-ad-tags.mjs`): 広告タグ(ytag.jsローダー・ycl_cookie・検索用・ディスプレイ用・GA4)の重複・欠落。検査項目は `scripts/ci/ad-tag-spec.mjs` に分離しており、タグの仕様変更時はそのファイルだけを更新する。
- `npm run check:dist`: 上の2つを続けて実行。`npm run cf:deploy` は build → check:dist → deploy の順で実行する(エラーなら中断)。
- CI(GitHub Actions、`.github/workflows/ci.yml`): push(master)・PRで npm ci → build → test → check:syntax → check:ad-tags。検査のみで、デプロイは行わない。

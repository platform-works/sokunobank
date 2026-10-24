# 発電機ページ:リスティング広告キーワードと絞り込みの対応(2026-10-24)

発電機ページ(`/categories/generator/`)は、URLのクエリで**条件を選んだ状態**で開ける。リスティング広告の
キーワードごとに、そのキーワードの意図に合う条件を選んだURLを広告の最終ページURLにすると、
検索した人は「探している商品だけ」が並んだ状態で着地できる。

**注意(数値は未測定)**: 下の「想定キーワード」は絞り込みの選択肢から機械的に組み立てた候補で、
検索ボリュームや競合は測っていない。入稿前に、検索広告のキーワードプランナー等で実際の検索数を確認すること。

## URLのクエリ

| クエリ | 値 | 例 |
|---|---|---|
| `brand` | `jackery` `eenour` `kareyou` `bluetti` `ecoflow` `jesimaik` `anker` `honda` `koshin` `dji` | `?brand=jackery` |
| `type` | `portable`(ポータブル電源) `gasoline`(ガソリン発電機) `cassette`(カセットガス発電機) | `?type=gasoline` |
| `use` | `disaster` `home` `work` `camp` `vehicle`(車中泊はエンジン式を自動で除外) | `?use=vehicle` |
| `cap` | 容量の帯の番号(0:〜500Wh / 1:500〜1,000Wh / 2:1,000〜2,000Wh / 3:2,000Wh以上) | `?cap=2` |
| `power` | 出力の帯の番号(0:〜500W / 1:500〜1,000W / 2:1,000〜1,500W / 3:1,500W以上) | `?power=3` |
| `budget` | 予算の帯の番号(0:〜7万円 / 1:7〜12万円 / 2:12〜18万円 / 3:18万円以上) | `?budget=1` |

- 複数は `&` でつなぐ(例: `?brand=jackery&type=portable&budget=1`)。不正な値は無視される(ページは通常どおり開く)。
- canonicalはクエリを含まない(`https://sokunobank.com/categories/generator/`)。**クエリ付きURLは広告専用で、検索エンジンにindexさせない**
  (sitemapにも載せない。サイト内リンクにも使わない)。
- エンジン式(ガソリン・カセットガス)には容量(Wh)の表記が無いため、`type=gasoline|cassette` に `cap` は併用しない(容量は解除される)。

## 想定キーワードと最終ページURL

最終ページURLの前に `https://sokunobank.com/categories/generator/` を付ける。

### ブランド × 種類(指名・準指名)

| 想定キーワード | クエリ |
|---|---|
| ジャクリ ポータブル電源 / Jackery ポータブル電源 | `?brand=jackery&type=portable` |
| EENOUR 発電機 / イーノウ 発電機 | `?brand=eenour` |
| Kareyou 発電機 | `?brand=kareyou` |
| BLUETTI ポータブル電源 / ブルーティ ポータブル電源 | `?brand=bluetti&type=portable` |
| EcoFlow ポータブル電源 / エコフロー ポータブル電源 | `?brand=ecoflow&type=portable` |
| JESIMAIK 発電機 | `?brand=jesimaik` |
| Anker ポータブル電源 | `?brand=anker&type=portable` |
| ホンダ 発電機 / Honda 発電機 | `?brand=honda` |
| 工進 発電機 | `?brand=koshin` |
| DJI ポータブル電源 | `?brand=dji&type=portable` |

### 種類・用途・容量(一般)

| 想定キーワード | クエリ |
|---|---|
| ポータブル電源 防災 | `?type=portable&use=disaster` |
| ポータブル電源 車中泊 | `?type=portable&use=vehicle` |
| ポータブル電源 キャンプ | `?type=portable&use=camp` |
| ポータブル電源 1000Wh | `?type=portable&cap=2` |
| ポータブル電源 大容量 | `?type=portable&cap=3` |
| ポータブル電源 小型 | `?type=portable&cap=0` |
| ガソリン 発電機 | `?type=gasoline` |
| カセットガス 発電機 | `?type=cassette` |
| 発電機 工事 / 発電機 業務用 | `?use=work` |
| 発電機 家庭用 | `?use=home` |
| 発電機 1500W 以上 | `?power=3` |

### 予算

| 想定キーワード | クエリ |
|---|---|
| ポータブル電源 安い / 格安 | `?type=portable&budget=0` |
| ポータブル電源 10万円 | `?type=portable&budget=1` |

## 運用メモ

- ブランドの判定語は `src/lib/commerce/generatorClient.ts` の `brandOptions`(商品名・ブランド名に含まれる語。カタカナ表記を含む)。
  広告キーワードに新しいブランドを足すときは、ここに追加する(取得済みの商品に現れる件数を確認してから)。
- 広告の文言(見出し・説明文)と絞り込みの条件がずれると、ランディングの商品が0件になる。入稿前に各URLを開き、
  商品が表示されること(0件でないこと)を確認する。取得済みの150件に該当が無い組み合わせは0件になりうる。
- 5のつく日(5・15・25日)の案内、AmazonのJAN検索ボタンは、クエリ付きでも同じように表示される。

## 該当商品数の確認(2026-10-24、取得済み150件・お届け先=東京都)

上の全URLで、1件以上の商品が表示されることを確認した(商品の入れ替わりで増減する)。

| 条件 | 件数 | 条件 | 件数 |
|---|---|---|---|
| jackery+portable | 34 | portable+disaster | 56 |
| eenour | 18 | portable+vehicle | 27 |
| kareyou | 16 | portable+camp | 30 |
| bluetti+portable | 15 | portable+cap=2(1,000〜2,000Wh) | 31 |
| ecoflow+portable | 12 | portable+cap=3(2,000Wh以上) | 15 |
| jesimaik | 7 | portable+cap=0(〜500Wh) | **3(少ない)** |
| anker+portable | 6 | gasoline | 37 |
| honda / koshin / dji+portable | 5 / 5 / 5 | cassette | 9 |
| work | 17 | home | 31 |
| power=3(1,500W以上) | 31 | portable+budget=0 / 1 | 20 / 15 |

`portable&cap=0`(小型)は3件と少ない。広告の配信量が多い場合は、`candidatesTargetCount`(取得件数)の見直しを検討する。

## 用途・ブランドの組み合わせパターン(2026-10-24 追加)

STEP1の「用途」も、URLの `use=` で選んだ状態にできる(用途のみ / ブランドのみ / 用途×ブランド)。
用途の絞り込みは、商品名に用途語(防災・災害・家庭用・工事・業務用・キャンプ・車中泊など)が書かれた商品だけを残す仕組みのため、
**商品名にその語が無いブランドは該当が0件になる**(例: Anker は用途語を商品名に書いていない)。
下の件数は、取得済みの150件・東京都宛てでの該当数(2026-10-24)。**3件未満の組み合わせは、広告の最終ページにしない**(商品が少なく、離脱しやすい)。

### 用途のみ

| 想定キーワード | クエリ | 件数 |
|---|---|---|
| 発電機 防災 / ポータブル電源 防災 | `?use=disaster` | 108(商品名に「防災」等が書かれた商品が多く、絞り込みの効果は小さい) |
| 発電機 家庭用 | `?use=home` | 31 |
| 発電機 工事 / 発電機 業務用 | `?use=work` | 17 |
| 発電機 キャンプ / ポータブル電源 キャンプ | `?use=camp` | 36 |
| ポータブル電源 車中泊 | `?use=vehicle` | 27(エンジン式は自動で除外) |

### ブランドのみ

| 想定キーワード | クエリ | 件数 |
|---|---|---|
| ジャクリ / Jackery | `?brand=jackery` | 34 |
| EENOUR / イーノウ | `?brand=eenour` | 18 |
| Kareyou | `?brand=kareyou` | 16 |
| BLUETTI / ブルーティ | `?brand=bluetti` | 15 |
| EcoFlow / エコフロー | `?brand=ecoflow` | 12 |
| JESIMAIK | `?brand=jesimaik` | 7 |
| Anker | `?brand=anker` | 6 |
| ホンダ / Honda | `?brand=honda` | 5 |
| 工進 | `?brand=koshin` | 5 |
| DJI | `?brand=dji` | 5 |

### 用途 × ブランド(3件以上のものだけ。最終ページ候補)

クエリは `?use=<用途>&brand=<ブランド>`。

| 想定キーワード | クエリ | 件数 |
|---|---|---|
| ジャクリ 防災 | `?use=disaster&brand=jackery` | 29 |
| EENOUR 防災 / イーノウ 防災 | `?use=disaster&brand=eenour` | 15 |
| Kareyou 防災 | `?use=disaster&brand=kareyou` | 14 |
| ジャクリ キャンプ | `?use=camp&brand=jackery` | 10 |
| ブルーティ キャンプ | `?use=camp&brand=bluetti` | 13 |
| ブルーティ 車中泊 | `?use=vehicle&brand=bluetti` | 9 |
| ブルーティ 防災 | `?use=disaster&brand=bluetti` | 8 |
| ジャクリ 車中泊 | `?use=vehicle&brand=jackery` | 7 |
| EENOUR 家庭用 | `?use=home&brand=eenour` | 7 |
| Kareyou 工事 / Kareyou 業務用 | `?use=work&brand=kareyou` | 7 |
| エコフロー 防災 | `?use=disaster&brand=ecoflow` | 6 |
| 工進 防災 | `?use=disaster&brand=koshin` | 5 |
| DJI 防災 | `?use=disaster&brand=dji` | 5 |
| EENOUR 工事 | `?use=work&brand=eenour` | 4 |
| JESIMAIK 防災 | `?use=disaster&brand=jesimaik` | 4 |
| エコフロー キャンプ / 車中泊 | `?use=camp&brand=ecoflow` / `?use=vehicle&brand=ecoflow` | 4 / 4 |
| Kareyou キャンプ | `?use=camp&brand=kareyou` | 4 |
| DJI 家庭用 / DJI 車中泊 | `?use=home&brand=dji` / `?use=vehicle&brand=dji` | 3 / 3 |
| ホンダ 家庭用 | `?use=home&brand=honda` | 3 |
| ジャクリ 家庭用 | `?use=home&brand=jackery` | 3 |

### 使わない組み合わせ(3件未満)

Anker は全用途で0件。ホンダ・工進・JESIMAIK の工事/キャンプ/車中泊、EENOUR のキャンプ/車中泊(エンジン式は車中泊で自動除外・キャンプは商品名に用途語が無い)、
Kareyou の車中泊(エンジン式)などは0〜2件。これらのキーワードは、**用途を付けずブランドのみ**のURLに誘導する。

## 取得件数の拡大後の該当件数(2026-10-24、東京都宛て)

商品APIの取得を、1検索語あたり5ページ・候補400件・返す件数300件に拡大した(従来は3ページ・200件・150件)。
拡大後、東京都宛てで277件が返る(従来は150件)。実測した該当件数は次のとおり(従来 → 拡大後)。

| 条件 | 従来 → 拡大後 | 条件 | 従来 → 拡大後 |
|---|---|---|---|
| ブランド jackery | 34 → 56 | 用途 disaster | 108 → 178 |
| ブランド bluetti | 15 → 31 | 用途 camp | 36 → 68 |
| ブランド ecoflow | 12 → 25 | 用途 vehicle | 27 → 65 |
| ブランド eenour | 18 → 22 | 用途 home | 31 → 55 |
| ブランド kareyou | 16 → 22 | 用途 work | 17 → 21 |
| ブランド anker | 6 → 20 | type=gasoline | 37 → 56 |
| ブランド dji / honda / koshin | 5 → 9 / 5 → 7 / 5 → 7 | type=cassette | 9 → 14 |
| portable&cap=0(〜500Wh) | 3 → 8 | portable&cap=2 / cap=3 | 31 → 57 / 15 → 44 |
| jesimaik | 7 → 7 | power=3(1,500W以上) | 31 → 50 |

用途×ブランドで3件以上になった主な組み合わせ(拡大後): jackery×disaster 48、bluetti×vehicle 22、bluetti×camp 21、bluetti×disaster 20、
jackery×camp 18、eenour×disaster 17、ecoflow×disaster 15、kareyou×disaster 15、jackery×vehicle 14、ecoflow×vehicle 10、
eenour×home 9、kareyou×work 8、ecoflow×home 8、ecoflow×camp 6、dji×disaster 7、koshin×disaster 6、dji×vehicle 5、jackery×home 5、
dji×home 4、honda×home 4、eenour×work 4、kareyou×camp 4、jesimaik×disaster 4。
Anker は拡大後も用途語が商品名に無く、用途付きは0〜3件のため、ブランドのみ(20件)のURLを使う。

**注意**: お届け先によって件数は変わる。取得は、そのお届け先に2日以内で届く商品に絞られるため、熊本県(43)では84件だった(東京都は277件)。
入稿前の件数確認は、東京都宛て(お届け先を選んだ状態)で行い、お届け先が未指定のときは、全国の取得結果ではなく、条件なしの取得が使われる点に注意する。

## 誘導元ごとの最適化(2026-10-24)

条件付きURL(`?brand=…&use=…` など)で開かれたときだけ、ブラウザ側で次を行う(title・meta・h1・canonical・本文は変えない。SEOには影響しない)。
条件もutm_*も無い通常のアクセスでは、何も変わらない。

| 内容 | 動作 |
|---|---|
| A 条件の帯 | ステップ選択の上に「「災害・防災・Jackery」で絞り込んで表示しています。」と、条件を解除するボタンを表示。商品一覧の注記にも「条件をすべて解除」ボタン(解除するとURLのクエリも消える) |
| B サブ見出し | 「Jackeryの発電機・ポータブル電源を、レビュー・容量・価格で比べて選べます。」のように、条件に合わせて差し替え(解除で元に戻る) |
| C 自動移動 | 最初の商品が表示されたら、おすすめ商品の位置まで1回だけ移動(`#`付きのURLや、既にスクロールしているときは移動しない) |
| D 計測 | 既存の `filter_use` に `filter_name=landing`(値=条件のクエリ)を送り、`utm_source`・`utm_medium`・`utm_campaign`・`utm_term`・`utm_content` と `landing_filters` を添える。以降の商品クリック(`outbound_product_click`)や絞り込み操作にも同じ値を添える。広告の識別子(gclid等)は送らない |
| E ブランド別の取得 | `brand=<id>` を指定すると、商品取得APIが、そのブランドの検索語で追加の候補を集めて共通の商品群へ足す(ブランドごとに30分キャッシュ。ブランドの商品を返す件数の先頭に寄せる)。ブランドを切り替えたときも、そのブランドの追加分を取り直す。取得の失敗時は共通の商品群だけを返す |
| F 節を閉じる | 比較表・防災・計算ツール・用途別・ブランドの折りたたみを閉じる。PCでも見出しバーを表示して開けるようにする |

### 広告のURLにはutm_*を付ける

最終ページURLの例: `https://sokunobank.com/categories/generator/?brand=jackery&use=disaster&utm_source=yahoo&utm_medium=cpc&utm_campaign=generator&utm_term=jackery_disaster`
(広告の自動タグ付けを使う場合も、utm_*を併記すると、検索広告のキーワードごとに、クリック・離脱を比較できる)。

### ブランド別の取得の効果(実測、お届け先なし)

| 条件 | 共通の商品群のみ | ブランド追加あり |
|---|---|---|
| 返却件数 | 271〜277件 | 289件(上限300件) |
| Jackery の商品 | 56件 | 71件 |
| Jackery × 災害・防災 | 48件 | 51件 |

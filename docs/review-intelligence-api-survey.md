# Review Intelligence Engine:API調査と設計(2026-10-24、DRY_RUN段階)

コードは `src/lib/reviewIntel/`、テストは `tests/reviewIntel.test.ts`。**本番公開・外部への書き込みは未実装**(`runPipeline` は `dryRun: true` 以外を拒否する)。
許諾の判断は `sourceLicenseValidator.ts` の `LICENSE_REGISTRY` に集約。**公式ドキュメントで確認できたものだけ allowed、他は unverified(不許可扱い)**。

## 1. ECごとの調査結果

### Yahoo!ショッピング(商品検索API v3)
| 項目 | 内容 |
|---|---|
| 使用可能な公式API | 商品検索API v3(`/webapi/shopping/v3/itemsearch`)。旧レビュー検索API(reviewSearch)は**提供終了** |
| レビュー関連フィールド | `hits/review/rate`(平均)、`hits/review/count`(件数)、`hits/review/url`(レビューページURL)。本文は**なし** |
| 同一商品照合用 | `hits/janCode`、`hits/brand/{id,name}`、`hits/parentBrands[]` |
| 認証・契約 | Client ID(既存の `YAHOO_APP_ID`)。ValueCommerce経由のリンクは既存運用 |
| 保存・解析・公開 | 集計値の取得=可。集計の再公開範囲=**未確認**。画像表示条件=**未確認**。本文=提供なし |
| 制限 | 1クエリ/秒、超過時は429 |
| 代替 | 集計値(星・件数)+仕様 |

### 楽天市場(市場商品検索API)
| 項目 | 内容 |
|---|---|
| 公式API | 楽天ウェブサービス 市場商品検索API |
| レビュー関連 | `reviewCount`、`reviewAverage`、ソート(`±reviewCount`/`±reviewAverage`)、`hasReviewFlag`。本文の出力項目は**確認できず** |
| 同一商品照合用 | `itemCode`(shop:id形式)。**JANは当該ページに記載なし(未確認)** |
| 認証・契約 | `applicationId` + `accessKey`(併用必須)、`affiliateId`は任意 |
| 保存・解析・公開 | 集計値の取得=可。規約上の表示条件・画像の扱い・本文の別経路=**未確認** |
| 制限 | 具体的な回数は未記載。429(`too_many_requests`)、`hits`1〜30、`page`1〜100 |
| 代替 | 集計値+仕様。正規のレビュー提供サービスは**未調査** |

### Amazon(Creators API)
| 項目 | 内容 |
|---|---|
| 公式API | Creators API(GetItems/SearchItems)。PA-API 5 の後継 |
| レビュー関連 | GetItemsのリファレンスに評価・件数・本文のリソースは**記載なし**(第三者情報でも本文は提供されないとされる)。→ 「未確認(提供されない可能性が高い)」 |
| 識別子 | `asin`、`parentASIN`、`itemInfo.externalIds` |
| 認証・契約 | アソシエイトのパートナータグ必須。**直近30日で10件以上の販売実績が条件**(現状は未達) |
| 画像・価格 | 現状は取得不可。検索結果からの画像取得・自社ホスティングは運営規約違反のため禁止 |
| 制限 | リファレンスに記載なし(未確認) |
| 代替 | **アソシエイトのテキストリンクのみ**(CLAUDE.mdのレジ横方式) |

結論:**現時点で、レビュー本文を許諾付きで取得できる正規経路は3ECのいずれにもない**。したがってレビュー本文のAI解析・論点別ランキングは「経路が確保できるまで評価不能」とし、集計値(Yahoo!/楽天の星と件数)+公式仕様ベースで運用する。

## 2. モジュール構成

| モジュール | 役割 |
|---|---|
| `sourceLicenseValidator` | 取得元×操作(集計取得/集計公開/本文取得・解析・保存・公開/画像)の許諾レジストリ、公開可否判定 |
| `productIdentityMatcher` | JAN一致>型番+ブランド一致で同一商品を束ねる。容量等が違えば別商品。名前だけの類似は低信頼(0.3)で対象外 |
| `reviewDataConnector` | 集計値と(許諾済み経路があれば)本文を取得。無ければ「欠測」を記録し補完生成しない |
| `reviewSentimentAnalyzer` | 許諾済み本文のみ、テーマ別の肯定/否定件数・用途・期間を集計。重複と販売店のみのレビューを除外 |
| `reviewTrustEvaluator` | 件数<10=不足、<30=参考情報。評価分布の偏り・古さ・重複を異常傾向として記録(不正の断定はしない) |
| `rankingEngine` | 重み 評価30/用途30/仕様20/価格15/納期5(初期仮説)。評価不能の軸は再配分、重み合計0.5未満は対象外、3件未満は順位を付けず候補一覧 |
| `lpContentGenerator` | LP構造を生成。Amazon CTAは確認済みリンクのみ、画像は楽天/Yahoo!のみで出典+リンク併設 |
| `pipeline` | 上記をつなぐDRY_RUNオーケストレーター。実行ログ(RunLogEntry)を出力 |

## 3. 守っている制約
- 報酬率・提携有無は入力型(`RankingCandidate`)に存在しない。順位に混ぜられない
- Amazon出品は `RANKING_SOURCES`(yahoo/rakuten)外。順位計算・価格表・画像に使わない。他社データでAmazonの価格・画像を代用しない
- アソシエイトリンクは `tag=sokunobank-22`・`www.amazon.co.jp`・ASIN形式を検証し、未登録ならCTA非表示。ASIN推測生成なし
- 画像・集計評価の公開許諾が `unverified` の間は `publish.publishable=false`(公開保留)
- 「購入者全体の評価」とは書かない(`mayClaimOverallBuyerRating` は常にfalse)

## 4. 未実装・保留
- 実APIの呼び出し(DRY_RUNはfixtureのみ)。Yahoo!の `review` と `janCode` は既存の取得処理(`fetchCandidates.ts`)からマッピング可能
- Astroページへの組み込み(LP上部のAmazonテキストリンク配置など)。既存LPを変更するため、対象LPと商品(ASIN)を決めてから着手
- 楽天API連携(`accessKey`取得が必要)、楽天・Yahoo!の画像表示規約の確認
- X悩み検出との連携(購買意欲判定→既存LP検索→LP改善タスク発行)
- 重みのカテゴリ別調整と検証

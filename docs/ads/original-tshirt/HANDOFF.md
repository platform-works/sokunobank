# 引き継ぎ指示文: 即納バンク オリジナルTシャツ（Up-T）Yahoo!検索広告

以下を、SOKUNOBANK フォルダで開始する Claude Code の最初の指示として貼る。

---

## 作業の前提
作業ディレクトリは `C:\dev\projects\sokunobank`。即納バンク（sokunobank.com）の、オリジナルTシャツ向け Yahoo!検索広告（LINEヤフー広告）の、インポート用 CSV の生成・検証を引き継ぐ。ファーマバンク（`C:\dev\projects\pharmabank`）で作った共通エンジンを、即納バンクに導入した直後の状態。**報告・確認はすべて日本語**。

最初に、次を読むこと。
1. `CLAUDE.md`（特に「Up-T LP」「アフィリエイト広告タグの取り扱い」の節。未コミットの変更がある）
2. `docs/ads/original-tshirt/README.md`（正本・方針・未確認事項）
3. `docs/ads/original-tshirt/generated/import-validation-report.md` と `import-rehearsal-checklist.md`
4. `scripts/yahoo-ads/original-tshirt/master.ts`（広告マスター）
5. 共通スキル `yahoo-search-ads-import-csv`（`~/.claude/skills/`）。実機のエクスポート形式を正本にする手順

## 現在の状態（2026-10-11 時点）
- **広告の入稿・配信・有効化は、未実施**。CSV は、すべて配信オフ。実機（キャンペーンエディター）へのインポートも、**未実施**（静的検証のみ）。
- 送客先: 広告LP `/lp/original-print/`（noindex。A8.net の Up-T）。広告の最終リンク先は `https://sokunobank.com/lp/original-print/?item=tshirt&utm_source=yahoo&utm_medium=cpc&utm_campaign=sb_original_tshirt_v1&utm_content=<広告グループ>`。LP は `?item=` で商品を自動選択する。
- キャンペーン名: `OT_オリジナルTシャツ_整理LP_202610`（広告アカウント 1469491 に、**新規キャンペーン**として追加する想定）。
- 構成: 広告グループ 6（deadline / class / team / business / nodesign / general）／広告（RSA。見出し8・説明文4）6／キーワード 33（初期候補 10・保留 22・除外 1）／対象外キーワード 49。
- 初期配信の候補は、最大2広告グループ: `ag_deadline`（納期・急ぎ）と `ag_class`（クラスT・学校行事）。初期候補のキーワードは完全一致。
- 検索クエリーマッチングは「利用しない」。インテントマッチは使わない。
- 予算（100円）・入札価格（1円）・開始日（2026/12/31）は、**検証用の仮値**。承認済みの設定ではない。

## 正本（提供済みの条件。再確認を依頼しない）
A8.net 案件情報（運営者提供 2026-10-11）: Up-T（プログラム s00000014629002）。
- リスティングは**一部OK**。禁止キーワード: `up-t` / `アップティー` / `upt` / `あっぷてぃー`（表記ゆれ・ローマ字・打ち間違い・複合語を含む）。キーワード・広告文・URL・名称に含めない。商標は、禁止指定がなくても入札しない。
- 商品リンクの飛び先は `https://up-t.jp/` 内。A8 の広告タグは、原文のまま（改変・複製しない）。
- 広告とわかる表示（PR）を、ファーストビュー等に。LP は設置済み。
- **成果条件・報酬・EPC・確定率は、公開しない**（A8.net のルール）。広告文・LP・生成物に書かない。運営者提供の PR 文（「格安」「3分」等）は、転載しない。
- 公開後、A8.net の「広告掲載URL管理」に LP の URL を提出する（運営者の作業。提出完了の確認が取れたものだけ、記録する）。

## 生成・検証コマンド
- 生成: `npm run ads:tshirt:build`（esbuild でバンドルして node 実行。`docs/ads/original-tshirt/generated/` に出力。手で編集しない）
- テスト: `npx vitest run tests/yahoo-ads`（全体: `npx vitest run`）
- 出力: `yahoo-search-import.csv`（Shift_JIS・CRLF・46列）、`.utf8.csv`（確認用）、`.full-columns.csv`（実機と同じ141列の予備）、`.initial-candidates.csv`、`keyword-classification.csv`、`negative-keywords.csv`、`ad-group-copy.csv`、`keyword-lp-map.csv`、`import-validation-report.md`、`import-rehearsal-checklist.md`

## 守ること（禁止事項）
- 広告管理ツールへのアップロード、キャンペーンの有効化、配信開始は、運営者の明示的な承認があるまで行わない。CSV は常に全行オフ。
- 既存キャンペーン（プロジェクター・発電機・オフィスチェア・PCモニター等）の ID・入札価格・配信設定を、流用・変更しない。実機のエクスポート（`1469491_all.csv`）は、**列名だけ**を形式として参照する。
- A8 広告タグ（`src/data/lp/upt-ads.ts`）を改変しない。タグ内の URL を、curl 等で繰り返し叩かない。
- Up-T 公式で未確認の事実（最短日数・即日対象・料金・割引・最低枚数）を、広告文・LP に書かない。「公式」「最短」「即日」「無料」「格安」「割引」「No.1」「おすすめ」も使わない。
- 未承認の予算・入札・開始日を、承認済みの設定として扱わない。検索ボリューム・CPC の実測値がないまま、推測値を入れない（null のまま）。
- 実機でインポートできるまで、「インポート検証成功」「そのまま入稿可能」と断定しない。静的検証と実機検証を、区別して報告する。
- ネットワークを使う確認、デプロイ（`wrangler deploy`）は、運営者の指示があるときだけ。コミット・push も、指示があるときだけ。

## 未確認・未承認（本当の残タスク）
1. **実機インポート**: 運営者が `import-rehearsal-checklist.md` の手順で、`yahoo-search-import.csv` を、アカウント 1469491 に、ローカルインポート（アップロードなし）する。赤いセルが出たら、場所と文面を受け取り、`scripts/yahoo-ads/engine/`（spec.ts の REQUIRED_COLUMNS・import.ts）を修正し、回帰テストを `tests/yahoo-ads/` に追加して、再生成する。予備の全列ファイルで切り分ける。
2. 予算・入札価格・開始日の承認（`master.ts` の `SETTINGS` に入れて再生成）。
3. 検索ボリューム・想定CPC の取得（キーワードプランナー等。取得元・取得日つきで `metrics` に入力）。競合が多く、CPC が高い恐れ。少額での検証が前提。
4. LINEヤフー広告の広告掲載基準（アフィリエイト送客LP）の確認。ASP の許可（一部OK）とは別。
5. A8.net の広告掲載URLの提出（LP の公開後。運営者の作業）。
6. 配信後: 検索語句レポートを点検し、禁止キーワードでの表示がないことを確認する（略称・打ち間違いは、対象外キーワードに追加）。ファーマバンクの `scripts/listing-search-terms.ts` と `lib/listing/search-terms.ts` が、参考になる。

## 引き継ぎ時点の注意
- 作業ツリーは未コミット: `package.json`（`ads:tshirt:build` 追加）、`scripts/yahoo-ads/`、`tests/yahoo-ads/`、`docs/ads/`。`CLAUDE.md` と `.claude/skills/add-affiliate-lp/` は、別の作業の未コミット変更。コミットは、運営者の指示を待つ。
- `scripts/yahoo-ads/engine/` は、ファーマバンクのエンジン（`lib/listing/`）のコピー。エンジンを直したときは、元（共通スキル `listing-lp-personalization/templates/engine/`）との差異を、報告する。
- 対象外キーワードの重複削除は、ひらがな／カタカナ・ハイフン・空白を区別する（禁止語の取りこぼし防止。回帰テストあり）。

## 最初にやってほしいこと
1. 上の資料を読み、現状（生成物・テスト）が、記載どおりかを、確認する。`npx vitest run` と `npm run ads:tshirt:build` を実行する。
2. 運営者から、実機インポートの結果（または、予算・入札・開始日の承認、検索ボリューム）が届いていれば、それに応じて修正・再生成する。届いていなければ、「次の1アクション」として、実機インポートの依頼だけを、報告する。
3. 報告は、「新たに判明した問題」「本当に未完了の作業」「次の1アクション」に絞る。

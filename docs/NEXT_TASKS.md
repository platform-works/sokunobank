# 次にやること(NEXT_TASKS)

優先順位つき。完了したら、`docs/CURRENT_STATUS.md` に反映して、この一覧から外す。
状態: 未着手 / 作業中 / 保留

最終更新: 2026-10-08

## 完了(参考)

- [x] GitHub に private リポジトリを作成して push する
- [x] デスクトップPCで GitHub から clone し、`npm install` / `npm run build` / `npm test`(30/30)が通ることを確認する
- [x] ノートPCとデスクトップPCが、同じ GitHub リポジトリを共有する状態にする

## P0(最優先)

- [ ] **deploy の運用を確認する**(未着手)
  - deploy の前に、このリポジトリで `npm run build` と `npm test` を実行する
  - 現在の本番に出ている版が、`master` の HEAD と同じかどうかを確認する
  - deploy は、ユーザーが明示的に指示したときだけ実行する。`feat/x-auto-post` からは deploy しない
- [ ] **9:00(日本時間)の X 投稿の二重化を解消する**(未着手)
  - Cloudflare の cron(別 Worker `sokunobank-x-poster`)と、Codex の `x-web`(午前9時の投稿準備)が、同じ時刻に動く
  - どちらに一本化するか、ユーザーが決める。決めてから、片方の設定を変更する

## P1

- [ ] **`/lp/dm` の未確認の文言を、公式情報で事実確認する**(未着手)
  - ビルド時の警告 `hookVerified: false` の解消
  - 確認できない場合は、その文言を載せない判断も含めて決める

## P2

- [ ] **`feat/x-auto-post` ブランチの将来の整理**(保留)
  - 現在は `origin` に保存のみ。`master` には統合しない
  - 本番の自動投稿は別 Worker `sokunobank-x-poster` が担っているため、この試作を残すか削除するかは、あとで決める
- [ ] **ブランチの整理・命名の統一を検討する**(保留)
  - `master` / `main` の命名を、他のリポジトリとの整合を見て決める
  - 不要になったブランチの整理

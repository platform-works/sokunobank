# 現在の状況(CURRENT_STATUS)

現在の事実だけを書く。次にやることは `docs/NEXT_TASKS.md` に書く。
作業を終えたら、この内容を更新して、コードと同じ commit に入れる。

最終更新: 2026-10-08

## Git

- branch: `master`
- HEAD(この更新の前): `3fd6d4a`。`origin/master` と同期済み
- remote: `origin` = GitHub の private リポジトリ(作成済み)
- ノートPCとデスクトップPCが、同じ GitHub リポジトリを共有している。デスクトップPCは GitHub から clone 済み
- worktree: なし(本体の1つだけ)
- working tree: clean
- Git identity: repo local に `SOKUNOBANK運営事務局 <dmsales29@gmail.com>` を設定。global の `user.name` / `user.email` は未設定
- 別 branch:
  - `feat/x-auto-post`(`9d38f97`): X への投稿 API の試作。`origin` に保存済み。**`master` には統合していない**
  - `refactor/commerce-category-template`: `master` に merge 済み

## ビルドとテスト(デスクトップPC)

- Node.js: v24.21.0 / npm: 11.19.0
- `npm install`: 成功
- `npm run build`: 成功(警告1件: Cloudflare アダプターと画像サービス Sharp が互換でないという警告。ビルドは成功)
- `npm test`: 30件すべて成功
- `dist/` は、このデスクトップPCの現在のパスで再ビルド済み

## サイトの内容

- commerce 系カテゴリー(Yahoo!ショッピング商品ランキング型): projector、orchid、monitor、office-chair、generator(発電機)、office-desk、printer、shredder、whiteboard
  - カテゴリーの設定は `src/lib/commerce/categories/*.config.ts`、登録は `src/lib/commerce/registry.ts`
- ガイド記事: `src/pages/guides/` に24本
- commerce の共通エンジン: `src/lib/commerce/`、`src/components/commerce/`
- `.claude/skills/` に、カテゴリー追加・ブランドセクション追加・ページ設計の手順を置いている

## Cloudflare

- Worker 名: `sokuno-bank`(`wrangler.jsonc`)
- **deploy は今回の整理では実施していない。** 現在の本番に出ている版が、`3fd6d4a` 以前のどの版と同じかは未確認
- **`sokunobank-x-poster`** は、**別の Worker** として存在する(別リポジトリ)。cron(毎日 UTC 0:00 = 日本時間 9:00)で X へ自動投稿する設定になっている。このリポジトリの Worker とは別物
- `feat/x-auto-post` から deploy しない。同じ Worker 名 `sokuno-bank` のため、古い版で本番を上書きしてしまう

## 未解決の事項

- `/lp/dm` に、事実が未確認の文言が残っている。ビルド時に `hookNote が公式情報で未確認(hookVerified: false)` という警告が出る
- 日本時間9:00の X 投稿が二重化している。Cloudflare cron(別 Worker `sokunobank-x-poster`)と、Codex の `x-web`(午前9時の投稿準備)が同じ時刻に動く。どちらに一本化するかは未決定

## 秘密情報

- `.dev.vars`(ローカル)と Cloudflare Secrets(本番)だけを使う。コードと設定ファイルには書かない
- `.dev.vars` は Git で管理しない(`.gitignore` で除外済み)。各PCで別途用意する
- Git の全履歴に、秘密情報が含まれていないことを確認済み(2026-10-07)

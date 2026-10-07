# 現在の状況(CURRENT_STATUS)

現在の事実だけを書く。次にやることは `docs/NEXT_TASKS.md` に書く。
作業を終えたら、この内容を更新して、コードと同じ commit に入れる。

最終更新: 2026-10-08

## Git

- branch: `master`
- コードの基準点: `f99c50f`(現在の本番相当のソースを保存したスナップショット commit。この commit の後に、docs だけの commit が続く)
- remote: なし(GitHub には未共有)
- worktree: なし(本体の1つだけ)
- 保存してある別 branch:
  - `feat/x-auto-post`(`9d38f97`): X への投稿 API の試作。**別 branch として保存するだけで、`master` には統合しない**
  - `refactor/commerce-category-template`: `master` に merge 済み(`master` より先に進んだ commit はない)

## ビルドとテスト(2026-10-07、スナップショット作成時)

- `npm run build`: 成功(警告1件: Cloudflare アダプターと画像サービス Sharp が互換でないという警告。ビルドは成功)
- `npm test`: 30件すべて成功(3ファイル)

## サイトの内容

- commerce 系カテゴリー(Yahoo!ショッピング商品ランキング型): projector、orchid、monitor、office-chair の4件に加えて、新カテゴリー5件を追加した。
  - generator(発電機)、office-desk、printer、shredder、whiteboard
  - カテゴリーの設定は `src/lib/commerce/categories/*.config.ts`、登録は `src/lib/commerce/registry.ts`
- ガイド記事: `src/pages/guides/` に24本(うち23本は、スナップショットで初めて Git に入った)
- commerce の共通エンジン(`src/lib/commerce/`、`src/components/commerce/`)を更新した。商品スペック抽出(`extractSpecs`、`extractPowerSpec`)を追加
- サイト全体の導線(`site-nav`、`Layout`、`sitemap.xml`、`llms.txt` など)を更新した
- `.claude/skills/` に、カテゴリー追加・ブランドセクション追加・ページ設計の手順を置いている

## Cloudflare

- Worker 名: `sokuno-bank`(`wrangler.jsonc`)
- **Cloudflare への deploy は、今回の整理では実施していない。** 現在の本番に出ている版が、`f99c50f` と同じかどうかは未確認
- **`sokunobank-x-poster`** は、**別の Worker** として存在する(別リポジトリ)。cron(毎日 UTC 0:00 = 日本時間 9:00)で X へ自動投稿する設定になっている。このリポジトリの Worker とは別物
- `feat/x-auto-post` にある `/api/internal/x-post` は、このリポジトリの本番サイトには統合していない。`feat/x-auto-post` から deploy すると、同じ Worker 名 `sokuno-bank` のため、古い版で本番を上書きしてしまう。**そこからは deploy しない**

## 既知の確認事項

- `/lp/dm` に、事実が未確認の文言が残っている。ビルド時に `hookNote が公式情報で未確認(hookVerified: false)` という警告が出る。公開前に、公式情報で確認が必要
- `dist/` は、移動前のパスでビルドした成果物なので、ビルド時のパスが埋め込まれている。**deploy の前に、必ずこのリポジトリで `npm run build` をやり直す**

## 秘密情報

- `.dev.vars`(ローカル)と Cloudflare Secrets(本番)だけを使う。コードと設定ファイルには書かない
- `.dev.vars` は Git で管理しない(`.gitignore` で除外済み)
- Git の全履歴に、秘密情報が含まれていないことを確認済み(2026-10-07)

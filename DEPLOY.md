# 外部手続き手順(ドメイン取得・Cloudflare設定・デプロイ)

このドキュメントは、SOKUNOBANKを実際に公開するまでに必要な、コード以外の外部手続きの手順書。
**ドメイン購入・アカウント登録・支払いを伴う操作はすべてユーザー本人が行うこと。**
Claude(AI)がこれらを代行して実行することはない(決済・アカウント作成は対象外の操作のため)。

## 全体の流れ

1. Cloudflareアカウント作成
2. ドメイン取得(WHOISプライバシー保護を必ず有効化)
3. ドメインをCloudflareに接続
4. Wrangler CLIでログイン
5. `*.workers.dev` のプレビューURLでデプロイ確認
6. カスタムドメインをWorkerに紐付け
7. 公開前の最終チェック([README.md](README.md) の「公開前に必ず確認すること」)

---

## 1. Cloudflareアカウント作成

1. https://dash.cloudflare.com/sign-up でアカウントを作成
2. Workers & Pages が利用できるプランか確認(無料プランでも本サイトの静的配信は基本的に可能)

> **運営者秘匿の観点:** アカウント登録時のメールアドレスは、個人の普段使いのメールではなく事業用メールアドレス(README記載の `contact@example.com` を実際のものに差し替えたもの)を使うこと。

### 既知の制約(重要・意思決定済み)

本プロジェクトでは、selected-byで既に使用している既存のCloudflareアカウント(`importproducts55`)をそのまま使う判断をした(2026-09-22時点)。この判断に伴う既知のリスクと対策は以下の通り。

- Cloudflareアカウント名 `importproducts55` は、ラクスル側に既知のアドレスである。同一アカウント内にWorkerを作ると、Worker URL(`*.importproducts55.workers.dev`)にこのアカウント名が含まれる
- `*.workers.dev` のサブドメインはSSL証明書発行時にCertificate Transparency Log(crt.sh等で誰でも検索可能な公開記録)に記録される。**そのため「importproducts55アカウントにsokuno-bankという名前のWorkerが存在する」という事実は、後からworkers.devルートを無効化しても記録としては残り続ける**(通常の閲覧者が偶然たどり着く可能性は低いが、意図的に調べられた場合は見つかりうる)
- 対策として、**workers.devルート(プロダクション・プレビュー双方)は無効化し、カスタムドメイン経由のみで運用する**こと(ダッシュボード → 該当Worker → ドメイン → トグルをオフ)。このURLを外部に一切共有・リンクしないこと
- より確実な分離が必要になった場合は、SOKUNOBANK専用の別Cloudflareアカウント(別メールアドレス)への移行を再検討する

---

## 2. ドメイン取得(最重要:運営者情報の秘匿に直結)

- レジストラを選ぶ際は、**WHOISプライバシー保護(プライバシープロテクション)が利用できるか**を必ず確認する
- `.jp` ドメインはレジストラによってWHOIS公開代行の可否・登録要件(国内住所が必要な場合がある等)が異なるため注意。`.com` / `.net` 等の汎用TLDの方が、匿名性の確保はしやすい傾向にある
- 個人事業主として登録する場合、レジストラとの契約名義自体は本名になるケースが多い(屋号だけでは登録できないレジストラが多い)。WHOISプライバシー保護は「一般公開されるWHOIS情報」をレジストラ側の代行情報に置き換えるものであり、レジストラ自体が本人確認情報を保持すること自体は避けられない(ValueCommerceの本人確認と同種の前提)
- 支払いにも個人情報が紐づくため、可能であれば事業用の決済手段を使う
- Cloudflareでもドメイン登録(Cloudflare Registrar)を提供しているが、対応TLDや新規登録・移管の条件は変更されることがあるため、**申し込み時点でCloudflare公式サイトの最新情報を確認すること**

チェックリスト:
- [ ] レジストラを選定し、WHOISプライバシー保護が有効なプラン/オプションであることを確認した
- [ ] 登録完了後、実際に外部のWHOIS照会サービス(例:`whois` コマンドや `https://whois.icann.org/`)で自分の氏名・住所・電話番号が表示されないことを確認した

---

## 3. ドメインをCloudflareに接続

- Cloudflare以外のレジストラで取得した場合:Cloudflareダッシュボードで「サイトを追加」し、指示されるネームサーバーをレジストラ側の設定画面で変更する
- Cloudflare Registrarで直接取得した場合:自動的にCloudflareのDNSに接続される
- Workersの静的配信(Static Assets)を使う場合、Aレコード等を手動で追加する必要は基本的にない(手順4・5のカスタムドメイン紐付けで完結する)

---

## 4. Wrangler CLIでログイン・動作確認

```bash
npx wrangler login
```

ブラウザが開き、Cloudflareアカウントへの認可を求められる。認可後、ターミナルに戻る。

```bash
npm run build
npx wrangler deploy
```

初回デプロイでは `sokuno-bank.<アカウント名>.workers.dev` のようなプレビューURLが払い出される。

> **注意:** `wrangler deploy` は実際にCloudflare上へ公開される操作(外部への公開を伴う)。このプロジェクトの安全ルールにより、**本番相当の内容をデプロイする前には必ずチャットで確認を取ってから実行すること**。動作確認自体は都度相談の上で構わない。

> **対応済み(2026-09-22):** 初回デプロイ完了。`https://sokuno-bank.importproducts55.workers.dev` が発行されたが、上記「既知の制約」に基づき、ダッシュボードの「ドメイン」タブでworkers.devルート(プロダクション)を無効化する運用とする。

**Windows特有の既知の不具合:** wrangler実行時に `A permission error occurred... Affected path: C:\Users\<user>\Application Data` というエラーが出ることがある。これはWindowsの互換用ジャンクションフォルダへのアクセス権が壊れている場合に発生する。管理者PowerShellで以下を実行して解消する。

```powershell
takeown /F "C:\Users\<ユーザー名>\Application Data" /A
icacls "C:\Users\<ユーザー名>\Application Data" /reset
icacls "C:\Users\<ユーザー名>\Application Data" /grant "<ユーザー名>:(F)"
```

---

## 5. カスタムドメインの紐付け

Cloudflareダッシュボード → **Workers & Pages** → `sokuno-bank` → **Settings** → **Domains & Routes** から、取得したドメイン(例:`sokunobank.example`)を Custom Domain として追加する。

> Cloudflareの設定画面・`wrangler.jsonc` の `routes` 記法は更新されることがあるため、実施時に [Cloudflare Workers公式ドキュメント](https://developers.cloudflare.com/workers/) の最新の手順を確認すること。

---

## 6. 公開前の最終チェック

ドメインを紐付けて一般公開(検索エンジンへのインデックスを許可する等)する前に、[README.md](README.md) の以下2つのチェックリストを必ず消化すること。

- 「DMカテゴリーの内容について」内の**公開前に必ず確認すること**(料金・納期・アフィリエイトリンク等)
- 「運営者情報の秘匿」内のチェック項目(メールアドレスの差し替え、WHOISプライバシー確認など)

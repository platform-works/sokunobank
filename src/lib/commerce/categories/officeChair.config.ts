import type { CommerceCategoryConfig } from "../types";

// オフィスチェアカテゴリー固有の値。docs/new-category-checklist.md の手順1(実データ調査、
// 2026-09-27実施)に基づいて requiredKeywords/excludeKeywords/revenueScoreReferenceMax を校正した。
export const officeChairConfig: CommerceCategoryConfig = {
  slug: "office-chair",
  name: "オフィスチェア",
  apiPath: "/api/office-chair/products/",
  pageTitle: "オフィスチェア 即納比較｜明日には届く商品を探す",
  metaDescription:
    "急な増員・在宅勤務環境の整備に。オフィスチェアを配送地域別に比較。Yahoo!ショッピングから最短翌日配送に対応した商品を探せます。",
  h1: "オフィスチェアを最短で届く商品から比較",
  subheadline:
    "急な増員や在宅勤務の環境整備に。お届け先を選ぶだけで、Yahoo!ショッピングから最短翌日配送に対応したオフィスチェアを比較できます。",
  deliveryNote:
    "在庫・配送予定は変動します。購入前にYahoo!ショッピングの商品ページで最新のお届け予定をご確認ください。",
  intro:
    "選択したお届け先に対して、配送スピード・レビュー・ストア評価・価格などを総合して商品を掲載しています。配送予定・価格・在庫は随時変動します。最終的な到着予定日はYahoo!ショッピングの商品ページでご確認ください。",
  // 2026-09-27調査: 「オフィスチェア」単独でも無関係な商品(車のヘッドライト等)は混入せず、
  // プロジェクター初期のような曖昧語問題は無かった。デスクチェア・ワークチェアは同義語として
  // 頻繁に併記されており、検索語を広げても無関係な商品が増えないことを確認した上で採用した。
  searchQueries: ["オフィスチェア", "デスクチェア", "ワークチェア"],
  requiredKeywords: ["オフィスチェア", "デスクチェア", "ワークチェア"],
  // オフィスチェア固有: 子供用家具・ダイニングチェア・床座り系チェア(あぐら・座椅子)・
  // チェア本体ではない付属品(スタンド等)を除外する(2026-09-27実データ調査で混入を確認)。
  // ゲーミングチェアは「オフィスチェア/デスクチェア」を主目的として併記している商品が
  // ほとんどで、実際に机で使うデスクチェアとして流通しているため除外しない。
  excludeKeywords: [
    "キッズデスク",
    "キッズチェア",
    "子供用",
    "ダイニングチェア",
    "あぐらチェア",
    "あぐら椅子",
    "座椅子",
    "スタンド",
  ],
  // カテゴリー共通の長納期系除外(商品名+説明文の両方をチェック)
  longLeadTimeExcludeKeywords: ["お取り寄せ", "取り寄せ", "予約商品", "入荷次第", "入荷未定", "受注生産", "メーカー取寄"],
  sortOptions: [
    { key: "recommended", label: "即納おすすめ" },
    { key: "trust", label: "売れ筋・安心重視" },
    { key: "reviewCount", label: "レビュー件数" },
    { key: "priceAsc", label: "価格が安い順" },
  ],
  // 2026-09-26改訂分から続く既定値: 報酬額の重みは30%(minEstimatedCommissionによる
  // 足切りとセット)。残り4項目は元の比率(delivery:conversionProxy:review:store = 7:5:3:2)
  // を保ったまま合計70%に収まるよう比例縮小している。
  weights: {
    delivery: 0.29,
    conversionProxy: 0.21,
    review: 0.12,
    store: 0.08,
    revenue: 0.3,
  },
  // 2026-09-27調査: area=13、delivery=1/2で実際に到達可能な(require+exclude適用後の)
  // 商品群96件の想定成果報酬額は中央値約118円・90パーセンタイル約389円・最大約1,099円。
  // 最大値近辺を基準値とした。
  revenueScoreReferenceMax: 1100,
  // 【要確認】このカテゴリーは想定成果報酬額の中央値が約118円と低く、他カテゴリー
  // (projector/orchid/monitor)と同じ500円の足切りを適用すると96件→6件まで激減する
  // ことを確認済み(2026-09-27)。デプロイ前にこの閾値のままでよいかユーザーに確認すること。
  minEstimatedCommission: 500,
  seoSections: [
    {
      heading: "オフィスチェアを即納で選ぶポイント",
      body: [
        "座面の高さ調整範囲・耐荷重・キャスターの床材適合(フローリング/カーペット)を確認する必要があります。",
        "長時間使用する場合はランバーサポートやリクライニング機能の有無も比較の目安になります。",
      ],
    },
    {
      heading: "急ぎでオフィスチェアを手配するときの注意点",
      body: [
        "急ぎの場合はスペック比較だけでなく、到着予定日の確認が重要です。",
        "本ページの配送目安はYahoo!ショッピングのAPIから取得できる情報を基にした表示です。最終的な到着予定日は商品ページで確認してください。",
      ],
    },
  ],
  faq: [
    {
      question: "最短でいつ届く商品を探せますか？",
      answer:
        "お届け先の都道府県と到着希望「明日まで」を選択すると、翌日到着対象として取得できた商品が表示されます。当日(今日中)の到着は多くの場合現実的でないため、本ページでは選択肢として用意していません。在庫状況や締切時刻により対象商品は変動します。",
    },
    {
      question: "明日までに届く商品だけ探せますか？",
      answer: "到着希望で「明日まで」を選択すると、翌日到着対象の商品を表示します。",
    },
    {
      question: "お届け先によって商品は変わりますか？",
      answer:
        "はい。配送スピードは地域によって異なるため、お届け先の都道府県を変更すると表示される商品・配送目安が変わります。",
    },
    {
      question: "オフィスチェアを選ぶときは何を確認すればよいですか？",
      answer: "座面の高さ調整範囲・耐荷重・キャスターの床材適合を中心に確認することをおすすめします。",
    },
    {
      question: "表示されている配送予定は確定ですか？",
      answer:
        "確定ではありません。在庫・配送状況は随時変動するため、購入前に必ずYahoo!ショッピングの商品ページで最新のお届け予定をご確認ください。",
    },
  ],
  // ValueCommerceのYahoo!ショッピングアフィリエイトバナー。projector.config.tsと同一のタグを
  // そのまま流用している(規約上コード自体の改変は禁止のため)。この型のカテゴリーには必須
  // (CLAUDE.mdのcommerce系ルール参照)。
  ads: {
    pcBannerHtml:
      '<script language="javascript" src="//ad.jp.ap.valuecommerce.com/servlet/jsbanner?sid=3782308&pid=892713218"></script><noscript><a href="//ck.jp.ap.valuecommerce.com/servlet/referral?sid=3782308&pid=892713218" rel="nofollow"><img src="//ad.jp.ap.valuecommerce.com/servlet/gifbanner?sid=3782308&pid=892713218" border="0"></a></noscript>',
    mobileOverlayHtml:
      '<script language="javascript" src="//ad.jp.ap.valuecommerce.com/servlet/smartphonebanner?sid=3782308&pid=892713452&position=overlay"></script>',
  },
};

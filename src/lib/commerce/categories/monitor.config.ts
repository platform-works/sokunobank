import type { CommerceCategoryConfig } from "../types";

// PCモニターカテゴリー固有の値。docs/new-category-checklist.md の手順1(実データ調査、
// 2026-09-26実施)に基づいて requiredKeywords/excludeKeywords/revenueScoreReferenceMax を校正した。
export const monitorConfig: CommerceCategoryConfig = {
  slug: "monitor",
  name: "PCモニター",
  apiPath: "/api/monitor/products/",
  pageTitle: "PCモニター 即納比較｜明日には届く商品を探す",
  metaDescription:
    "急な在宅勤務・出張先での作業環境整備に。PCモニターを配送地域別に比較。Yahoo!ショッピングから最短翌日配送に対応した商品を探せます。",
  h1: "PCモニターを最短で届く商品から比較",
  subheadline:
    "急な在宅勤務の準備や出張先の環境整備に。お届け先を選ぶだけで、Yahoo!ショッピングから最短翌日配送に対応したPCモニターを比較できます。",
  deliveryNote:
    "在庫・配送予定は変動します。購入前にYahoo!ショッピングの商品ページで最新のお届け予定をご確認ください。",
  intro:
    "選択したお届け先に対して、配送スピード・レビュー・ストア評価・価格などを総合して商品を掲載しています。配送予定・価格・在庫は随時変動します。最終的な到着予定日はYahoo!ショッピングの商品ページでご確認ください。",
  searchQueries: ["法人 PCモニター", "業務用 モニター", "オフィス モニター"],
  // プロジェクター・胡蝶蘭と違い、実物のPCモニターは商品名に必ずしも検索語を含まない
  // (ブランド名+型番のみの商品名が多い)ため、必須キーワードは複数語をOR的に許容する。
  // それでも「モニター台」等の付属品が紛れ込むため、excludeKeywordsでの除外が重要になる。
  requiredKeywords: ["モニター", "ディスプレイ", "DISPLAY"],
  excludeKeywords: [
    // カテゴリー共通の長納期系除外(商品名+説明文の両方をチェック)
    "お取り寄せ",
    "取り寄せ",
    "予約商品",
    "入荷次第",
    "入荷未定",
    "受注生産",
    "メーカー取寄",
    // PCモニター固有: モニター本体ではない付属品・周辺機器を除外
    // (2026-09-26実データ調査で「モニター」を含む付属品が多数混入することを確認した)
    "モニター台",
    "モニタースタンド",
    "モニターアーム",
    "机上ラック",
    "机上台",
    "卓上ラック",
    "PCラック",
    "収納ラック",
    "壁掛け金具",
    "セキュリティワイヤー",
    "ワイヤーロック",
    "保護フィルム",
    "液晶保護",
    "ケース",
    "カバー",
    // ローカル動作確認(2026-09-26)で判明: 「モニター」は防犯カメラ(モニター付き/モニター一体型)や
    // デジタルサイネージ・POP端末・写真フレーム・紙幣計数機・TV等、PCモニターと無関係な商品にも
    // 広く使われる一般語のため、これらの製品カテゴリーを名指しで除外する。
    "カメラ",
    "テレビ",
    "デジタルサイネージ",
    "サイネージ",
    "電子POP",
    "デジタルフォトフレーム",
    "紙幣計数機",
    "パンプス",
  ],
  sortOptions: [
    { key: "recommended", label: "即納おすすめ" },
    { key: "trust", label: "売れ筋・安心重視" },
    { key: "reviewCount", label: "レビュー件数" },
    { key: "priceAsc", label: "価格が安い順" },
  ],
  weights: {
    delivery: 0.2,
    conversionProxy: 0.15,
    review: 0.09,
    store: 0.06,
    revenue: 0.5,
  },
  // 2026-09-26調査: 検索語だけのサンプリングでは約3,800〜9,961円の高額商品(DMM.make DISPLAY等)が
  // 目立ったが、これらは「法人限定・メーカー直送・車上渡し」の特別受注品で、area+delivery指定の
  // 実際の検索(delivery_area/delivery_day/delivery_deadline付き)では配送日確定検索にヒットせず、
  // 実際にランキングへ表示されることがないと判明した(ローカルwrangler devでの実地確認、
  // area=13/27・delivery=1/2の組み合わせで再現)。この届かない外れ値を基準値にすると、実際に
  // 表示され得る商品群(要excludeKeywords適用後で542〜113円)の報酬スコアがほぼ0%に潰れてしまう
  // (projectorで一度起きたのと同種のバグ)。よって実際に到達可能な商品群の最大値(約542円)を
  // 基準に据えた。
  revenueScoreReferenceMax: 550,
  seoSections: [
    {
      heading: "PCモニターを即納で選ぶポイント",
      body: [
        "用途に合わせて画面サイズ・解像度・接続端子(HDMI・DisplayPort・USB-C等)がお使いのPCに対応しているかを確認する必要があります。",
        "壁掛け設置や複数台での共有を検討する場合は、VESA規格への対応可否も事前に確認してください。",
      ],
    },
    {
      heading: "急ぎでPCモニターを手配するときの注意点",
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
      question: "PCモニターを選ぶときは何を確認すればよいですか？",
      answer: "画面サイズ・解像度・接続端子(HDMI・DisplayPort等)がお使いのPCに対応しているかを中心に確認することをおすすめします。",
    },
    {
      question: "表示されている配送予定は確定ですか？",
      answer:
        "確定ではありません。在庫・配送状況は随時変動するため、購入前に必ずYahoo!ショッピングの商品ページで最新のお届け予定をご確認ください。",
    },
  ],
  // ValueCommerceのYahoo!ショッピングアフィリエイトバナー。projector.config.tsと同一のタグを
  // そのまま流用している(規約上コード自体の改変は禁止のため)。この型のカテゴリーには必須
  // (CLAUDE.mdのcommerce系ルール参照。2026-09-26、胡蝶蘭ページへの掲載漏れが発覚し追加)。
  ads: {
    pcBannerHtml:
      '<script language="javascript" src="//ad.jp.ap.valuecommerce.com/servlet/jsbanner?sid=3782308&pid=892713218"></script><noscript><a href="//ck.jp.ap.valuecommerce.com/servlet/referral?sid=3782308&pid=892713218" rel="nofollow"><img src="//ad.jp.ap.valuecommerce.com/servlet/gifbanner?sid=3782308&pid=892713218" border="0"></a></noscript>',
    mobileOverlayHtml:
      '<script language="javascript" src="//ad.jp.ap.valuecommerce.com/servlet/smartphonebanner?sid=3782308&pid=892713452&position=overlay"></script>',
  },
};

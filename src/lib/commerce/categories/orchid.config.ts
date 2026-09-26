import type { CommerceCategoryConfig } from "../types";

// 胡蝶蘭カテゴリー固有の値。docs/new-category-checklist.md の手順1(実データ調査、
// 2026-09-26実施)に基づいて requiredKeywords/excludeKeywords/revenueScoreReferenceMax を校正した。
export const orchidConfig: CommerceCategoryConfig = {
  slug: "orchid",
  name: "胡蝶蘭",
  apiPath: "/api/orchid/products/",
  pageTitle: "胡蝶蘭 即納比較｜明日には届く商品を探す",
  metaDescription:
    "急な開店祝い・就任祝いに。胡蝶蘭を配送地域別に比較。Yahoo!ショッピングから最短翌日配送に対応した商品を探せます。",
  h1: "胡蝶蘭を最短で届く商品から比較",
  subheadline:
    "急な開店祝い・就任祝いに。お届け先を選ぶだけで、Yahoo!ショッピングから最短翌日配送に対応した胡蝶蘭を比較できます。",
  deliveryNote:
    "在庫・配送予定は変動します。購入前にYahoo!ショッピングの商品ページで最新のお届け予定をご確認ください。",
  intro:
    "選択したお届け先に対して、配送スピード・レビュー・ストア評価・価格などを総合して商品を掲載しています。配送予定・価格・在庫は随時変動します。最終的な到着予定日はYahoo!ショッピングの商品ページでご確認ください。",
  searchQueries: ["法人 胡蝶蘭", "開店祝い 胡蝶蘭", "取引先 胡蝶蘭"],
  requiredKeywords: ["胡蝶蘭"],
  excludeKeywords: [
    // カテゴリー共通の長納期系除外(商品名+説明文の両方をチェック)
    "お取り寄せ",
    "取り寄せ",
    "予約商品",
    "入荷次第",
    "入荷未定",
    "受注生産",
    "メーカー取寄",
    // 胡蝶蘭固有: 開店祝い・就任祝いは生花が主流のため、造花(アートフラワー・シルクフラワー)を除外する
    // (2026-09-26 ユーザー確認済み。実データ調査でも一定数混入することを確認した)
    "造花",
    "アートフラワー",
    "シルクフラワー",
    "光触媒",
    "CT触媒",
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
  // 2026-09-26調査: 想定成果報酬額(price*affiliateRate/100)は中央値約242円、上位クラスタは
  // 約1,150〜1,350円、最高額は「東京23区限定・手持ち配送」の特殊な高額商品(3,300円)で
  // 突出した外れ値だった。この1件だけを基準にすると他の大半が低評価に張り付くため、
  // 実勢の上位クラスタ寄りの1,500円を基準値とした(外れ値は自動的に上限100点に丸められる)。
  revenueScoreReferenceMax: 1500,
  seoSections: [
    {
      heading: "胡蝶蘭を即納で選ぶポイント",
      body: [
        "用途(開店祝い・就任祝い等)に合わせて、本数(3本立ち・5本立ち等)や立て札(名入れ)への対応可否を確認する必要があります。",
        "急ぎの場合は在庫状況と配送先の地域が対応しているかを事前に確認してください。",
      ],
    },
    {
      heading: "急ぎで胡蝶蘭を手配するときの注意点",
      body: [
        "急ぎの場合は本数・輪数などのスペック比較だけでなく、到着予定日の確認が重要です。",
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
      question: "胡蝶蘭を選ぶときは何を確認すればよいですか？",
      answer: "本数(立て数)や輪数、立て札(名入れ)への対応可否を中心に確認することをおすすめします。",
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

import type { CommerceCategoryConfig } from "../types";

// テレビ(液晶・有機EL)カテゴリー。発電機ページで確立した「お届け先を取得に使わず、全員共通の1パターンで
// 取得する」方式(ignoreDeliveryArea)を踏襲している。配送日・在庫は商品ページで確認してもらう。
//
// 2026-10-24の実データ調査(profile_category.cjs / check_filters.cjs):
// - 検索語「テレビ」単独はテレビ台・ローボード(約4割)が混ざるため、本体に絞れる「液晶テレビ」「有機ELテレビ」を使う
//   (「液晶テレビ」の総ヒット約4.0万件・ジャンルの95%が液晶テレビ、「有機ELテレビ」約2,200件)。
// - 必須語は「テレビ」に加え、商品名に「テレビ」と書かれない本体(例「TVS REGZA REGZA 55M550M [55インチ]」)を
//   拾うためメーカーのシリーズ名(REGZA/VIERA/ビエラ/AQUOS/BRAVIA)も加えた。「有機EL」単独は
//   Nintendo Switch(有機ELモデル)が混ざるため使わない。
// - 除外語は check_filters.cjs で本体の誤除外がないことを確認した。「リモコン」は
//   パナソニックの本体名(リモコン音声認識)にも含まれるため単独では使わず、「テレビリモコン」「代用リモコン」にした。
//   「クリーナー」は本体名にも出たため「液晶テレビクリーナー」「画面クリーナー」にした。
export const tvConfig: CommerceCategoryConfig = {
  slug: "tv",
  name: "テレビ",
  apiPath: "/api/tv/products/",
  pageTitle: "テレビ(液晶・有機EL)を比較・購入｜サイズ・予算から探す",
  metaDescription:
    "液晶テレビ・有機ELテレビを、画面サイズ・予算から探せます。REGZA・シャープ・ソニー・パナソニック・TCL・ハイセンス等の商品を、Yahoo!ショッピングのレビュー・ストア評価・価格をもとに掲載。設置場所に合うサイズの目安も。",
  h1: "テレビ(液晶・有機EL)を比較・購入｜サイズ・予算から探す",
  subheadline: "画面サイズ(インチ)と予算から、Yahoo!ショッピングで買えるテレビを探せます。",
  deliveryNote:
    "在庫・配送予定は変動します。購入前にYahoo!ショッピングの商品ページで、お届け先を指定して最新のお届け予定と設置サービスの有無をご確認ください。",
  intro:
    "レビュー・ストア評価・価格などを総合して掲載しています。価格・在庫・配送予定は随時変動し、大型テレビは配送エリアが限られる場合があります。最終的な到着予定日・送料・設置条件はYahoo!ショッピングの商品ページでご確認ください。",
  searchQueries: ["液晶テレビ", "有機ELテレビ"],
  requiredKeywords: ["テレビ", "REGZA", "VIERA", "ビエラ", "AQUOS", "BRAVIA"],
  excludeKeywords: [
    "保護パネル",
    "テレビカバー",
    "テレビガード",
    "テレビ台",
    "テレビボード",
    "テレビスタンド",
    "金具",
    "ポータブルテレビ",
    "ドアホン",
    "テレビスピーカー",
    "サウンドバー",
    "ウェットティッシュ",
    "液晶テレビクリーナー",
    "画面クリーナー",
    "お掃除",
    "テレビリモコン",
    "代用リモコン",
    "Switch",
    "ニンテンドー",
    "Nintendo",
    "ブースター",
    "アンテナ線",
  ],
  longLeadTimeExcludeKeywords: ["お取り寄せ", "取り寄せ", "予約商品", "入荷次第", "入荷未定", "受注生産", "メーカー取寄"],
  sortOptions: [
    { key: "recommended", label: "おすすめ順" },
    { key: "trust", label: "売れ筋・安心重視" },
    { key: "reviewCount", label: "レビュー件数" },
    { key: "priceAsc", label: "価格が安い順" },
  ],
  // 発電機と同じ方針: 配送日は取得しないため配送の重みは0、レビュー優先。
  weights: {
    delivery: 0,
    conversionProxy: 0.26,
    review: 0.32,
    store: 0.12,
    revenue: 0.3,
  },
  // 想定報酬(price×料率)は中央値約1,280円・p90約4,500円。最大約47,000円は80万円超の大型有機ELで、
  // これを基準にすると通常の商品の報酬スコアが潰れるため、p90付近を基準にした。
  revenueScoreReferenceMax: 4500,
  // 500円以上が約75%、300円以上が約90%。低価格帯(小型)も落とし過ぎない値にした。
  minEstimatedCommission: 300,
  candidatesTargetCount: 300,
  maxDisplayCount: 200,
  maxPagesPerQuery: 3,
  ignoreDeliveryArea: true,
  amazonJanLink: true,
  showDescription: true,
  seoSections: [
    {
      heading: "テレビを選ぶときの確認点",
      body: [
        "まず、置く場所と視聴距離からサイズを決めます。画面サイズは「V型(インチ)」で表され、同じ型でも製品により本体の幅や高さが異なるため、設置場所の寸法は各商品ページの外形寸法で確認してください。",
        "次に、画質・機能を選びます。4Kチューナー内蔵か、録画(外付けHDD)に対応するか、動画配信サービスに対応するか、ゲーム用の機能が必要か、といった点が選ぶときの違いになります。有機ELは映像の表現力、液晶は価格の手頃さやサイズの選択肢の広さが、それぞれ検討のポイントになります。",
      ],
    },
    {
      heading: "急ぎで手配するときの注意点",
      body: [
        "本ページでは、お届け先ごとの配送日の判定・絞り込みは行っていません。気になる商品は、Yahoo!ショッピングの商品ページでお届け先を指定し、お届け予定日・在庫・設置サービスの有無を確認してください。",
        "テレビは大型の商品ほど、配送できる地域や日時が限られたり、設置が別料金になったりする場合があります。商品によっては限定エリアの配送を前提としたものもあるため、商品ページの配送に関する記載を必ずご確認ください。",
      ],
    },
  ],
  faq: [
    {
      question: "テレビは何インチ(V型)を選べばよいですか？",
      answer:
        "置く場所の広さと視聴距離で決めます。設置できる幅・高さは製品ごとに異なるため、候補の商品ページにある外形寸法(スタンドを含む場合と含まない場合があります)を、置く場所の寸法と照らして確認してください。",
    },
    {
      question: "液晶テレビと有機ELテレビの違いは何ですか？",
      answer:
        "表示方式が異なります。一般に有機ELは映像の表現力、液晶は価格の手頃さやサイズの選択肢の広さが検討のポイントです。機種により特性は異なるため、各商品ページの仕様を確認してください。",
    },
    {
      question: "最短でいつ届く商品を探せますか？",
      answer:
        "本ページでは、お届け先ごとの到着日の判定・絞り込みは行っていません。条件に合う商品を選んだら、Yahoo!ショッピングの商品ページでお届け先を指定し、お届け予定日を確認してください。在庫状況や締切時刻により、お届け予定日は変動します。",
    },
    {
      question: "大型のテレビは設置もしてもらえますか？",
      answer:
        "設置サービスの有無や料金、対応地域は店舗・商品ごとに異なります。商品名や説明に「設置無料」「設置Aエリアのみ」等の記載がある場合は、その条件をそのまま商品ページで確認してください。",
    },
    {
      question: "表示されている配送予定は確定ですか？",
      answer: "確定ではありません。在庫・配送状況は随時変動するため、購入前に必ずYahoo!ショッピングの商品ページで最新のお届け予定をご確認ください。",
    },
  ],
  // ValueCommerceのYahoo!ショッピングアフィリエイトバナー。generator.config.tsと同一のタグをそのまま流用
  // (規約上コード自体の改変は禁止のため)。この型のカテゴリーには必須。
  ads: {
    pcBannerHtml:
      '<script language="javascript" src="//ad.jp.ap.valuecommerce.com/servlet/jsbanner?sid=3782308&pid=892713218"></script><noscript><a href="//ck.jp.ap.valuecommerce.com/servlet/referral?sid=3782308&pid=892713218" rel="nofollow"><img src="//ad.jp.ap.valuecommerce.com/servlet/gifbanner?sid=3782308&pid=892713218" border="0"></a></noscript>',
    mobileOverlayHtml:
      '<script language="javascript" src="//ad.jp.ap.valuecommerce.com/servlet/smartphonebanner?sid=3782308&pid=892713452&position=overlay"></script>',
  },
};

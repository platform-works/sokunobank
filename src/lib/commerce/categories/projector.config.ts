import type { CommerceCategoryConfig } from "../types";

// projectorカテゴリー固有の値をここに集約する。
// 胡蝶蘭など今後のカテゴリーはこの形のファイルをもう1つ作るだけで追加できる想定。
export const projectorConfig: CommerceCategoryConfig = {
  slug: "projector",
  name: "会議用プロジェクター",
  apiPath: "/api/projector/products/",
  pageTitle: "会議用プロジェクター即納比較｜明日には届く商品を探す",
  metaDescription:
    "急な会議・商談・イベント向けに、会議用プロジェクターを配送地域別に比較。Yahoo!ショッピングから最短翌日配送に対応した商品を探せます。",
  h1: "会議用プロジェクターを最短で届く商品から比較",
  subheadline:
    "急な会議・商談・イベントに。お届け先を選ぶだけで、Yahoo!ショッピングから最短翌日配送に対応したプロジェクターを比較できます。",
  deliveryNote:
    "在庫・配送予定は変動します。購入前にYahoo!ショッピングの商品ページで最新のお届け予定をご確認ください。",
  intro:
    "選択したお届け先に対して、配送スピード・レビュー・ストア評価・価格などを総合して商品を掲載しています。配送予定・価格・在庫は随時変動します。最終的な到着予定日はYahoo!ショッピングの商品ページでご確認ください。",
  searchQueries: ["会議用 プロジェクター", "ビジネス プロジェクター", "法人 プロジェクター"],
  requiredKeywords: ["プロジェクター"],
  // 2026-09-26改訂: 以前はこれらの語を商品名+説明文の両方でチェックしていたが、EPSON純正の
  // ビジネスプロジェクター本体が、説明文中の仕様・同梱品表記(例:「光源:ランプ」「HDMIケーブル付属」
  // 「リモコン付属」)に誤反応して除外されていることが発覚した。付属品自体の商品名には対象語が
  // 直接含まれるのが通例(例:「プロジェクタースクリーン」「プロジェクター用ランプ」「壁掛け金具」)
  // なので、商品名のみのチェックに変更した(実データで、除外対象が意図通り付属品のみになり、
  // 誤除外されていたEPSON純正モデルが正しく表示されるようになったことを確認済み)。
  excludeKeywords: ["スクリーン", "ケース", "バッグ", "ケーブル", "ランプ", "リモコン", "交換部品", "スタンド", "天吊", "金具", "アクセサリー"],
  // 即納訴求のページのため、納期が長い(お取り寄せ・予約・受注生産等)商品は除外する。
  // 商品名だけでなく説明文(descriptionText)にも出るため filterRelevantProducts 側で両方をチェックしている。
  longLeadTimeExcludeKeywords: ["お取り寄せ", "取り寄せ", "予約商品", "入荷次第", "入荷未定", "受注生産", "メーカー取寄"],
  sortOptions: [
    { key: "recommended", label: "即納おすすめ" },
    { key: "trust", label: "売れ筋・安心重視" },
    { key: "reviewCount", label: "レビュー件数" },
    { key: "priceAsc", label: "価格が安い順" },
  ],
  // 「配送確認ができること」自体は重み付けではなく、重複除去(同一JAN)の優先条件として
  // ranking.tsの手前(products.ts)で既に強制している。ここのweightsはその後の
  // 最終表示順(即納おすすめ)にのみ影響する。
  // 2026-09-26改訂: 報酬額500円未満を検索結果から足切りする(minEstimatedCommission、下記)
  // ことと引き換えに、報酬額の重みを50%→30%へ引き下げた(ユーザー指示)。
  // 残り4項目は元の比率(delivery:conversionProxy:review:store = 7:5:3:2)を保ったまま
  // 合計70%に収まるよう比例縮小した。
  weights: {
    delivery: 0.29,
    conversionProxy: 0.21,
    review: 0.12,
    store: 0.08,
    revenue: 0.3,
  },
  // 実際のYahoo!ショッピングの想定成果報酬額を調査したところ、このカテゴリーの
  // アフィリエイト料率はほぼ一律1%程度で、想定成果報酬額は中央値約170円、
  // 最高額でも約5,200円程度(2026-09-26調査)。以前の基準値(10,000円)では
  // 最高額商品でもrevenueScoreが52点にしかならず、大半の商品は0〜2点に張り付き、
  // 報酬額の重み(50%)が実質ほとんど機能していなかった。実態に合わせて基準値を
  // 引き下げ、報酬額による差が最終スコアに実際に反映されるようにした。
  revenueScoreReferenceMax: 3000,
  // 2026-09-26導入(ユーザー指示): 想定成果報酬額が500円未満の商品は検索結果から除外する。
  minEstimatedCommission: 500,
  seoSections: [
    {
      heading: "会議用プロジェクターを即納で選ぶポイント",
      body: [
        "会議用途では、明るさ(輝度)・接続端子の種類・解像度が会議室の環境に合っているかを確認する必要があります。",
        "PCと接続するためのHDMI等の端子があるか、事前に確認してください。",
        "昼間の明るい会議室では、極端に低輝度な小型製品は映像が見えにくくなる可能性があります。",
      ],
    },
    {
      heading: "急ぎでプロジェクターを購入するときの注意点",
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
      question: "会議用プロジェクターは何を確認すればよいですか？",
      answer: "明るさ・接続端子・解像度が会議室の環境に合っているかを中心に確認することをおすすめします。",
    },
    {
      question: "表示されている配送予定は確定ですか？",
      answer:
        "確定ではありません。在庫・配送状況は随時変動するため、購入前に必ずYahoo!ショッピングの商品ページで最新のお届け予定をご確認ください。",
    },
  ],
  // ValueCommerceの広告コードは規約上改変(書き換え・一部抜き出し・サイズ変更等)が禁止されているため、
  // 元のタグを一切変更せず文字列としてそのまま持たせる。描画側(CommerceCategoryPage.astro)は
  // set:htmlでそのまま出力する(Astroのテンプレート構文経由だとscoped CSS用の
  // data-astro-cid-*属性が子要素にまで付与されてしまい、タグが変更されてしまうため)。
  ads: {
    pcBannerHtml:
      '<script language="javascript" src="//ad.jp.ap.valuecommerce.com/servlet/jsbanner?sid=3782308&pid=892713218"></script><noscript><a href="//ck.jp.ap.valuecommerce.com/servlet/referral?sid=3782308&pid=892713218" rel="nofollow"><img src="//ad.jp.ap.valuecommerce.com/servlet/gifbanner?sid=3782308&pid=892713218" border="0"></a></noscript>',
    // スマートフォン専用のオーバーレイバナー(ValueCommerce指定)。指示では</body>直前への設置と
    // なっているが、このバナーはカテゴリーごとに異なりうるため共通Layout.astroは変更せず、
    // CommerceCategoryPage.astro側でページ自身のコンテンツ末尾(Footerの直前)に設置している。
    mobileOverlayHtml:
      '<script language="javascript" src="//ad.jp.ap.valuecommerce.com/servlet/smartphonebanner?sid=3782308&pid=892713452&position=overlay"></script>',
  },
  // 2026-09-27: office-chairで確立した「即納人気ブランドから探す」テンプレートを移植
  // (.claude/skills/add-popular-brand-section/SKILL.md参照)。genreCategoryId=21176は
  // Yahoo!ショッピングの「プロジェクター｜パソコン周辺機器」カテゴリーで、実際にブラウザで
  // ブランド絞り込み・優良配送(astk=2)フィルタを操作し、結果件数が正しく絞り込まれることを
  // 確認済み(Anker 75件/エプソン 231件/Aladdin X 98件)。画像は各ブランドのYahoo!ショッピング
  // 実商品データから取得し、自社ホスティングはしていない。説明文は各社公式サイト
  // (ankerjapan.com/epson.jp/aladdinx.jp)で確認できた事実のみを記載している。
  popularBrands: [
    {
      brand: "Anker",
      displayName: "Anker(Nebula) / アンカー",
      description:
        "モバイルバッテリー等で知られるAnkerが展開するプロジェクターブランド「Nebula」。モバイル・ホーム・ホームシアターシステムの3カテゴリでラインナップし、世界累計販売台数320万台以上(2025年12月時点、Nebulaシリーズ累計)。",
      history:
        "Anker発のプロジェクターブランドとして「Nebula」シリーズを展開。バッテリー技術のノウハウを活かしたコンパクト設計が特徴で、会員登録により最長24ヶ月の製品保証を受けられます。",
      features: ["モバイル/ホーム/ホームシアターシステムの3ラインナップ", "バッテリー内蔵のモバイルモデルあり(Capsuleシリーズ等)", "会員登録で最長24ヶ月の製品保証"],
      popularTypes: ["Nebula Capsule 3", "Nebula Capsule 3 Laser", "Nebula X1"],
      image: {
        src: "https://item-shopping.c.yimg.jp/i/j/ankerdirect_d2200?resolution=2x",
        alt: "Anker Soundcore Nebula P1i プロジェクター",
      },
      yahooSearchUrl: "https://shopping.yahoo.co.jp/search/%E3%83%97%E3%83%AD%E3%82%B8%E3%82%A7%E3%82%AF%E3%82%BF%E3%83%BC+Anker/21176/?astk=2",
    },
    {
      brand: "Epson",
      displayName: "エプソン / EPSON",
      description:
        "プリンター等で知られるエプソンが展開するプロジェクターブランド。映像重視の家庭用と、明るさ重視のビジネス・教育用の両ラインナップを持ちます。",
      history:
        "会議・プレゼン・授業向けの「ビジネスプロジェクター」と、映画・ゲーム向けの「家庭用プロジェクター」を用途別に展開。3LCD方式を採用したモデルが多く、後継機種検索などのサポートツールも公式サイトで提供しています。",
      features: ["3LCD方式採用モデルあり", "会議・プレゼン向けの明るさ重視モデル(ビジネスプロジェクター)を展開", "後継機種検索・お探しナビ等の公式サポートツールあり"],
      popularTypes: ["EB-E12(ビジネスプロジェクター)", "EB-W41", "EB-W55"],
      image: {
        src: "https://item-shopping.c.yimg.jp/i/j/yamada-denki_9481655013?resolution=2x",
        alt: "EPSON EB-E12 ビジネスプロジェクター",
      },
      yahooSearchUrl: "https://shopping.yahoo.co.jp/search/%E3%83%97%E3%83%AD%E3%82%B8%E3%82%A7%E3%82%AF%E3%82%BF%E3%83%BC+%E3%82%A8%E3%83%97%E3%82%BD%E3%83%B3/21176/?astk=2",
    },
    {
      brand: "AladdinX",
      displayName: "Aladdin X / アラジンエックス",
      description:
        "照明一体型の3in1プロジェクターを展開するブランドで、天井設置により工事不要で大画面を楽しめる家庭向け製品が中心です。",
      history:
        "2018年に発売を開始し、2025年7月時点でシリーズ累計販売台数30万台を突破。グッドデザイン賞・キッズデザイン賞など複数のアワードを受賞しています。",
      features: ["照明・スピーカー・プロジェクターの3in1設計", "天井設置により工事不要で大画面投影", "超短焦点モデルもラインナップ"],
      popularTypes: ["Aladdin X3", "Aladdin X2 Plus", "Aladdin Marca"],
      image: {
        src: "https://item-shopping.c.yimg.jp/i/j/yamada-denki_104357017?resolution=2x",
        alt: "AladdinX Aladdin X3 3-in-1プロジェクター",
      },
      yahooSearchUrl: "https://shopping.yahoo.co.jp/search/%E3%83%97%E3%83%AD%E3%82%B8%E3%82%A7%E3%82%AF%E3%82%BF%E3%83%BC+Aladdin+X/21176/?astk=2",
    },
  ],
};

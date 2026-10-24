import type { CommerceCategoryConfig } from "../types";

// PCモニターカテゴリー固有の値。docs/new-category-checklist.md の手順1(実データ調査、2026-09-26実施)に基づいて
// requiredKeywords/excludeKeywords を校正した。2026-10-24、発電機ページと同じ「条件で絞り込む」構成(レビュー評価優先)へ変更。
// 画面サイズ・解像度・予算・ブランドの帯は、Yahoo!ショッピング「PCモニター」検索の先頭500件(必須語・除外語の適用後347件)を
// 取得して実測した(価格の中央値約2.4万円、想定報酬は中央値約250円・90%点約600円・最大約2,090円、報酬率は大半が1%の低報酬カテゴリー)。
export const monitorConfig: CommerceCategoryConfig = {
  slug: "monitor",
  name: "PCモニター",
  apiPath: "/api/monitor/products/",
  pageTitle: "PCモニターを比較・購入｜画面サイズ・解像度・予算から探す",
  metaDescription:
    "ゲーミング・モバイル・在宅の用途から、画面サイズ(インチ)・解像度(4K・WQHD・フルHD)・予算・ブランドを選び、Yahoo!ショッピングのPCモニターをレビュー評価・価格で比較できます。JAPANNEXT・I-O DATA・DELL・LG・Philips等のブランドも。",
  h1: "PCモニターを比較・購入｜画面サイズ・解像度・予算から探す",
  subheadline:
    "用途・画面サイズ・解像度・予算を選んで、Yahoo!ショッピングのレビュー評価が高いPCモニターを比較できます。",
  deliveryNote:
    "在庫・配送予定は変動します。購入前にYahoo!ショッピングの商品ページで最新のお届け予定をご確認ください。",
  intro:
    "用途・画面サイズ・解像度・予算・ブランドの条件に合う商品を、レビュー・ストア評価・価格などを総合して掲載しています。配送予定・価格・在庫は随時変動します。最終的な到着予定日はYahoo!ショッピングの商品ページで、お届け先を指定してご確認ください。",
  // 取得回数を抑えるため2語×3ページ(Yahoo!APIは1秒1回・1分30回程度の制限。先頭500件の実測では1語で347件が残った)
  searchQueries: ["PCモニター", "液晶モニター"],
  // 実物のPCモニターは商品名に必ずしも検索語を含まない(ブランド名+型番のみの商品名が多い)ため、必須キーワードは複数語をOR的に許容する。
  requiredKeywords: ["モニター", "ディスプレイ", "DISPLAY"],
  // 付属品・周辺機器や、「モニター」を無関係な意味で使う別製品カテゴリーを除外する(2026-09-26実データ調査。商品名のみが対象)。
  excludeKeywords: [
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
    // 「モニター」は防犯カメラ(モニター付き/モニター一体型)やデジタルサイネージ・POP端末・
    // 写真フレーム・紙幣計数機・TV・カーナビ等、PCモニターと無関係な商品にも広く使われる
    // 一般語のため、これらの製品カテゴリーを名指しで除外する。
    "カメラ",
    "テレビ",
    "デジタルサイネージ",
    "サイネージ",
    "電子POP",
    "デジタルフォトフレーム",
    "紙幣計数機",
    "パンプス",
    "カーナビ",
    // 2026-09-26 本番データで新たに判明: カー用品(ナビ画面保護・タイヤ空気圧モニター)、
    // ケーブル単体(「DISPLAY」がDisplayPortケーブル名にも含まれるため必須キーワードを
    // すり抜ける)、ソフトウェア・設定代行サービス(モニター本体ではない)を除外する。
    "ナビ",
    "タイヤ",
    "TPMS",
    "空気圧",
    "ケーブル",
    "ダウンロード",
    "設定サポート",
  ],
  longLeadTimeExcludeKeywords: ["お取り寄せ", "取り寄せ", "予約商品", "入荷次第", "入荷未定", "受注生産", "メーカー取寄"],
  sortOptions: [
    { key: "recommended", label: "おすすめ順" },
    { key: "trust", label: "売れ筋・安心重視" },
    { key: "reviewCount", label: "レビュー件数" },
    { key: "priceAsc", label: "価格が安い順" },
  ],
  // 発電機と同じ配分(配送日は取得しないため配送の重みは0。レビュー優先)
  weights: {
    delivery: 0,
    conversionProxy: 0.26,
    review: 0.32,
    store: 0.12,
    revenue: 0.3,
  },
  // 想定報酬の90%点が約600円、最大は約2,090円の外れ値のため、90%点を少し上回る値を基準にした
  revenueScoreReferenceMax: 700,
  // 報酬率が大半1%のため、価格約1万円未満(想定報酬100円未満)の商品を足切りする(347件中333件が残る)。
  // 旧設定の500円では48件しか残らず、レビュー優先の並びに必要な母数が足りない。
  minEstimatedCommission: 100,
  candidatesTargetCount: 300,
  maxDisplayCount: 200,
  maxPagesPerQuery: 3,
  ignoreDeliveryArea: true,
  // ブランド指定(?brand=<id>)のとき、そのブランドの検索語で追加の候補を集める。wordsは monitorData.ts の brandOptions と同じ語
  brandSearch: {
    japannext: { words: ["japannext", "ジャパンネクスト"], queries: ["JAPANNEXT モニター"] },
    iodata: { words: ["i-o data", "iodata", "アイ・オー・データ", "アイオーデータ"], queries: ["アイ・オー・データ モニター"] },
    dell: { words: ["dell", " デル "], queries: ["Dell モニター"] },
    irisohyama: { words: ["アイリスオーヤマ", "iris ohyama", "irisohyama"], queries: ["アイリスオーヤマ モニター"] },
    lenovo: { words: ["lenovo", "レノボ"], queries: ["Lenovo モニター"] },
    philips: { words: ["philips", "フィリップス"], queries: ["Philips モニター"] },
    lg: { words: ["lg", "エルジー"], queries: ["LG モニター"] },
    asus: { words: ["asus", "エイスース"], queries: ["ASUS モニター"] },
    eizo: { words: ["eizo", "ナナオ"], queries: ["EIZO モニター"] },
    maxzen: { words: ["maxzen", "マクスゼン"], queries: ["MAXZEN モニター"] },
    msi: { words: ["msi"], queries: ["MSI モニター"] },
    fujitsu: { words: ["富士通", "fujitsu"], queries: ["富士通 モニター"] },
  },
  amazonJanLink: true,
  showDescription: true,
  seoSections: [
    {
      heading: "PCモニターを選ぶときの確認点",
      body: [
        "用途に合わせて、画面サイズ・解像度・接続端子(HDMI・DisplayPort・USB-C等)がお使いのPCに対応しているかを確認します。商品名に画面サイズや解像度が明記されている商品は、本ページのカードにも表示しています。",
        "壁掛け設置やモニターアームの利用を検討する場合は、VESA規格への対応可否も事前に商品ページで確認してください。",
      ],
    },
    {
      heading: "急ぎで手配するときの注意点",
      body: [
        "急ぎの場合はスペック比較だけでなく、到着予定日の確認が重要です。本ページでは配送日の判定・絞り込みは行っていません。気になる商品は、Yahoo!ショッピングの商品ページでお届け先を指定し、お届け予定日と在庫を確認してください。",
        "在庫・配送状況や締切時刻によって、到着予定日は変動します。購入前に必ず商品ページで最新の情報をご確認ください。",
      ],
    },
  ],
  faq: [
    {
      question: "PCモニターを選ぶときは何を確認すればよいですか？",
      answer: "画面サイズ・解像度・接続端子(HDMI・DisplayPort等)がお使いのPCに対応しているかを中心に確認することをおすすめします。",
    },
    {
      question: "商品名に画面サイズや解像度が書かれていない商品はどうなりますか？",
      answer:
        "画面サイズや解像度を商品名から確認できない商品は、推測で分類しません。画面サイズ・解像度で絞り込んでいる間は表示せず、絞り込みを解除すると表示されます。",
    },
    {
      question: "商品はどのような順で並んでいますか？",
      answer:
        "Yahoo!ショッピングのレビュー評価と件数を中心に、ストア評価・価格などを総合して並べています。評価は件数が少ないほど割り引いて比べています。",
    },
    {
      question: "最短でいつ届く商品を探せますか？",
      answer:
        "本ページでは、お届け先ごとの到着日の判定・絞り込みは行っていません。条件に合う商品を選んだら、Yahoo!ショッピングの商品ページでお届け先を指定し、お届け予定日を確認してください。在庫状況や締切時刻により、お届け予定日は変動します。",
    },
    {
      question: "お届け先によって商品は変わりますか？",
      answer:
        "本ページの商品一覧は、お届け先では変わりません。お届け日・送料・在庫は、お届け先や店舗の締切時刻によって異なるため、商品ページでお届け先を指定して確認してください。",
    },
    {
      question: "表示されている配送予定は確定ですか？",
      answer: "確定ではありません。在庫・配送状況は随時変動するため、購入前に必ずYahoo!ショッピングの商品ページで最新のお届け予定をご確認ください。",
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
  // 2026-09-27: office-chair/projectorで確立した「即納人気ブランドから探す」テンプレートを移植
  // (.claude/skills/add-popular-brand-section/SKILL.md参照)。genreCategoryId=49352はYahoo!
  // ショッピングの「パソコン用ディスプレイ、アクセサリー＞ディスプレイ、モニター」カテゴリーで、
  // 実際にブラウザでブランド絞り込み・優良配送(astk=2)フィルタを操作し、結果件数が正しく
  // 絞り込まれることを確認済み(DELL 96件/I-O DATA 75件/LG 80件/JAPANNEXT 85件/
  // Philips 60件)。画像は各ブランドのYahoo!ショッピング実商品データから取得し、
  // 自社ホスティングはしていない。説明文は各社公式サイトで確認できた事実のみを記載している。
  // 【要確認】サンワサプライのみastk=2適用時に1件まで絞り込まれる(通常検索では33件)。
  // 他ブランドと比べて優良配送対応の在庫が少ない可能性があるため、ユーザーに報告済み。
  popularBrands: [
    {
      brand: "DELL",
      displayName: "DELL / デル",
      description:
        "米国発のPCメーカーが展開するモニターブランド。「Dell Proモニター」「デジタル ハイエンドシリーズ」「Alienwareモニター(ゲーミング)」など用途別のラインナップを持ちます。",
      history:
        "公式サイトでは用途別に複数シリーズへ分けてモニターを展開しており、ウルトラワイド・4K以上・曲面など仕様別の選び方も用意されています。",
      features: ["Dell Proモニター/デジタルハイエンドシリーズ等の用途別ラインナップ", "Alienwareブランドのゲーミングモニターも展開", "ウルトラワイド・4K・曲面モデルあり"],
      popularTypes: ["Dell Proモニター", "デジタルハイエンドシリーズ", "Alienwareモニター"],
      image: {
        src: "https://item-shopping.c.yimg.jp/i/j/try3_4582724745802?resolution=2x",
        alt: "Dell モニター Pro 22 E2225HM",
      },
      yahooSearchUrl: "https://shopping.yahoo.co.jp/search/PC%E3%83%A2%E3%83%8B%E3%82%BF%E3%83%BC+DELL/49352/?astk=2",
    },
    {
      brand: "I-O DATA",
      displayName: "I-O DATA / アイ・オー・データ機器",
      description:
        "国内のPC周辺機器メーカーが展開するモニターブランド。ゲーミングモニターブランド「GigaCrysta」等を展開しています。",
      history: "2026年に創業50周年を迎えた国内PC周辺機器メーカーで、法人向け・個人向け双方にモニター製品を提供しています。",
      features: ["ゲーミングモニターブランド「GigaCrysta」を展開", "フルHD・4K等複数解像度のラインナップ", "法人向け製品情報・対応情報を公式サイトで公開"],
      popularTypes: ["LCD-A241DBX", "LCD-A271DBX", "GigaCrystaシリーズ"],
      image: {
        src: "https://item-shopping.c.yimg.jp/i/j/yamada-denki_1587971011?resolution=2x",
        alt: "アイ・オー・データ機器 LCD-A241DBX PC用LCDモニター",
      },
      yahooSearchUrl: "https://shopping.yahoo.co.jp/search/PC%E3%83%A2%E3%83%8B%E3%82%BF%E3%83%BC+I-O+DATA/49352/?astk=2",
    },
    {
      brand: "LG",
      displayName: "LGエレクトロニクス / LG",
      description:
        "韓国の電機メーカーが展開するディスプレイブランド。独自の有機ELパネル(タンデムOLED)を採用した高リフレッシュレートのゲーミングモニターに強みを持ちます。",
      history: "仕事用からゲーミング・クリエイティブ用途まで幅広いラインナップを展開し、ウルトラワイド(21:9)曲面モニターなども提供しています。",
      features: ["タンデムOLED(有機EL)パネル採用モデルあり", "高リフレッシュレートのゲーミングモニターに強み", "ウルトラワイド21:9曲面モニターを展開"],
      popularTypes: ["4Kモニター(27UP850K-W等)", "ウルトラワイドシリーズ", "OLEDゲーミングシリーズ"],
      image: {
        src: "https://item-shopping.c.yimg.jp/i/j/dshopone-y_4989027031593?resolution=2x",
        alt: "LG 27UP850K-W 4K液晶ディスプレイ",
      },
      yahooSearchUrl: "https://shopping.yahoo.co.jp/search/PC%E3%83%A2%E3%83%8B%E3%82%BF%E3%83%BC+LG/49352/?astk=2",
    },
    {
      brand: "JAPANNEXT",
      displayName: "JAPANNEXT",
      description:
        "PCモニターを中心に展開するブランドで、フルHD・IPS/VAパネル採用モデルなど手に取りやすい価格帯の製品を幅広く扱っています。",
      history: "確認できた製品情報の範囲では、VA/IPSパネル採用モデルを中心に27型・23.8型・21.5型等のサイズ展開があり、多くのモデルに2〜3年保証が付帯します。",
      features: ["VA/IPSパネル採用モデルを展開", "フルHD中心の幅広いサイズ展開", "2〜3年保証付きモデルが多い"],
      popularTypes: ["JNV27FHDC65W", "JN-238i75F-W", "JNIPS215FHDC65W"],
      // 2026-09-27: 旧画像(gbftストアの商品)がユーザー環境で表示されないと報告されたため、
      // 別ストア(beisiadenki)の同ブランド商品画像に差し替えた。
      image: {
        src: "https://item-shopping.c.yimg.jp/i/j/beisiadenki_4589511163306?resolution=2x",
        alt: "JAPANNEXT JN-IPS27FHDR-C65W-HSP 27インチフルHD液晶モニター",
      },
      yahooSearchUrl: "https://shopping.yahoo.co.jp/search/PC%E3%83%A2%E3%83%8B%E3%82%BF%E3%83%BC+JAPANNEXT/49352/?astk=2",
    },
    {
      brand: "SANWA SUPPLY",
      displayName: "SANWA SUPPLY / サンワサプライ",
      description: "PC・タブレット周辺機器を主力とするサンワサプライが展開するモバイルモニター・PCモニターです。",
      history: "PC・タブレット周辺機器メーカーとして知られるサンワサプライが、携帯性を重視したモバイルモニターを中心にラインナップを展開しています。",
      features: ["USB Type-C/miniHDMI対応のモバイルモニターを展開", "携帯性を重視した14インチ前後のモデルが中心"],
      popularTypes: ["DP-09", "DP-08", "DP-06"],
      image: {
        src: "https://item-shopping.c.yimg.jp/i/j/youplan_100002069372?resolution=2x",
        alt: "サンワサプライ PCモニター・液晶ディスプレイ DP-09",
      },
      yahooSearchUrl: "https://shopping.yahoo.co.jp/search/PC%E3%83%A2%E3%83%8B%E3%82%BF%E3%83%BC+%E3%82%B5%E3%83%B3%E3%83%AF%E3%82%B5%E3%83%97%E3%83%A9%E3%82%A4/49352/?astk=2",
    },
    {
      brand: "Philips",
      displayName: "Philips / フィリップス",
      description:
        "オランダ発の電機ブランドが展開するモニターで、ゲーミング向け「EVNIA」シリーズやUSB Type-C対応モデルなど用途別のラインナップを持ちます。",
      history: "4K・マルチメディア・スタンダード・USB Type-C対応など用途別にモデルを分けて展開しており、ケーブル1本で映像・給電・データ通信をまとめられるUSB Type-Cモデルが特徴です。",
      features: ["ゲーミングブランド「EVNIA」を展開", "USB Type-C 1本で映像・給電・通信をまとめられるモデルあり", "4K/マルチメディア/スタンダード等用途別ラインナップ"],
      popularTypes: ["27E2N2500/11", "EVNIAシリーズ", "24E2N2100/11"],
      image: {
        src: "https://item-shopping.c.yimg.jp/i/j/pc-express_0810112795592?resolution=2x",
        alt: "Philips 27E2N2500/11 液晶ディスプレイ",
      },
      yahooSearchUrl: "https://shopping.yahoo.co.jp/search/PC%E3%83%A2%E3%83%8B%E3%82%BF%E3%83%BC+Philips/49352/?astk=2",
    },
  ],
};

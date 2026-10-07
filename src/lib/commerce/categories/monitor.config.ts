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
  // 2026-09-26改訂: 当初「法人 PCモニター」「業務用 モニター」「オフィス モニター」で
  // 実装したところ、Yahoo!ショッピング本体で「PCモニター」を検索すると1万件超あるのに
  // 都道府県を絞ると数件しか表示されないという指摘があった。実物のPCモニターは商品名に
  // 「法人」「業務用」「オフィス」等の語を含まないことがほとんどで、これらの限定語を
  // つけた検索語ではYahoo側の該当件数自体が極端に少なくなっていたことが原因(絞り込みが
  // 厳しいのはexcludeKeywords側ではなく検索語側だった)。一般的な検索語に変更し、
  // 実際に該当件数が大きく増えることを確認した(area=13, delivery=1/2の実地確認で
  // 4件→85件)。
  searchQueries: ["PCモニター", "液晶モニター", "パソコン ディスプレイ"],
  // プロジェクター・胡蝶蘭と違い、実物のPCモニターは商品名に必ずしも検索語を含まない
  // (ブランド名+型番のみの商品名が多い)ため、必須キーワードは複数語をOR的に許容する。
  // それでも「モニター台」等の付属品が紛れ込むため、excludeKeywordsでの除外が重要になる。
  requiredKeywords: ["モニター", "ディスプレイ", "DISPLAY"],
  // PCモニター固有: モニター本体ではない付属品・周辺機器や、「モニター」を無関係な意味で使う
  // 別製品カテゴリーを除外する(2026-09-26実データ調査。商品名のみを対象にする。理由はexcludeKeywords
  // のJSDoc参照 — 説明文まで対象にすると本体商品の仕様表記に誤反応するため)。
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
  // カテゴリー共通の長納期系除外(商品名+説明文の両方をチェック)
  longLeadTimeExcludeKeywords: ["お取り寄せ", "取り寄せ", "予約商品", "入荷次第", "入荷未定", "受注生産", "メーカー取寄"],
  sortOptions: [
    { key: "recommended", label: "即納おすすめ" },
    { key: "trust", label: "売れ筋・安心重視" },
    { key: "reviewCount", label: "レビュー件数" },
    { key: "priceAsc", label: "価格が安い順" },
  ],
  // 2026-09-26改訂: 報酬額500円未満を検索結果から足切りする(minEstimatedCommission、下記)
  // ことと引き換えに、報酬額の重みを50%→30%へ引き下げた(ユーザー指示、projectorと共通方針)。
  // 残り4項目は元の比率(delivery:conversionProxy:review:store = 7:5:3:2)を保ったまま
  // 合計70%に収まるよう比例縮小した。
  // 【要確認】このカテゴリーの想定成果報酬額は中央値約152円・90パーセンタイルでも約509円
  // (下記調査結果参照)しかないため、500円未満を足切りすると実データの9割前後が対象外になる
  // 可能性が高い(他カテゴリーより影響が大きい)。デプロイ前に必ず実件数を確認すること。
  weights: {
    delivery: 0.29,
    conversionProxy: 0.21,
    review: 0.12,
    store: 0.08,
    revenue: 0.3,
  },
  // 2026-09-26調査(検索語見直し後の再計測): area=13、delivery=1/2で実際に到達可能な
  // (require+exclude適用後の)商品群85件の想定成果報酬額は中央値約152円・90パーセンタイル
  // 約509円・最大約1,084円(EIZO USB-C接続モニター)。最大値近辺を基準値とした
  // (旧検索語での調査時に見えた約3,800〜9,961円のDMM.make DISPLAY等は「法人限定・
  // メーカー直送・車上渡し」の特別受注品で配送日確定検索にヒットせず実際には表示されない
  // ことを確認済み。これを基準にすると表示され得る商品群の報酬スコアがほぼ0%に潰れてしまう、
  // projectorで一度起きたのと同種のバグになるため使わない)。
  revenueScoreReferenceMax: 1100,
  // 2026-09-26導入(ユーザー指示): 想定成果報酬額が500円未満の商品は検索結果から除外する。
  // このカテゴリーは中央値152円のため影響が大きい可能性がある(上記の要確認コメント参照)。
  minEstimatedCommission: 500,
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

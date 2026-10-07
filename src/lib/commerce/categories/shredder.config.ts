import type { CommerceCategoryConfig } from "../types";

// シュレッダーカテゴリー固有の値。docs/new-category-checklist.md の手順1(実データ調査、
// 2026-10-03実施)に基づいて requiredKeywords/excludeKeywords/revenueScoreReferenceMax/
// minEstimatedCommission を校正した。
export const shredderConfig: CommerceCategoryConfig = {
  slug: "shredder",
  name: "シュレッダー",
  apiPath: "/api/shredder/products/",
  pageTitle: "シュレッダー 即納比較｜明日には届く商品を探す",
  metaDescription:
    "機密書類や個人情報の処分に。シュレッダーを配送地域別に比較。Yahoo!ショッピングから最短翌日配送に対応した商品を探せます。",
  h1: "シュレッダーを最短で届く商品から比較",
  subheadline:
    "急な書類処分や個人情報の管理体制づくりに。お届け先を選ぶだけで、Yahoo!ショッピングから最短翌日配送に対応したシュレッダーを比較できます。",
  deliveryNote:
    "在庫・配送予定は変動します。購入前にYahoo!ショッピングの商品ページで最新のお届け予定をご確認ください。",
  intro:
    "選択したお届け先に対して、配送スピード・レビュー・ストア評価・価格などを総合して商品を掲載しています。配送予定・価格・在庫は随時変動します。最終的な到着予定日はYahoo!ショッピングの商品ページでご確認ください。",
  // 2026-10-03調査: 「シュレッダー」単独でYahoo!ショッピングに約2.3万件あり、実物の商品名にも
  // 「業務用」「オフィス」が多く含まれる(アイリスオーヤマ「オフィスシュレッダー」等)ため、
  // 限定語付きの検索語も併用して法人向けの上位商品を取りこぼさないようにした。
  searchQueries: ["シュレッダー", "業務用 シュレッダー", "オフィス シュレッダー"],
  // 「シュレッダ」(長音なし。「OFシュレッダクロス」等)と誤記の「シュレッター」(商品名に併記されている)、
  // 「細断機」を許容する。「シュレッダ」は「シュレッダー」の部分文字列のため両方に一致する。
  requiredKeywords: ["シュレッダ", "シュレッター", "細断機"],
  // 2026-10-03実データ調査: 草刈り機の「シュレッダーブレード」「替え刃」、エンジン粉砕機・
  // ウッドチッパー等の同名別製品や、シュレッダー用のオイル・ゴミ袋・ケース類を除外する
  // (商品名のみが対象)。「お手入れシート」はシュレッダー本体の同梱特典として商品名に書かれる
  // ことがあるため、本体の誤除外を避けて除外語には含めていない(単体の消耗品は報酬額の足切りで外れる)。
  excludeKeywords: [
    "ブレード",
    "草刈",
    "替え刃",
    "替刃",
    "粉砕機",
    "チッパー",
    "破砕機",
    "オイル",
    "潤滑",
    "ゴミ袋",
    "ごみ袋",
    "ケース",
    "カバー",
  ],
  // カテゴリー共通の長納期系除外(商品名+説明文の両方をチェック)
  longLeadTimeExcludeKeywords: ["お取り寄せ", "取り寄せ", "予約商品", "入荷次第", "入荷未定", "受注生産", "メーカー取寄"],
  sortOptions: [
    { key: "recommended", label: "即納おすすめ" },
    { key: "trust", label: "売れ筋・安心重視" },
    { key: "reviewCount", label: "レビュー件数" },
    { key: "priceAsc", label: "価格が安い順" },
  ],
  weights: {
    delivery: 0.29,
    conversionProxy: 0.21,
    review: 0.12,
    store: 0.08,
    revenue: 0.3,
  },
  // 2026-10-03調査: area=13・delivery=2で実際に到達可能な商品群(必須語・除外語・足切り適用後54件)の
  // 想定成果報酬額は中央値約328円・最大約1,600円(業務用の高額機)。最大値近辺を基準値とした。
  revenueScoreReferenceMax: 1600,
  // 2026-10-03調査: 報酬率が1%前後と低く、標準の500円で足切りすると62件が31件に半減する。
  // 200円なら54件(うち明日到着対象46件)を保ったまま、報酬が数十円程度の低単価品
  // (手動の卓上機等)を除外できるため、このカテゴリーは200円とした。
  minEstimatedCommission: 200,
  seoSections: [
    {
      heading: "シュレッダーを即納で選ぶポイント",
      body: [
        "細断方式(ストレートカット・クロスカット・マイクロカット)によって細断片の細かさが異なります。扱う書類の機密度に合わせて選ぶ必要があります。",
        "同時に細断できる枚数・連続使用時間・ダストボックスの容量に加えて、ホッチキス針・カード・CD/DVDに対応しているかも、商品ごとに仕様を確認してください。",
      ],
    },
    {
      heading: "急ぎでシュレッダーを手配するときの注意点",
      body: [
        "急ぎの場合はスペック比較だけでなく、到着予定日の確認が重要です。業務用の大型機は、設置スペース・電源・搬入経路も事前に確認してください。",
        "本ページの配送目安はYahoo!ショッピングのAPIから取得できる情報を基にした表示です。最終的な到着予定日は商品ページで確認してください。",
      ],
    },
  ],
  faq: [
    {
      question: "最短でいつ届く商品を探せますか？",
      answer:
        "お届け先の都道府県と到着希望「明日まで」を選択すると、翌日到着対象として取得できた商品が表示されます。在庫状況や締切時刻により対象商品は変動します。",
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
      question: "シュレッダーを選ぶときは何を確認すればよいですか？",
      answer:
        "細断方式(ストレート・クロス・マイクロカット)、同時に細断できる枚数、連続使用時間、ダストボックスの容量、ホッチキス針・カード・CD/DVDへの対応を中心に確認することをおすすめします。",
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
  // 2026-10-03: 「即納人気ブランドから探す」(.claude/skills/add-popular-brand-section/SKILL.md参照)。
  // 掲載ブランドは、Yahoo!ショッピングAPIで取得した約450商品のbrand.name件数上位
  // (IRIS OHYAMA 218 / SANWA SUPPLY 73 / 明光商会 35 / ナカバヤシ 15)から選んだ。
  // yahooSearchUrlは「シュレッダー+ブランド名」の検索結果(ジャンル無指定)に優良配送(astk=2)を付けた形で、
  // 実際にブラウザで件数が絞り込まれることを確認済み(フィルタ無→有: アイリス1,845→189 / サンワ963→118 /
  // 明光1,168→23 / ナカバヤシ2,804→194)。画像は各ブランドのYahoo!ショッピング実商品の画像URLを
  // 外部参照(自社ホスティングなし)。バッジ・訴求文字入りの画像は避けた。説明文は各社公式サイトの本文で
  // 確認できた事実のみ(「国内シェアNo.1」等の自称は出典付きで検証できないため使わない)。
  popularBrands: [
    {
      brand: "IRIS OHYAMA",
      displayName: "アイリスオーヤマ / IRIS OHYAMA",
      description: "「パーソナルシュレッダー」と「オフィスシュレッダー」の2シリーズで、シュレッダーを型番別に展開しています。",
      history: "公式サイトの商品情報では、パーソナルシュレッダーとオフィスシュレッダーを型番ごとに仕様付きで掲載しています。",
      features: [
        "オフィスシュレッダーOF16Jは、A4コピー用紙を一度に最大16枚、クロスカット(約4×34mm)で細断(公式仕様)",
        "OF16Jのダストボックス容量は約23L(同)",
        "OF16Jのメーカー保証はお買上げ日から1年間(同)",
      ],
      popularTypes: ["オフィスシュレッダー OF16J", "パーソナルシュレッダー P5GCX2", "オートフィードシュレッダー AFSB60C"],
      image: {
        src: "https://item-shopping.c.yimg.jp/i/j/y-kojima_4967576698436?resolution=2x",
        alt: "アイリスオーヤマ オートフィードシュレッダー",
      },
      yahooSearchUrl:
        "https://shopping.yahoo.co.jp/search/%E3%82%B7%E3%83%A5%E3%83%AC%E3%83%83%E3%83%80%E3%83%BC+%E3%82%A2%E3%82%A4%E3%83%AA%E3%82%B9%E3%82%AA%E3%83%BC%E3%83%A4%E3%83%9E/0/?astk=2",
    },
    {
      brand: "SANWA SUPPLY",
      displayName: "サンワサプライ / SANWA SUPPLY",
      description: "PC・周辺機器で知られるサンワサプライが、手動のハンドシュレッダーから電動手差し、オートフィードまで幅広いシュレッダーを展開しています。",
      history: "公式サイトのシュレッダー製品ページでは、手動・電動手差し・オートフィードのタイプ別に、最大細断枚数と細断方式を一覧で掲載しています。",
      features: [
        "オートフィードタイプは最大200枚(PSD-M200AT・PSD-C200AT)",
        "ペーパー&CDシュレッダーPSD-M4010は、A4を最大10枚、マイクロカット(2×12mm)で細断",
        "手動のハンドシュレッダー(PSD-12・PSD-MC2223)も展開",
      ],
      popularTypes: ["PSD-M4010", "PSD-AA6212", "PSD-MC2223"],
      image: {
        src: "https://item-shopping.c.yimg.jp/i/j/y-kojima_4969887898536?resolution=2x",
        alt: "サンワサプライ ペーパー&CDシュレッダー PSD-M4010",
      },
      yahooSearchUrl:
        "https://shopping.yahoo.co.jp/search/%E3%82%B7%E3%83%A5%E3%83%AC%E3%83%83%E3%83%80%E3%83%BC+%E3%82%B5%E3%83%B3%E3%83%AF%E3%82%B5%E3%83%97%E3%83%A9%E3%82%A4/0/?astk=2",
    },
    {
      brand: "明光商会",
      displayName: "明光商会 / MSシュレッダー",
      description: "シュレッダーを中心に事務用機器を製造販売する明光商会が、「MSシュレッダー」を展開しています。",
      history: "公式サイトの会社概要によると、株式会社明光商会は2004年9月に設立され、シュレッダーやボイスコールなどの製造販売のほか、保守・修理・回収・リサイクル業務を行っています。",
      features: [
        "MSE-17Cは最大細断17枚(A4)、定格12枚(公式仕様)",
        "MSE-17Cのくず箱容量は26.5L、キャスター付き(同)",
        "MSE-17Cは紙が見えなくなってから約10秒後に自動停止するオートストップ機能付き(同)",
      ],
      popularTypes: ["MSE-17C", "MSE-14MC"],
      image: {
        src: "https://item-shopping.c.yimg.jp/i/j/aprice_4993460141474?resolution=2x",
        alt: "明光商会 シュレッダー MSE17C",
      },
      yahooSearchUrl:
        "https://shopping.yahoo.co.jp/search/%E3%82%B7%E3%83%A5%E3%83%AC%E3%83%83%E3%83%80%E3%83%BC+%E6%98%8E%E5%85%89%E5%95%86%E4%BC%9A/0/?astk=2",
    },
    {
      brand: "ナカバヤシ",
      displayName: "ナカバヤシ / Nakabayashi",
      description: "ナカバヤシが「パーソナルシュレッダ」シリーズを展開しています。連続使用時間や細断方式の異なる複数のモデルがあります。",
      history: "公式サイトでは、パーソナルシュレッダの各モデルを仕様付きで掲載し、ニュースリリースでA4タテを約3秒で細断できる時短ハイスピードシュレッダの発売も案内しています。",
      features: [
        "パーソナルシュレッダ506は、連続使用時間15分で約600枚を細断(公式仕様)",
        "506はマイクロカット(約2×15mm)、最大細断枚数8枚(A4)(同)",
        "506のダストボックス容量は約13L、グリーン購入法適合製品(同)",
      ],
      popularTypes: ["パーソナルシュレッダ506(NSE-506BK)", "パーソナルシュレッダ HES203W", "パーソナルシュレッダ HES205W"],
      image: {
        src: "https://item-shopping.c.yimg.jp/i/j/lamd_490220572253?resolution=2x",
        alt: "ナカバヤシ パーソナルシュレッダ506 NSE-506BK",
      },
      yahooSearchUrl:
        "https://shopping.yahoo.co.jp/search/%E3%82%B7%E3%83%A5%E3%83%AC%E3%83%83%E3%83%80%E3%83%BC+%E3%83%8A%E3%82%AB%E3%83%90%E3%83%A4%E3%82%B7/0/?astk=2",
    },
  ],
};

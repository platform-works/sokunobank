import type { CommerceCategoryConfig } from "../types";

// 発電機・ポータブル電源カテゴリー固有の値。docs/new-category-checklist.md の手順1(実データ調査、
// 2026-09-27実施)に基づいて requiredKeywords/excludeKeywords/revenueScoreReferenceMax を校正した。
//
// 「発電機」と「ポータブル電源」はYahoo!ショッピング上では別ジャンル(その他発電機/ポータブル電源)
// に分かれているが、ユーザー指示により1カテゴリーとして統合している(検索語はOR的に両方使う)。
// EENOURのように両方を併売するブランドもあり、統合すること自体は実データ的にも妥当と確認した。
export const generatorConfig: CommerceCategoryConfig = {
  slug: "generator",
  name: "発電機・ポータブル電源",
  apiPath: "/api/generator/products/",
  // 2026-09-30改訂: Yahoo!検索広告の実績(「ポータブル電源 購入」「発電機 購入」「災害 発電機」等)で
  // 反応の強かった購入・災害の意図に合わせた。URL・canonicalは変更しない。
  pageTitle: "発電機・ポータブル電源を比較・購入｜最短配送の商品を探す",
  metaDescription:
    "災害・防災、家庭用、工事・業務用、キャンプ、車中泊の用途から必要な容量(Wh)・出力(W)を選び、Yahoo!ショッピングで最短翌日お届け対象の発電機・ポータブル電源を探せます。BLUETTI・Jackery・EENOUR等のブランドも。",
  h1: "発電機・ポータブル電源を比較・購入｜即納・最短配送の商品を探す",
  subheadline: "防災・家庭用・工事・アウトドア用途から、必要な容量・出力と最短配送の商品を探せます。",
  deliveryNote:
    "在庫・配送予定は変動します。購入前にYahoo!ショッピングの商品ページで最新のお届け予定をご確認ください。",
  intro:
    "選択したお届け先に対して、配送スピード・レビュー・ストア評価・価格などを総合して商品を掲載しています。配送予定・価格・在庫は随時変動します。最終的な到着予定日はYahoo!ショッピングの商品ページでご確認ください。",
  // 2026-09-27調査: 「発電機」「ポータブル電源」それぞれ単独で検索しても無関係な商品の混入は
  // 少なく、両語をOR条件の必須キーワードにするだけで実用上十分と確認した(100件サンプルの
  // 商品名を確認し、明確な無関係品は自動車用オルタネーター部品1件のみで、これはrequiredKeywords
  // 側で自動的に除外される)。
  searchQueries: ["発電機", "ポータブル電源"],
  requiredKeywords: ["発電機", "ポータブル電源"],
  // 2026-09-27実データ調査: 「Jackery SolarSaga100 ソーラーパネル...発電機 ポータブル電源充電器」
  // のような、ソーラーパネル単体(本体ではない充電用アクセサリー)がrequiredKeywordsを
  // すり抜けて混入することを確認した。「ソーラーチャージャー」はこの種の単体パネル商品の
  // 商品名に特徴的に使われる語(「Solar Generator ... セット」のような本体+パネルの
  // 正規セット商品には使われない)ため、これのみを除外語に追加した。
  excludeKeywords: ["ソーラーチャージャー", "オルタネーター", "ダイナモ", "ケース", "カバー", "収納バッグ", "延長コード", "ステッカー"],
  // カテゴリー共通の長納期系除外(商品名+説明文の両方をチェック)
  longLeadTimeExcludeKeywords: ["お取り寄せ", "取り寄せ", "予約商品", "入荷次第", "入荷未定", "受注生産", "メーカー取寄"],
  sortOptions: [
    { key: "recommended", label: "即納おすすめ" },
    { key: "deliveryAsc", label: "最短お届け順" },
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
  // 2026-09-27調査: 「発電機」「ポータブル電源」100件サンプルの想定成果報酬額は中央値約798円・
  // 最大約3,589円(BLUETTI AORA 300、35.89万円×1%)。他カテゴリーより中央値・最大値ともに
  // 高水準な高単価カテゴリーのため、最大値付近を基準値とした。
  revenueScoreReferenceMax: 3500,
  // 中央値798円のため、他カテゴリー共通の500円足切りでも影響は比較的小さいと想定される。
  minEstimatedCommission: 500,
  // 2026-09-30: STEPでの用途・容量・出力の絞り込みは取得済みの商品が母数になるため、他カテゴリーより
  // 多めに集める(実測: 目標100件→最終86件・API2回、目標200件→最終155件・API4回)。
  candidatesTargetCount: 200,
  maxDisplayCount: 150,
  seoSections: [
    {
      heading: "発電機・ポータブル電源を選ぶときの確認点",
      body: [
        "まず、使う場所を決めます。屋内で使うなら排気を出さないバッテリー式のポータブル電源、屋外の風通しの良い場所で使うならエンジン式の発電機も候補になります。エンジン式は屋内・自動車内・テント内では使用できません。",
        "次に、動かしたい機器の消費電力(W)を合計して必要な出力を、消費電力(W)×使う時間(h)を合計して必要な容量(Wh)を確認します。商品名に容量(Wh)や定格出力(W)が明記されている商品は、本ページのカードにも表示しています。",
      ],
    },
    {
      heading: "急ぎで手配するときの注意点",
      body: [
        "急ぎの場合はスペック比較だけでなく、到着予定日の確認が重要です。お届け先を選ぶと、Yahoo!ショッピングが判定した「明日お届け対象」「翌々日お届け対象」を商品ごとに表示します。",
        "本ページの配送目安はYahoo!ショッピングのAPIから取得できる情報を基にした表示です。最終的な到着予定日は商品ページで確認してください。",
      ],
    },
  ],
  faq: [
    {
      question: "発電機とポータブル電源はどちらを選べばよいですか？",
      answer:
        "屋内で使いたい場合や排気を出したくない場合は、バッテリー式のポータブル電源が候補です。屋外に安全な設置場所があり、大きな出力や長い運転時間が必要な場合はエンジン式の発電機も候補になります。エンジン式の発電機は、屋内・自動車内・テント内では使用できません。",
    },
    {
      question: "ポータブル電源は何Whあれば足りますか？",
      answer:
        "使う機器の消費電力(W)×使用時間(h)×台数を合計した値が、必要な容量(Wh)の目安です。変換ロス等のため、表示されている容量のすべてを使えるわけではないので、余裕を持たせてください。本ページの「必要容量は何Wh?」の計算ツールで目安を確認できます。",
    },
    {
      question: "災害時に発電機やポータブル電源で何が使えますか？",
      answer:
        "使える機器は、製品の定格出力(W)とバッテリー容量(Wh)で決まります。冷蔵庫・照明・スマートフォン・Wi-Fiルーターなどの消費電力の目安は、本ページの「災害・防災用に選ぶ」の表で確認できます。機種により異なるため、実際の消費電力は機器の銘板や取扱説明書で確認してください。",
    },
    {
      question: "発電機の一酸化炭素中毒を防ぐには？",
      answer:
        "エンジン式の発電機は、屋内では絶対に使用せず、自動車内やテント内でも使用しないでください。排ガスが逆流しないよう、出入口や窓などの開口部から離れた風通しの良い屋外で使用します(NITE・消費者庁)。詳しくは本ページの「安全情報」をご覧ください。",
    },
    {
      question: "最短でいつ届く商品を探せますか？",
      answer:
        "お届け先の都道府県を選択すると、Yahoo!ショッピングが判定した「明日お届け対象」「翌々日お届け対象」を商品ごとに表示します。到着希望で「明日まで」を選ぶと、翌日到着対象として取得できた商品に絞り込めます。当日(今日中)の到着は多くの場合現実的でないため、本ページでは選択肢として用意していません。在庫状況や締切時刻により対象商品は変動します。",
    },
    {
      question: "お届け先によって商品は変わりますか？",
      answer:
        "はい。配送スピードは地域によって異なるため、お届け先の都道府県を変更すると表示される商品・配送目安が変わります。",
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
  // 2026-09-27: office-chair/projector/monitorで確立した「即納人気ブランドから探す」テンプレートを
  // 移植(.claude/skills/add-popular-brand-section/SKILL.md参照)。「発電機」と「ポータブル電源」が
  // Yahoo!ショッピング上で別ジャンル(その他発電機=76798/ポータブル電源=77092)に分かれているため、
  // 単一のgenreCategoryIdには絞らず、genre "0"(無指定)+カテゴリー名+ブランド名のキーワード検索で
  // 実際にブラウザで結果件数・優良配送(astk=2)フィルタを操作し、正しく絞り込まれることを
  // 確認済み(BLUETTI 102件/Jackery 416件/EENOUR 174件)。画像は各ブランドのYahoo!ショッピング
  // 実商品データから取得し、自社ホスティングはしていない。説明文は各社公式サイトで確認できた
  // 事実のみを記載している。
  popularBrands: [
    {
      brand: "BLUETTI",
      displayName: "BLUETTI / ブルーティ",
      description:
        "ポータブル電源を展開するブランドで、主力の「AORA」シリーズはリン酸鉄(LiFePO4)バッテリーを採用しています。日常使い・防災・車中泊・キャンプ向けに複数容量のラインナップを持ちます。",
      history: "「AORA」シリーズを中心に、世界最軽量級をうたうモデルや日本限定カラーの展開など、日本市場向けの製品開発を行っています。",
      features: ["リン酸鉄(LiFePO4)バッテリー採用で長寿命", "AORAシリーズを複数容量で展開", "日本限定カラーのモデルあり"],
      popularTypes: ["AORA 300", "AORA 200", "AORA 100 V2"],
      image: {
        src: "https://item-shopping.c.yimg.jp/i/j/poweroak_aora300-jp-gy-yahjp-00?resolution=2x",
        alt: "BLUETTI ポータブル電源 AORA 300",
      },
      yahooSearchUrl: "https://shopping.yahoo.co.jp/search/%E3%83%9D%E3%83%BC%E3%82%BF%E3%83%96%E3%83%AB%E9%9B%BB%E6%BA%90+BLUETTI/0/?astk=2",
    },
    {
      brand: "Jackery",
      displayName: "Jackery / ジャクリ",
      description:
        "ポータブル電源・ソーラーパネルを展開するブランドで、公式サイトによると創立14年で世界累計販売台数700万台を突破しています。",
      history:
        "第三者調査機関(フロスト＆サリバン社、2026年3月調査)によると、2019年から2025年の日本国内「ポータブル電源およびポータブルソーラーパネル」市場で年間販売額・販売台数が7年連続第1位。ソーラーパネルとセットの「Solar Generator」シリーズも展開しています。",
      features: ["ソーラーパネルとセットの「Solar Generator」シリーズを展開", "500Whクラスから5000Whクラスまで幅広い容量帯", "リン酸鉄バッテリー採用モデルが中心"],
      popularTypes: ["ポータブル電源 2000 New", "Solar Generator 1000 New", "ポータブル電源 3000 New"],
      image: {
        src: "https://item-shopping.c.yimg.jp/i/j/jackery-japan_21-0001-000268?resolution=2x",
        alt: "Jackery ポータブル電源 2000 New V2",
      },
      yahooSearchUrl: "https://shopping.yahoo.co.jp/search/%E3%83%9D%E3%83%BC%E3%82%BF%E3%83%96%E3%83%AB%E9%9B%BB%E6%BA%90+Jackery/0/?astk=2",
    },
    {
      brand: "EENOUR",
      displayName: "EENOUR / イーノウ",
      description:
        "インバーター発電機とポータブル電源の両方を展開するブランドです。ガソリン式・カセットボンベ式・デュアルフューエル式など複数方式の発電機を扱っています。",
      history: "公式サイトでは「インバーター発電機」シリーズ(H2500iS/H3000iS/DK3000iS等)と「ポータブル電源」シリーズ(P2001 PLUS等)の両方を製品ラインナップとして展開しています。",
      features: ["ガソリン式・カセットボンベ式・デュアルフューエル式など複数方式の発電機を展開", "ポータブル電源(バッテリー式)も並行して展開", "キッチンカー・農業用途向けの高出力モデルもあり"],
      popularTypes: ["インバーター発電機H3000iS", "インバーター発電機DK3000iS", "ポータブル電源P2001 PLUS"],
      image: {
        src: "https://item-shopping.c.yimg.jp/i/j/e-techpowershop_1800916001?resolution=2x",
        alt: "EENOUR 発電機 インバーター 3000W エンジン発電機",
      },
      yahooSearchUrl: "https://shopping.yahoo.co.jp/search/%E7%99%BA%E9%9B%BB%E6%A9%9F+EENOUR/0/?astk=2",
    },
    // 2026-09-30追加。EcoFlow / Anker Solix / Honda。説明は公式サイトまたはYahoo!ショッピングの公式ストア
    // 掲載の仕様で本文確認できた事実のみ(「世界一」等の出典未確認の表現は使わない)。画像は各社の
    // Yahoo!ショッピング実商品の画像URLを外部参照(自社ホスティングなし)。Yamahaは発電機事業が
    // 2025年12月末で終了(事業譲渡先はWillbe)しているため追加していない。
    {
      brand: "EcoFlow",
      displayName: "EcoFlow / エコフロー",
      description: "ポータブル電源を展開するブランドで、Yahoo!ショッピングでは公式ストアが「DELTA」シリーズを取り扱っています。",
      history: "Yahoo!ショッピングの公式ストアでは、DELTA 3 Plus・DELTA 3 Classic・DELTA 3 Maxなど、DELTA 3シリーズの複数モデルが販売されています。",
      features: [
        "DELTA 3 Plusは容量1024Wh・定格出力1500W(公式ストア掲載の仕様)",
        "リン酸鉄リチウムイオン電池・サイクル寿命4,000回(同)",
        "AC充電で最短56分(同)",
      ],
      popularTypes: ["DELTA 3 Plus", "DELTA 3 Classic", "DELTA 3 Max"],
      image: {
        src: "https://item-shopping.c.yimg.jp/i/j/ksdenki_4895251630023?resolution=2x",
        alt: "EcoFlow ポータブル電源 DELTA 3 Plus",
      },
      yahooSearchUrl: "https://shopping.yahoo.co.jp/search/%E3%83%9D%E3%83%BC%E3%82%BF%E3%83%96%E3%83%AB%E9%9B%BB%E6%BA%90+EcoFlow/0/?astk=2",
    },
    {
      brand: "Anker Solix",
      displayName: "Anker Solix / アンカー ソリックス",
      description: "Anker Japanが「Solix(ソリックス)」シリーズとして展開するポータブル電源で、公式サイトで複数のモデルを扱っています。",
      history: "公式サイトの製品ページでは、C1000 Gen 2などのモデルの仕様と、Ankerでの会員登録による保証延長が案内されています。",
      features: [
        "C1000 Gen 2は容量1024Wh・定格出力1500W(公式仕様)",
        "リン酸鉄リチウムイオン電池・サイクル回数4,000回以上(同)",
        "会員登録で最大5年保証(18か月保証+42か月延長、同)",
      ],
      popularTypes: ["Anker Solix C1000 Gen 2", "Anker Solix C2000 Gen 2", "Anker Solix C300"],
      image: {
        src: "https://item-shopping.c.yimg.jp/i/j/ankerdirect_a1763-1?resolution=2x",
        alt: "Anker Solix C1000 Gen 2 ポータブル電源",
      },
      yahooSearchUrl: "https://shopping.yahoo.co.jp/search/%E3%83%9D%E3%83%BC%E3%82%BF%E3%83%96%E3%83%AB%E9%9B%BB%E6%BA%90+Anker+Solix/0/?astk=2",
    },
    {
      brand: "Honda",
      displayName: "Honda / ホンダ",
      description: "Hondaが展開する発電機のブランドで、インバーター発電機のほか、カセットガス式やLPガス式など燃料方式の異なるモデルを揃えています。",
      history: "公式サイトの発電機ラインアップでは、EU9i・EU18i・EU26iJなどのインバーター発電機を中心に、カセットガス式(EU9iGB「エネポ」)、LPガス式(EU9iGP・EU15iGP)を展開しています。",
      features: [
        "カセットガス式の「エネポ」(EU9iGB)やLPガス式(EU9iGP・EU15iGP)など燃料方式が選べる",
        "EG25iは2.5kVAのインバーター発電機(公式ラインアップ)",
        "EU55isは5.5kVAで、単相100V・200Vの同時出力に対応(同)",
      ],
      popularTypes: ["EU9i", "EU18i", "EG25i"],
      image: {
        src: "https://item-shopping.c.yimg.jp/i/j/star-fields_eg25i?resolution=2x",
        alt: "Honda インバーター発電機 EG25i",
      },
      yahooSearchUrl: "https://shopping.yahoo.co.jp/search/%E7%99%BA%E9%9B%BB%E6%A9%9F+Honda/0/?astk=2",
    },
  ],
};

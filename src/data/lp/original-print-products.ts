// Up-T LPの商品マスター(独立した設定ファイル)。
//
// 方針:
// - 表示する商品は、ユーザーから提示されたUp-Tの商品カテゴリ画像に載っている項目のみ(publish: true)。
// - Up-T公式サイトは取得できず(ENOTFOUND)、正式な商品名・販売状況は未照合。
//   `verified: false` の間は、画面に「取り扱い・仕様はUp-T公式で確認」と明記する。
// - ユーザー指示の商品リスト(クラスTシャツ・パンツ・バッジ・ステッカー・アクリルグッズ・文具・印刷物等)は、
//   カテゴリ画像に載っていないため publish: false で保持。公式で確認でき次第 publish を true にする。
// - 説明文はUp-T公式で確認できていない事実(納期・価格・対応可否)を含めない。

export type ProductGroupId = "wear" | "bag" | "goods" | "other";

export interface ProductGroup {
  id: ProductGroupId;
  label: string;
}

export const PRODUCT_GROUPS: ProductGroup[] = [
  { id: "wear", label: "ウェア" },
  { id: "bag", label: "バッグ・タオル" },
  { id: "goods", label: "雑貨・グッズ" },
  { id: "other", label: "その他" },
];

export interface ProductUse {
  title: string;
  sub: string;
  /** 利用シーン写真(public/images/lp/original-print/ 配下のパス。未設定の間はイメージ図を表示) */
  image?: { src: string; srcset?: string; width: number; height: number; alt: string };
}

export interface Product {
  id: string;
  /** 画面表示名(商品カテゴリ画像の表記) */
  name: string;
  /** 見出し用の短い名称(「オリジナル○○」) */
  shortName: string;
  group: ProductGroupId;
  /** イメージ図のキー(product-art.ts) */
  art: string;
  /** キーワード流入(?item= / ?intent= / utm_term)から商品を特定するための語(小文字比較) */
  keywords: string[];
  /** false の間は画面に出さない(公式との照合待ち) */
  publish: boolean;
  /** 正式な商品名・販売状況をUp-T公式と照合済みか */
  verified: boolean;
  lead: string;
  /** ヒーロー見出し(h1)の強調部分。「オリジナル○○、<catchcopy>」の形で表示する。納期・価格・対応可否を断定しない */
  catchcopy: string;
  /** ヒーローのサブコピー(未回答時)。広告文と整合させる。公式で未確認の事実は書かない */
  subcopy: string;
  uses: ProductUse[];
  design: string[];
  checks: string[];
}

const DESIGN_COMMON = [
  "手持ちのデザインデータを入稿する",
  "ラフ案をもとに、デザインの進め方を公式で確認する",
  "デザインがない場合の方法(自分で作る・相談するなど)を公式で確認する",
];

export const PRODUCTS: Product[] = [
  {
    id: "tshirt",
    name: "Tシャツ・ウェア",
    shortName: "Tシャツ",
    group: "wear",
    art: "tshirt",
    keywords: ["tシャツ", "ティーシャツ", "tshirt", "t-shirt", "クラスt", "クラtシャツ", "ウェア"],
    publish: true,
    verified: false,
    lead: "クラス・サークル・イベントのおそろいに。人数分のサイズ内訳を決めておくと、注文がスムーズです。",
    catchcopy: "急ぎでも簡単発注。",
    subcopy: "デザインデータがあっても、なくても。必要な枚数と使用日から発注方法をチェック。",
    uses: [
      { title: "クラス・サークル", sub: "文化祭・体育祭・部活に" },
      { title: "企業・スタッフ", sub: "展示会・店舗・社内イベントに" },
      { title: "イベント・大会", sub: "地域イベント・運動会に" },
      { title: "記念・プレゼント", sub: "卒業・周年の記念に" },
    ],
    design: DESIGN_COMMON,
    checks: ["サイズ別・色別の枚数(全員分のサイズを集計)", "印刷する位置(前・背中など)と大きさ", "使用日と、受け取りに必要な日程"],
  },
  {
    id: "hoodie",
    name: "パーカー・スウェット",
    shortName: "パーカー",
    group: "wear",
    art: "hoodie",
    keywords: ["パーカー", "スウェット", "トレーナー", "hoodie", "sweat"],
    publish: true,
    verified: false,
    lead: "部活・サークルのチームウェアに。サイズ展開と色を、全員分そろえて決めておくと進めやすくなります。",
    catchcopy: "部活・サークルのおそろいに。",
    subcopy: "パーカー・スウェットのサイズと色を全員分そろえて、発注方法をチェック。",
    uses: [
      { title: "部活・チーム", sub: "チームウェア・応援に" },
      { title: "サークル・学校", sub: "学園祭・卒業記念に" },
      { title: "企業・店舗", sub: "スタッフウェア・社内に" },
      { title: "記念・プレゼント", sub: "周年・贈り物に" },
    ],
    design: DESIGN_COMMON,
    checks: ["サイズ別・色別の枚数", "印刷する位置(胸・背中・袖など)と大きさ", "使用日と、受け取りに必要な日程"],
  },
  {
    id: "polo",
    name: "ポロシャツ",
    shortName: "ポロシャツ",
    group: "wear",
    art: "polo",
    keywords: ["ポロシャツ", "ポロ", "polo"],
    publish: true,
    verified: false,
    lead: "店舗・受付・イベント運営のユニフォームに。ロゴの位置と大きさを決めておくと確認がスムーズです。",
    catchcopy: "スタッフのユニフォームに。",
    subcopy: "ロゴの位置と大きさ、サイズ別の枚数から、発注方法をチェック。",
    uses: [
      { title: "店舗・受付", sub: "スタッフユニフォームに" },
      { title: "展示会・イベント", sub: "運営スタッフの目印に" },
      { title: "団体・チーム", sub: "ゴルフコンペ・大会に" },
      { title: "記念品", sub: "周年・表彰に" },
    ],
    design: DESIGN_COMMON,
    checks: ["サイズ別・色別の枚数", "ロゴを入れる位置(胸・背中)と大きさ", "使用日と、受け取りに必要な日程"],
  },
  {
    id: "cap",
    name: "キャップ",
    shortName: "キャップ",
    group: "wear",
    art: "cap",
    keywords: ["キャップ", "帽子", "cap"],
    publish: true,
    verified: false,
    lead: "イベントスタッフやチームの目印に。刺しゅう・プリントなどの加工方法は商品ごとに異なります。",
    catchcopy: "チームやスタッフの目印に。",
    subcopy: "個数と色、デザインを入れる位置から、発注方法をチェック。",
    uses: [
      { title: "イベント・スタッフ", sub: "運営スタッフの目印に" },
      { title: "チーム・部活", sub: "大会・遠征に" },
      { title: "販促・ノベルティ", sub: "来場者への配布に" },
      { title: "記念", sub: "卒業・周年の記念に" },
    ],
    design: DESIGN_COMMON,
    checks: ["個数と色", "デザインを入れる位置と大きさ", "使用日と、受け取りに必要な日程"],
  },
  {
    id: "apron",
    name: "エプロン・作業着",
    shortName: "エプロン",
    group: "wear",
    art: "apron",
    keywords: ["エプロン", "作業着", "apron", "ワークウェア"],
    publish: true,
    verified: false,
    lead: "店舗・工房・イベント運営の制服に。丈やサイズ展開は商品ごとに異なるため、商品ページで確認できます。",
    catchcopy: "店舗・イベントの制服に。",
    subcopy: "サイズと枚数、使用日から、発注方法をチェック。",
    uses: [
      { title: "飲食・店舗", sub: "制服・スタッフ用に" },
      { title: "工房・作業", sub: "制作・体験イベントに" },
      { title: "イベント運営", sub: "出店・販売スタッフに" },
      { title: "団体・チーム", sub: "ボランティア活動に" },
    ],
    design: DESIGN_COMMON,
    checks: ["サイズ・色別の個数", "ロゴの位置と大きさ", "使用日と、受け取りに必要な日程"],
  },
  {
    id: "tote",
    name: "バッグ・トート",
    shortName: "トートバッグ",
    group: "bag",
    art: "tote",
    keywords: ["トート", "トートバッグ", "エコバッグ", "バッグ", "tote", "bag"],
    publish: true,
    verified: false,
    lead: "展示会・イベントの配布やショップのノベルティに。印刷範囲とサイズを決めておくと確認がスムーズです。",
    catchcopy: "配布やノベルティに。",
    subcopy: "印刷範囲とサイズ、個数から、発注方法をチェック。",
    uses: [
      { title: "展示会・イベント", sub: "来場者への配布に" },
      { title: "ショップ", sub: "ノベルティ・購入特典に" },
      { title: "学校・サークル", sub: "学園祭・記念品に" },
      { title: "記念・プレゼント", sub: "周年・贈り物に" },
    ],
    design: DESIGN_COMMON,
    checks: ["印刷範囲とバッグのサイズ", "生地・色(画面と実物で見え方が異なる場合あり)", "使用日と、受け取りに必要な日程"],
  },
  {
    id: "towel",
    name: "タオル・ハンカチ",
    shortName: "タオル",
    group: "bag",
    art: "towel",
    keywords: ["タオル", "ハンカチ", "towel", "マフラータオル"],
    publish: true,
    verified: false,
    lead: "応援・イベント配布・周年記念に。デザインを入れられる範囲は商品ごとに異なります。",
    catchcopy: "応援・配布・記念に。",
    subcopy: "デザインを入れる範囲と個数から、発注方法をチェック。",
    uses: [
      { title: "部活・応援", sub: "大会・ライブの応援に" },
      { title: "イベント配布", sub: "来場者・参加者へ" },
      { title: "周年・記念", sub: "企業・団体の記念に" },
      { title: "販促", sub: "ノベルティ・粗品に" },
    ],
    design: DESIGN_COMMON,
    checks: ["デザインを入れる範囲とサイズ", "色数・色味(画面と実物で見え方が異なる場合あり)", "使用日と、受け取りに必要な日程"],
  },
  {
    id: "mug",
    name: "マグカップ",
    shortName: "マグカップ",
    group: "goods",
    art: "mug",
    keywords: ["マグカップ", "マグ", "カップ", "mug", "コップ"],
    publish: true,
    verified: false,
    lead: "企業ノベルティ・卒業記念・プレゼントに。印刷できる範囲と色の再現は商品ごとに異なります。",
    catchcopy: "ノベルティ・記念品に。",
    subcopy: "印刷できる範囲と個数、使用日から、発注方法をチェック。",
    uses: [
      { title: "企業ノベルティ", sub: "来場者・取引先への配布に" },
      { title: "卒業・記念", sub: "卒業記念・周年記念に" },
      { title: "プレゼント", sub: "贈り物・お礼に" },
      { title: "イベントグッズ", sub: "展示・イベント来場者に" },
    ],
    design: DESIGN_COMMON,
    checks: ["印刷できる範囲と向き", "色の再現(画面と実物で見え方が異なる場合あり)", "使用日と、受け取りに必要な日程"],
  },
  {
    id: "phonecase",
    name: "スマホケース",
    shortName: "スマホケース",
    group: "goods",
    art: "phonecase",
    keywords: ["スマホケース", "スマホ", "iphone", "アイフォン", "スマートフォンケース", "phonecase"],
    publish: true,
    verified: false,
    lead: "個人制作やイベントグッズに。対応機種は商品ごとに異なるため、機種名を決めておくと確認がスムーズです。",
    catchcopy: "自分だけのデザインで。",
    subcopy: "機種名とデザインから、発注方法をチェック。",
    uses: [
      { title: "個人のオリジナル", sub: "自分だけの1点に" },
      { title: "イベントグッズ", sub: "イベント・サークルのグッズに" },
      { title: "クリエイター", sub: "作品を形にするときに" },
      { title: "プレゼント", sub: "贈り物・記念に" },
    ],
    design: DESIGN_COMMON,
    checks: ["対応する機種名・型番", "デザインの余白(カメラ位置など)", "使用日と、受け取りに必要な日程"],
  },
  {
    id: "keyholder",
    name: "キーホルダー",
    shortName: "キーホルダー",
    group: "goods",
    art: "keyholder",
    keywords: ["キーホルダー", "キーリング", "アクリルキーホルダー", "keyholder"],
    publish: true,
    verified: false,
    lead: "イベント配布や記念品に。形やサイズは商品ごとに異なります。",
    catchcopy: "イベント配布・記念品に。",
    subcopy: "形・サイズと個数から、発注方法をチェック。",
    uses: [
      { title: "イベント配布", sub: "来場者・参加者へ" },
      { title: "記念品", sub: "卒業・周年の記念に" },
      { title: "団体のグッズ", sub: "サークル・チームの目印に" },
      { title: "プレゼント", sub: "贈り物・お礼に" },
    ],
    design: DESIGN_COMMON,
    checks: ["サイズ・形(商品ごとに異なります)", "デザインの余白", "使用日と、受け取りに必要な日程"],
  },
  {
    id: "other",
    name: "その他",
    shortName: "グッズ",
    group: "other",
    art: "other",
    keywords: [],
    publish: true,
    verified: false,
    lead: "作りたいものに合わせて、取り扱い商品をUp-T公式で確認できます。",
    catchcopy: "作りたいものから選んで。",
    subcopy: "作りたいものと使用日から、発注方法をチェック。",
    uses: [
      { title: "学校・サークル", sub: "学園祭・部活に" },
      { title: "企業・店舗", sub: "販促・社内イベントに" },
      { title: "イベント", sub: "展示会・地域行事に" },
      { title: "記念・プレゼント", sub: "卒業・周年の記念に" },
    ],
    design: DESIGN_COMMON,
    checks: ["作りたいものの種類と用途", "必要な数量", "使用日と、受け取りに必要な日程"],
  },
  // --- 公式との照合待ち(カテゴリ画像に未掲載。publish を true にするまで画面に出さない) ---
  ...[
    ["class-tshirt", "クラスTシャツ", "クラスTシャツ", "wear", "tshirt"],
    ["shirt", "シャツ", "シャツ", "wear", "polo"],
    ["pants", "パンツ", "パンツ", "wear", "other"],
    ["uniform", "ユニフォーム", "ユニフォーム", "wear", "polo"],
    ["badge", "バッジ", "バッジ", "goods", "keyholder"],
    ["sticker", "ステッカー", "ステッカー", "goods", "other"],
    ["acrylic", "アクリルグッズ", "アクリルグッズ", "goods", "keyholder"],
    ["stationery", "文具", "文具", "other", "other"],
    ["printed", "印刷物", "印刷物", "other", "other"],
  ].map(
    ([id, name, shortName, group, art]): Product => ({
      id,
      name,
      shortName,
      group: group as ProductGroupId,
      art,
      keywords: [name.toLowerCase()],
      publish: false,
      verified: false,
      lead: "取り扱い・仕様はUp-T公式でご確認ください。",
      catchcopy: "急ぎでも簡単発注。",
      subcopy: "デザインデータがあっても、なくても。必要な枚数と使用日から発注方法をチェック。",
      uses: [],
      design: DESIGN_COMMON,
      checks: ["必要な数量", "デザインを入れる位置と大きさ", "使用日と、受け取りに必要な日程"],
    }),
  ),
];

export const PUBLISHED_PRODUCTS: Product[] = PRODUCTS.filter((p) => p.publish);
export const DEFAULT_PRODUCT_ID = "tshirt";

export function getProduct(id: string | null | undefined): Product | undefined {
  return PUBLISHED_PRODUCTS.find((p) => p.id === id);
}

/** キーワード(URLパラメータ値)から商品を特定する。曖昧な場合(複数一致)は特定しない */
export function detectProduct(values: string[]): Product | undefined {
  const text = values.map((v) => v.toLowerCase()).join(" ");
  if (!text.trim()) return undefined;
  const hits = PUBLISHED_PRODUCTS.filter((p) => p.id === text.trim() || p.keywords.some((k) => k && text.includes(k)));
  return hits.length === 1 ? hits[0] : undefined;
}

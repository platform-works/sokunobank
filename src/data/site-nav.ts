// トップページの導線(目的から探す/部署から探す等)用の設定データ。
// カテゴリーデータ(src/data/categories/*.json)とは別枠のサイト構造情報。
// href を省略した項目は、対応するカテゴリーページがまだ無いことを意味し、
// UI上は「準備中」として非活性表示にする(リンク切れを作らないため)。

export interface NavLink {
  label: string;
  href?: string;
}

/** ヒーロー検索欄の下に出す人気キーワード */
export const popularKeywords: NavLink[] = [
  { label: "DM発送", href: "/categories/dm/" },
  { label: "会議用プロジェクター", href: "/categories/projector/" },
  { label: "胡蝶蘭", href: "/categories/orchid/" },
  { label: "PCモニター", href: "/categories/monitor/" },
  { label: "オフィスチェア", href: "/categories/office-chair/" },
  { label: "チラシ印刷" },
  { label: "名刺" },
  { label: "封筒" },
  { label: "ノベルティ" },
];

/** 「急ぎの目的から探す」セクション */
export const purposeFinder: NavLink[] = [
  { label: "ダイレクトメールを明日までに発送したい", href: "/categories/dm/" },
  { label: "会議用プロジェクターを明日までに用意したい", href: "/categories/projector/" },
  { label: "開店祝いの胡蝶蘭を明日までに贈りたい", href: "/categories/orchid/" },
  { label: "PCモニターを明日までに用意したい", href: "/categories/monitor/" },
  { label: "オフィスチェアを明日までに用意したい", href: "/categories/office-chair/" },
  { label: "明日までに納品したい" },
  { label: "イベントに間に合わせたい" },
  { label: "急に名刺が必要" },
  { label: "採用説明会の資料が必要" },
];

/** 「部署から探す」セクション */
export interface DepartmentGroup {
  id: string;
  label: string;
  items: NavLink[];
}

export const departmentFinder: DepartmentGroup[] = [
  {
    id: "marketing",
    label: "マーケティング",
    items: [
      { label: "DM発送", href: "/categories/dm/" },
      { label: "チラシ" },
      { label: "ポスター" },
      { label: "ノベルティ" },
    ],
  },
  {
    id: "general-affairs",
    label: "総務",
    items: [
      { label: "名刺" },
      { label: "封筒" },
      { label: "挨拶状" },
      { label: "社内印刷物" },
      { label: "会議用プロジェクター", href: "/categories/projector/" },
      { label: "胡蝶蘭", href: "/categories/orchid/" },
      { label: "PCモニター", href: "/categories/monitor/" },
      { label: "オフィスチェア", href: "/categories/office-chair/" },
    ],
  },
  {
    id: "hr",
    label: "人事・採用",
    items: [
      { label: "採用パンフレット" },
      { label: "説明会資料" },
      { label: "会社案内" },
      { label: "採用ノベルティ" },
    ],
  },
];

/**
 * 「Yahoo!ショッピングから商品を検索し独自ランキングする」型のカテゴリー(DMのような
 * 事業者比較型とは別系統)。src/data/categories/*.json (schema.ts) は使わず、
 * src/lib/commerce/ + src/pages/categories/<slug>/ で独立実装する。
 */
export interface CommerceCategoryLink {
  name: string;
  href: string;
  speedLabel: string;
  speedValue: string;
}

export const commerceCategories: CommerceCategoryLink[] = [
  { name: "会議用プロジェクター", href: "/categories/projector/", speedLabel: "配送目安", speedValue: "最短翌日〜翌々日" },
  { name: "胡蝶蘭", href: "/categories/orchid/", speedLabel: "配送目安", speedValue: "最短翌日〜翌々日" },
  { name: "PCモニター", href: "/categories/monitor/", speedLabel: "配送目安", speedValue: "最短翌日〜翌々日" },
  { name: "オフィスチェア", href: "/categories/office-chair/", speedLabel: "配送目安", speedValue: "最短翌日〜翌々日" },
];

/** カテゴリーカードの並びに出す、まだデータ投入前の将来カテゴリー(名称のみ) */
export const upcomingCategories: string[] = [
  "チラシ印刷",
  "名刺印刷",
  "封筒",
  "ポスター",
  "ノベルティ",
  "会社案内",
  "採用パンフレット",
  "総務用品",
];

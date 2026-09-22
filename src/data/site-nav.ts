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
  { label: "チラシ印刷" },
  { label: "名刺" },
  { label: "封筒" },
  { label: "ノベルティ" },
];

/** 「急ぎの目的から探す」セクション */
export const purposeFinder: NavLink[] = [
  { label: "ダイレクトメールを明日までに発送したい", href: "/categories/dm/" },
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

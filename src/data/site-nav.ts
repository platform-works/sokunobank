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
  { label: "発電機・ポータブル電源", href: "/categories/generator/" },
  { label: "シュレッダー", href: "/categories/shredder/" },
  { label: "プリンター・複合機", href: "/categories/printer/" },
  { label: "ホワイトボード", href: "/categories/whiteboard/" },
  { label: "オフィスデスク・書庫", href: "/categories/office-desk/" },
  { label: "チラシ印刷", href: "/guides/flyer-printing/" },
  { label: "名刺", href: "/guides/business-card-printing/" },
  { label: "封筒", href: "/guides/envelope-printing/" },
  { label: "ノベルティ", href: "/guides/novelty-goods/" },
];

/** 「急ぎの目的から探す」セクション */
export const purposeFinder: NavLink[] = [
  { label: "ダイレクトメールを明日までに発送したい", href: "/categories/dm/" },
  { label: "会議用プロジェクターを明日までに用意したい", href: "/categories/projector/" },
  { label: "開店祝いの胡蝶蘭を明日までに贈りたい", href: "/categories/orchid/" },
  { label: "PCモニターを明日までに用意したい", href: "/categories/monitor/" },
  { label: "オフィスチェアを明日までに用意したい", href: "/categories/office-chair/" },
  { label: "発電機・ポータブル電源を明日までに用意したい", href: "/categories/generator/" },
  { label: "シュレッダーを明日までに用意したい", href: "/categories/shredder/" },
  { label: "プリンター・複合機を明日までに用意したい", href: "/categories/printer/" },
  { label: "ホワイトボードを明日までに用意したい", href: "/categories/whiteboard/" },
  { label: "オフィスデスク・書庫を明日までに用意したい", href: "/categories/office-desk/" },
  // 2026-09-27: この2件は特定の商品名ではなく汎用的な緊急ニーズの言い回しのため、
  // 専用記事を新設するのではなくカテゴリー一覧(全体を横断して探せるページ)へリンクする。
  { label: "明日までに納品したい", href: "/categories/" },
  { label: "イベントに間に合わせたい", href: "/categories/" },
  { label: "急に名刺が必要", href: "/guides/business-card-printing/" },
  { label: "採用説明会の資料が必要", href: "/guides/recruitment-brochure/" },
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
      { label: "チラシ", href: "/guides/flyer-printing/" },
      { label: "ポスター", href: "/guides/poster-printing/" },
      { label: "ノベルティ", href: "/guides/novelty-goods/" },
    ],
  },
  {
    id: "general-affairs",
    label: "総務",
    items: [
      { label: "名刺", href: "/guides/business-card-printing/" },
      { label: "封筒", href: "/guides/envelope-printing/" },
      { label: "挨拶状", href: "/guides/greeting-cards/" },
      { label: "社内印刷物", href: "/guides/internal-print-materials/" },
      { label: "会議用プロジェクター", href: "/categories/projector/" },
      { label: "胡蝶蘭", href: "/categories/orchid/" },
      { label: "PCモニター", href: "/categories/monitor/" },
      { label: "オフィスチェア", href: "/categories/office-chair/" },
      { label: "発電機・ポータブル電源", href: "/categories/generator/" },
      { label: "シュレッダー", href: "/categories/shredder/" },
      { label: "プリンター・複合機", href: "/categories/printer/" },
      { label: "ホワイトボード", href: "/categories/whiteboard/" },
      { label: "オフィスデスク・書庫", href: "/categories/office-desk/" },
    ],
  },
  {
    id: "hr",
    label: "人事・採用",
    items: [
      { label: "採用パンフレット", href: "/guides/recruitment-brochure/" },
      { label: "説明会資料", href: "/guides/recruitment-brochure/" },
      { label: "会社案内", href: "/guides/company-brochure/" },
      { label: "採用ノベルティ", href: "/guides/novelty-goods/" },
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
  { name: "発電機・ポータブル電源", href: "/categories/generator/", speedLabel: "配送目安", speedValue: "最短翌日〜翌々日" },
  { name: "シュレッダー", href: "/categories/shredder/", speedLabel: "配送目安", speedValue: "最短翌日〜翌々日" },
  { name: "プリンター・複合機", href: "/categories/printer/", speedLabel: "配送目安", speedValue: "最短翌日〜翌々日" },
  { name: "ホワイトボード", href: "/categories/whiteboard/", speedLabel: "配送目安", speedValue: "最短翌日〜翌々日" },
  { name: "オフィスデスク・書庫", href: "/categories/office-desk/", speedLabel: "配送目安", speedValue: "最短翌日〜翌々日" },
];

export interface UpcomingCategory {
  name: string;
  /**
   * 任意。まだ商品比較データは無いが簡易的な読み物コンテンツ(ガイド記事)は用意できた場合、
   * そのガイドページへのリンクを設定する(2026-09-27導入)。無ければ「準備中」表示のまま。
   */
  href?: string;
}

/** カテゴリーカードの並びに出す、まだ商品比較データ投入前の将来カテゴリー */
export const upcomingCategories: UpcomingCategory[] = [
  { name: "チラシ印刷", href: "/guides/flyer-printing/" },
  { name: "名刺印刷", href: "/guides/business-card-printing/" },
  { name: "封筒", href: "/guides/envelope-printing/" },
  { name: "ポスター", href: "/guides/poster-printing/" },
  { name: "ノベルティ", href: "/guides/novelty-goods/" },
  { name: "会社案内", href: "/guides/company-brochure/" },
  { name: "採用パンフレット", href: "/guides/recruitment-brochure/" },
  { name: "総務用品", href: "/guides/office-supplies/" },
];

/** トップページ「即納ガイド」セクション用の新規ガイド記事 */
export interface UrgentGuideLink {
  title: string;
  description: string;
  href: string;
}

export const urgentGuides: UrgentGuideLink[] = [
  {
    title: "開店祝いを今日中に選ぶ",
    description: "胡蝶蘭・花を急ぎで手配する方法",
    href: "/guides/urgent-opening-celebration/",
  },
  {
    title: "停電対策を今日中にやる",
    description: "発電機・ポータブル電源・必需品",
    href: "/guides/urgent-power-outage-prep/",
  },
  {
    title: "今日中に発電機を手配する",
    description: "最短配送と注意点",
    href: "/guides/urgent-handle-generator-today/",
  },
  {
    title: "ポータブル電源を今日中に手配する",
    description: "容量選びと翌日配送",
    href: "/guides/urgent-portable-power-station/",
  },
  {
    title: "防災セットを今日中に用意する",
    description: "懐中電灯・乾電池・必需品",
    href: "/guides/urgent-disaster-prep/",
  },
  {
    title: "明日のイベント向け発電機を選ぶ",
    description: "容量選びと配送",
    href: "/guides/urgent-event-generator/",
  },
  {
    title: "会議を明日開く時に必要な機器",
    description: "プロジェクター・モニター・チェア",
    href: "/guides/urgent-meeting-equipment/",
  },
  {
    title: "工事現場の急な必要物資を用意する",
    description: "発電機・照明・電動工具",
    href: "/guides/urgent-construction-supplies/",
  },
  {
    title: "停電時にやることと今日中の準備",
    description: "生活・ビジネス継続",
    href: "/guides/urgent-power-outage-action/",
  },
  {
    title: "明日までにオフィスチェアを用意する",
    description: "座り心地・納期・選び方",
    href: "/guides/urgent-office-chair/",
  },
];

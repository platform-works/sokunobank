// Review Intelligence Engine 共通型。DRY_RUN前提で、本番公開・外部書き込みは行わない。
// アフィリエイト報酬額・提携有無は、意図的にこのファイルのどの型にも含めない(ランキングへの混入防止)。

export type EcSource = "amazon" | "yahoo" | "rakuten";

/** ランキング計算に使ってよい取得元。Amazonは正式な取得手段(API)が使えるまで除外する */
export const RANKING_SOURCES: readonly EcSource[] = ["yahoo", "rakuten"];

/** 利用許諾の状態。unverified は「未確認」であり、許可として扱わない */
export type LicenseStatus = "allowed" | "denied" | "unverified";

/** 許諾を個別に確認する操作。本文の取得・解析・保存・再公開は別々に判定する */
export type LicenseCapability =
  | "fetchAggregate" // 星評価・件数など集計値の取得
  | "publishAggregate" // 集計値の公開
  | "fetchText" // レビュー本文の取得
  | "analyzeText" // 本文のAI解析
  | "storeText" // 本文の保存
  | "publishText" // 本文の引用・翻案・要約の公開
  | "publishImage"; // 商品画像の表示

export interface LicenseEntry {
  status: LicenseStatus;
  /** 判断根拠(公式ドキュメントURL・確認日)または未確認の理由 */
  basis: string;
}

export type LicenseRegistry = Record<EcSource, Record<LicenseCapability, LicenseEntry>>;

/** ECごとの正規化済み商品情報 */
export interface ProductListing {
  source: EcSource;
  /** EC側の商品ID(Yahoo: code / 楽天: itemCode / Amazon: ASIN) */
  listingId: string;
  url: string;
  name: string;
  janCode: string | null;
  maker: string | null;
  brand: string | null;
  modelNumber: string | null;
  /** 容量・サイズ等、同型番でも別商品になりうる属性(例: {"capacity":"1.5L"}) */
  variantAttrs: Record<string, string>;
  price: number | null;
  imageUrl: string | null;
  storeName: string | null;
  /** 配送予定日数(0=当日, null=不明) */
  deliveryDay: number | null;
  /** 集計レビュー(正規APIで得られた場合のみ) */
  aggregateReview: { rate: number; count: number } | null;
  /** 公式仕様から数値化できた項目(カテゴリごとのキー。例: noiseDb) */
  specs: Record<string, number>;
  /** 取得日時(ISO) */
  fetchedAt: string;
}

export interface ProductIdentity {
  productKey: string;
  listings: ProductListing[];
  matchBasis: "jan" | "model+brand" | "name-fuzzy";
  /** 0〜1。name-fuzzy は低く、ランキング対象にしない */
  confidence: number;
  separatedNotes: string[];
}

export interface ReviewRecord {
  source: EcSource;
  reviewId: string;
  listingId: string;
  rating: number; // 1..5
  postedAt: string; // ISO date
  text: string;
  /** 商品自体への言及か、販売店(配送・梱包・接客)への言及か */
  target: "product" | "store" | "mixed";
}

export interface ThemeStat {
  theme: string;
  positive: number;
  negative: number;
  mentions: number;
}

export interface ReviewAnalysis {
  productKey: string;
  analyzedCount: number;
  period: { from: string; to: string } | null;
  themes: ThemeStat[];
  useCases: { label: string; mentions: number }[];
  excluded: { duplicate: number; storeOnly: number; licenseDenied: number };
}

export type TrustLevel = "insufficient" | "reference" | "standard";

export interface TrustReport {
  productKey: string;
  level: TrustLevel;
  analyzedCount: number;
  ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
  /** 異常傾向の記録。不正の断定ではない */
  anomalies: string[];
  newestPostedAt: string | null;
  /** 集計値のみ(本文なし)の場合 true */
  aggregateOnly: boolean;
  notes: string[];
}

export interface UserNeed {
  conditions: string[];
  /** 重視テーマ(ThemeStatのtheme名) */
  priorityThemes: string[];
  /** 公式仕様で重視するキーと方向(例: {noiseDb:"low"}) */
  specPreference: Record<string, "low" | "high">;
  budgetMax: number | null;
}

/** ランキング入力。報酬・提携情報を持たない型として定義している */
export interface RankingCandidate {
  identity: ProductIdentity;
  /** ランキング計算に使う代表出品(RANKING_SOURCESのもの) */
  listing: ProductListing;
  analysis: ReviewAnalysis | null;
  trust: TrustReport | null;
}

export type AxisKey = "review" | "needFit" | "spec" | "price" | "availability";

export interface AxisResult {
  key: AxisKey;
  weight: number;
  /** null は「評価不能」。0点や満点で埋めない */
  score: number | null;
  reason: string;
}

export interface RankedItem {
  rank: number;
  productKey: string;
  name: string;
  totalScore: number;
  axes: AxisResult[];
  renormalizedNote: string | null;
  selectionReason: string;
  drawbacks: string[];
  evidence: string[];
}

/** review_based: 購入者評価を含む / spec_comparison: 仕様比較 / candidate_list: 順位を付けない候補一覧 */
export type RankingKind = "review_based" | "spec_comparison" | "candidate_list";

export interface RankingResult {
  kind: RankingKind;
  algorithmVersion: string;
  generatedAt: string;
  items: RankedItem[];
  excluded: { productKey: string; reason: string }[];
  method: string;
}

export interface PublishDecision {
  publishable: boolean;
  blockers: string[];
}

export interface RunLogEntry {
  productKey: string;
  sources: EcSource[];
  fetchMethod: string;
  licenseSummary: string;
  analyzedCount: number;
  analyzedAt: string;
  axes: AxisKey[];
  algorithmVersion: string;
  missing: string[];
  sourceUrls: string[];
  publishable: boolean;
}

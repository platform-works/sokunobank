// 「Yahoo!ショッピングから商品を検索し独自ランキングする」型カテゴリー(projector等)が
// 共通で使う型定義。特定カテゴリー(projector固有の文言・検索語等)の値はここには置かない。

/** ランキング対象商品の正規化された形(Yahoo APIレスポンスから変換した後の内部表現) */
export interface RankableProduct {
  code: string;
  /** JANコード。同一商品が複数ストアから出品されている場合の重複排除に使う(取得できない場合あり) */
  janCode: string | null;
  name: string;
  /** 商品説明・キャッチコピー(表示はしない)。「お取り寄せ/2ヶ月」等の長納期表記の検知にのみ使う */
  descriptionText: string;
  url: string;
  image: string;
  price: number;
  reviewRate: number;
  reviewCount: number;
  storeName: string;
  storeIsBestSeller: boolean;
  storeReviewRate: number;
  storeReviewCount: number;
  affiliateRate: number;
  /** 0=当日, 1=翌日, 2=翌々日, null=不明(APIから配送日情報が得られなかった) */
  deliveryDay: number | null;
}

export interface ScoredProduct extends RankableProduct {
  deliveryScore: number;
  reviewScore: number;
  storeScore: number;
  revenueScore: number;
  conversionProxyScore: number;
  totalScore: number;
  estimatedCommission: number;
  affiliateUrl: string;
}

export interface RankingWeights {
  delivery: number;
  conversionProxy: number;
  review: number;
  store: number;
  revenue: number;
}

export interface PriceBand {
  label: string;
  min?: number;
  max?: number;
}

export interface ReviewThreshold {
  label: string;
  min: number;
}

export type SortKey = "recommended" | "trust" | "revenue" | "reviewCount" | "priceAsc";

export interface SortOption {
  key: SortKey;
  label: string;
}

export interface CommerceFaqItem {
  question: string;
  answer: string;
}

/** カテゴリー(projector, 胡蝶蘭...)ごとに1ファイルで定義する設定 */
export interface CommerceCategoryConfig {
  slug: string;
  /** パンくず・カテゴリー一覧カード用の短い名称 */
  name: string;
  apiPath: string;
  pageTitle: string;
  metaDescription: string;
  h1: string;
  subheadline: string;
  deliveryNote: string;
  intro: string;
  /** Yahoo!ショッピングへ投げる検索クエリ(複数、OR的に統合される) */
  searchQueries: string[];
  /** 商品名にこのいずれかを含まない場合、検索語と緩く一致しただけの無関係商品として除外する */
  requiredKeywords: string[];
  /** 商品名にこの語を含む場合は本体ではない付属品等として除外 */
  excludeKeywords: string[];
  priceBands: PriceBand[];
  reviewThresholds: ReviewThreshold[];
  sortOptions: SortOption[];
  weights: RankingWeights;
  /** 想定成果報酬額の正規化上限(この額で revenueScore が100に近づく) */
  revenueScoreReferenceMax: number;
  seoSections: { heading: string; body: string[] }[];
  faq: CommerceFaqItem[];
}

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
  /**
   * Yahoo!ショッピングの元の商品URL(RankableProduct.urlと同一値)。
   * 2026-09-27にValueCommerce LinkSwitch導入に伴い、ここに事前組み立てした
   * アフィリエイトURLを入れる方式から、元URLをそのまま渡す方式に変更した
   * (アフィリエイトリンクへの変換はLinkSwitchがブラウザ側で行う。
   * src/lib/commerce/handleProductsRequest.tsのコメント参照)。
   */
  productUrl: string;
}

export interface RankingWeights {
  delivery: number;
  conversionProxy: number;
  review: number;
  store: number;
  revenue: number;
}

export type SortKey = "recommended" | "trust" | "reviewCount" | "priceAsc";

export interface SortOption {
  key: SortKey;
  label: string;
}

export interface CommerceFaqItem {
  question: string;
  answer: string;
}

/**
 * ValueCommerce等の広告タグ。規約上の改変禁止(書き換え・一部抜き出し・サイズ変更等)に対応するため、
 * 必ず元のタグを一切変更せず文字列としてそのまま持たせ、描画側は set:html でそのまま出力すること。
 */
export interface CommerceAdConfig {
  /** PC幅で表示する静的バナー等(hero付近に配置。モバイル幅では自動的に非表示になる) */
  pcBannerHtml?: string;
  /** スマートフォン専用のオーバーレイバナー等(ページ末尾・Footer直前に配置) */
  mobileOverlayHtml?: string;
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
  /**
   * 商品名にこの語を含む場合は本体ではない付属品等として除外(商品名のみを対象にする)。
   * 説明文は対象にしない: 「ランプ」「ケーブル」「リモコン」等は本体商品の仕様・同梱品表記
   * (光源:ランプ/HDMIケーブル付属等)としても頻出するため、説明文まで対象にすると正規品を
   * 誤って除外してしまう(2026-09-26、projectorの複数のEPSON純正モデルが誤除外されていたことで発覚)。
   * 一方、付属品・アクセサリー自体の商品名には対象語が直接含まれるのが通例のため、
   * 商品名のみのチェックでも実用上十分に機能する。
   */
  excludeKeywords: string[];
  /**
   * 長納期表記(お取り寄せ・予約・受注生産等)の除外語。こちらは商品名だけでなく説明文も対象にする
   * (「在庫状況:お取り寄せ/お届け:2〜3ヶ月」等は商品名には出ず説明文にのみ出るため)。
   * 全カテゴリー共通で必ず設定する(docs/category-config-template.ts参照)。
   */
  longLeadTimeExcludeKeywords: string[];
  sortOptions: SortOption[];
  weights: RankingWeights;
  /** 想定成果報酬額の正規化上限(この額で revenueScore が100に近づく) */
  revenueScoreReferenceMax: number;
  /**
   * 任意。想定成果報酬額(price*affiliateRate/100)がこの額未満の商品は検索結果から除外する。
   * revenueScoreによるランキング上の重み付けとは別に、そもそも掲載する価値がないほど
   * 低報酬の商品を足切りする用途(2026-09-26導入、ユーザー指示)。未設定なら足切りしない。
   */
  minEstimatedCommission?: number;
  seoSections: { heading: string; body: string[] }[];
  faq: CommerceFaqItem[];
  /** 任意。ValueCommerce等の広告タグ(PC/スマホ)。無ければ何も表示しない */
  ads?: CommerceAdConfig;
  /**
   * 任意。ValueCommerce MyLinkBoxを使った「ピックアップブランド」セクション(2026-09-27 PoC導入)。
   * 設定したカテゴリーのみ、絞り込みUIの直前に表示される。無ければ何も表示しない。
   * myLinkBoxHtmlはValueCommerce管理画面で発行された形式のまま、一切改変せず保持すること。
   */
  pickupBrand?: {
    brandNameEn: string;
    brandNameJa: string;
    myLinkBoxHtml: string;
  };
}

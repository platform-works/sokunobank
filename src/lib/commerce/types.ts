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
  /**
   * Yahoo!ショッピングAPIのbrand.nameをそのまま保持(2026-09-27、GA4のoutbound_product_click
   * イベント用に追加)。取得できない商品もあるためnull許容。検索・フィルタ・ランキングには使わない
   * (商品選定ロジックには一切影響しない、表示用の付随データ)。
   */
  brand: string | null;
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

export type SortKey = "recommended" | "trust" | "reviewCount" | "priceAsc" | "deliveryAsc";

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

/**
 * 説明文つきの広告セクション(2026-10-03導入、プリンター・複合機が最初の利用者)。
 * バナー等の広告タグ(bannerHtml)は規約上の改変禁止のため、必ず元のタグを一切変更せず文字列として
 * そのまま持たせ、描画側は set:html でそのまま出力する。広告であることが分かる「PR」表記と
 * 注記(caption)を必ず表示する。active が false の間は何も出力しない(案件停止時・規約未確認時用)。
 */
export interface CommerceSponsoredSection {
  active: boolean;
  heading: string;
  body: string[];
  checklistHeading?: string;
  checklist?: string[];
  /** 広告の直前に表示する注記(広告であること・条件は提供元サイトで確認すること) */
  caption: string;
  bannerHtml: string;
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
  /**
   * 任意(2026-09-30導入、発電機カテゴリーが最初の利用者)。Yahoo APIから集める候補の目標件数。
   * 未設定なら共通の既定値(100件)。増やすとAPI呼び出し回数(レート制限:1分30回)が増えるため、
   * 絞り込みUIで母数が必要なカテゴリーだけが設定する。
   */
  candidatesTargetCount?: number;
  /** 任意。1回の応答で返す商品の最大件数。未設定なら既定値(50件) */
  maxDisplayCount?: number;
  seoSections: { heading: string; body: string[] }[];
  faq: CommerceFaqItem[];
  /** 任意。ValueCommerce等の広告タグ(PC/スマホ)。無ければ何も表示しない */
  ads?: CommerceAdConfig;
  /** 任意。説明文つきの広告セクション。商品一覧の下に表示される。無ければ何も表示しない */
  sponsoredSection?: CommerceSponsoredSection;
  /**
   * 任意。「即納人気ブランドから探す」セクション(2026-09-27、ValueCommerce MyLinkBoxの
   * PoCから自前実装に置き換え)。設定したカテゴリーのみ、絞り込みUIの直前に表示される。
   * 無ければ何も表示しない。複数ブランドを配列で持たせ、カード形式で横展開できるようにしている。
   */
  popularBrands?: PopularBrand[];
}

/** 「即納人気ブランドから探す」セクションの1ブランド分のデータ */
export interface PopularBrand {
  /** 内部識別用の英語スラッグ的な名称(例: "Ergohuman") */
  brand: string;
  /** 表示用ブランド名(例: "エルゴヒューマン / Ergohuman") */
  displayName: string;
  /** ブランドの事実に基づく概要(1〜2文)。根拠のない誇張表現は使わない */
  description: string;
  /** 成り立ち・沿革(事実確認できる内容のみ)。スマホでは<details>で折りたたむ */
  history: string;
  /** 特徴(事実ベースの箇条書き) */
  features: string[];
  /** 人気のタイプ・代表モデル名 */
  popularTypes: string[];
  /** Yahoo!ショッピングの実商品データから取得した画像(自社ホスティングせず外部URLをそのまま参照) */
  image: { src: string; alt: string };
  /**
   * Yahoo!ショッピングの検索結果ページURL(カテゴリ:オフィスチェア相当のgenreCategoryId + ブランド名
   * キーワード + 優良配送:すべて[astk=2])。実際にブラウザで検索・フィルタ操作を行いURLを
   * 確認した上で組み立てること(推測で組み立てない)。LinkSwitchが自動でアフィリエイトリンクに
   * 変換するため、ここには常にYahoo!ショッピングの通常URLを入れる。
   */
  yahooSearchUrl: string;
}

// カテゴリー横断で共通の型。
// 「DM」固有の項目名やロジックはここに書かない。カテゴリー固有の情報はすべて
// /src/data/categories/*.json 側のデータとして表現する。

export interface ComparisonField {
  /** providers[].values のキーと対応する識別子 */
  key: string;
  /** 比較表の見出しに使うラベル */
  label: string;
  /** 補足単位など(任意) */
  unit?: string;
}

export interface Provider {
  id: string;
  name: string;
  /** そのカテゴリーで主軸として送客する事業者か */
  isPrimary?: boolean;
  /** 一次情報の公式サイトURL。未確認の間は空文字にしておく(URLを推測で埋めない) */
  officialUrl?: string;
  /** アフィリエイトリンクが発行・承認された後にのみ設定する。それまでは空文字 */
  affiliateUrl?: string;
  description?: string;
  /** comparisonFields[].key をキーとした値。未確認の項目は "要確認" 等の文字列にする */
  values: Record<string, string | number | boolean | null>;
  /**
   * 条件検索(ComparisonFilter)用の構造化データ。values とは別に持つ。
   * 未確認・非公開の項目はキーごと省略してよい(省略時は絞り込みで除外されず常に表示される)。
   */
  facets?: Record<string, string | number | boolean>;
  /** 出典・注意事項(料金変動の可能性など) */
  sourceNote?: string;
  /** 仕様(はがき/封筒等)別の単価・納期の目安。データを持つ場合のみ表示 */
  formatOptions?: FormatOption[];
  /** そのサービスのWEB発注手順(テンプレートページ等の実URLを含む) */
  webOrderSteps?: ProcessStep[];
}

export interface ProcessStep {
  title: string;
  description?: string;
  /** 手順に関連する外部ページ(テンプレートページ・発注ページ等)*/
  href?: string;
  hrefLabel?: string;
}

export interface FormatOption {
  /** 仕様名(例:ポストカード(はがき)DM) */
  name: string;
  /** 単価帯の目安(税込) */
  priceRange: string;
  /** 納期の目安 */
  speed: string;
  /** 「即納向けにおすすめ」等の推奨フラグ */
  recommended?: boolean;
  note?: string;
}

export interface ReaderPathway {
  id: string;
  title: string;
  description: string;
  bestFor: string[];
}

export interface LpContent {
  headline: string;
  subheadline?: string;
  ctaLabel: string;
  /** providers[].id を参照し、CTAの送客先を決める */
  ctaProviderId: string;
  highlights: string[];
  /** 「最短1日に短縮」等の訴求フック */
  hookNote?: string;
  /** hookNote の内容が公式情報で最終確認済みかどうか。false の間はビルド時に警告を出す */
  hookVerified?: boolean;
}

export interface StatHighlight {
  label: string;
  value: string;
  source?: string;
}

export interface Faq {
  question: string;
  answer: string;
}

export interface Guide {
  title: string;
  description: string;
  /** 記事ページが未公開の間は省略する(「準備中」表示になる) */
  href?: string;
}

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterField {
  /** providers[].facets のキーと対応する識別子 */
  key: string;
  label: string;
  type: "select" | "checkbox";
  /** type: "select" のときの選択肢 */
  options?: FilterOption[];
}

export interface CategoryData {
  slug: string;
  name: string;
  shortName?: string;
  /** "published" のみ一覧・比較ページとして公開対象にする */
  status: "draft" | "published";
  heroHeadline: string;
  heroSubheadline?: string;
  /**
   * ページ冒頭に表示する短い結論・要約(1〜2文)。人間の速読と、AI検索エンジンが
   * ページの要点を引用・抽出する際の両方を意識し、単独で読んで意味が通る文章にする。
   */
  summary?: string;
  statHighlight?: StatHighlight;
  /** 想定検索意図(ロングテールKW等)。SEO設計・コンテンツ確認用 */
  searchIntents?: string[];
  comparisonFields: ComparisonField[];
  /** 条件検索UIに表示する項目。省略時はそのカテゴリーで条件検索セクションを表示しない */
  filterFields?: FilterField[];
  providers: Provider[];
  processSteps?: ProcessStep[];
  readerPathways?: ReaderPathway[];
  faq?: Faq[];
  guides?: Guide[];
  lp?: LpContent;
  /** 公開前に確認が必要な事項。ページには描画せず、開発時の参照用 */
  todos?: string[];
  /** 料金・納期情報を最後に確認した日付(ISO)。未確認なら null */
  lastVerifiedAt?: string | null;
}

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
  /** 出典・注意事項(料金変動の可能性など) */
  sourceNote?: string;
}

export interface ProcessStep {
  title: string;
  description?: string;
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

export interface CategoryData {
  slug: string;
  name: string;
  shortName?: string;
  /** "published" のみ一覧・比較ページとして公開対象にする */
  status: "draft" | "published";
  heroHeadline: string;
  heroSubheadline?: string;
  statHighlight?: StatHighlight;
  /** 想定検索意図(ロングテールKW等)。SEO設計・コンテンツ確認用 */
  searchIntents?: string[];
  comparisonFields: ComparisonField[];
  providers: Provider[];
  processSteps?: ProcessStep[];
  readerPathways?: ReaderPathway[];
  lp?: LpContent;
  /** 公開前に確認が必要な事項。ページには描画せず、開発時の参照用 */
  todos?: string[];
  /** 料金・納期情報を最後に確認した日付(ISO)。未確認なら null */
  lastVerifiedAt?: string | null;
}

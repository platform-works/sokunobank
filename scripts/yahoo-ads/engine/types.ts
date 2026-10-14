/**
 * リスティング広告基盤の共通型（サイトに依存しない）。サイト固有の値は lib/listing/<site>/ の設定に置く。
 * 実績値（検索ボリューム・CPC）は推測で埋めない: null = 未取得。
 */
export type AdPlatform = "google" | "yahoo";
export type MatchType = "phrase" | "exact";
/** draft: 作成中／ready: 規約・原稿の確認が完了（入稿可）／paused: 停止。ready は、広告主の許可（listingApproved）と範囲の確認（scopeConfirmed）が揃うまで検証で失敗する。CSV の生成・形式検証・インポートの準備は、ready でなくても行える */
export type MasterStatus = "draft" | "ready" | "paused";

export interface KeywordMetrics {
  /** 月間検索ボリューム（キーワードプランナー等の取得値）。未取得は null */
  monthlySearchVolume: number | null;
  /** 推定CPCの下限・上限（円）。未取得は null */
  cpcLowYen: number | null;
  cpcHighYen: number | null;
  /** データの取得元（例: "Google キーワードプランナー"）と取得日（YYYY-MM-DD）。未取得は null */
  dataSource: string | null;
  fetchedAt: string | null;
}

export interface KeywordEntry<I extends string = string> {
  keywordId: string;
  category: string;
  keyword: string;
  matchType: MatchType;
  intent: I;
  adGroupName: string;
  status: MasterStatus;
  /** 検索意図の強さ（転職・比較など行動に近い語=high／中間=medium／情報収集・悩みの語=low）。low は初期配信の候補にしない */
  intentStrength: "high" | "medium" | "low";
  /** 初期配信の判断: initial=初期候補／hold=保留（データ・承認がそろってから再検討）／exclude=除外（配信対象にしない）。35件すべてに付ける */
  decision: "initial" | "hold" | "exclude";
  /** 判断の理由（薬剤師への関連性・転職意思・成果条件への適合・広告文とLPの一致・無駄クリックのリスク） */
  decisionReason: string;
  metrics: KeywordMetrics;
  note: string | null;
}

export interface AdGroupEntry<I extends string = string> {
  campaignName: string;
  adGroupName: string;
  intent: I;
  /** 見出し（3〜15件。RSA）。Google は各30（全角=2）、Yahoo は全角15 */
  headlines: string[];
  /** 説明文（2〜4件） */
  descriptions: string[];
  /** 表示URLのパス（任意）。Google: 各15単位（全角=2）。ブランド語を使わない */
  path1: string;
  path2: string;
  status: MasterStatus;
  /** 検索意図の分類名（運用上の呼び方。例: 年収アップ） */
  searchIntent: string;
  /** 送客先の第一の広告主（program_id）。特定の広告主に絞れない広告グループは null */
  targetProgramId: string | null;
  /** 適合条件が合う場合の、次の送客先 */
  secondaryProgramIds: string[];
  /** 広告文・LP 文言の版（成果の比較用） */
  headlineVariant: string;
  /** 成果の目標（A8.net の成果条件。確定報酬が最終の指標） */
  conversionGoal: string;
  /** 初期配信テストの候補か（編集上の判断。実際の配信は、運営者の承認と下の条件がそろってから） */
  initialCandidate: boolean;
}

/** 広告主の広告規約（リスティング）。確認できていない項目は null（推測で true にしない） */
export interface AdvertiserListingRule {
  advertiserId: string;
  name: string;
  /** リスティングNGワード（社名・サービス名・サイト名・その他）。広告文・キーワード・表示URL・素材に使わない */
  ngWords: { word: string; source: string; verified: boolean }[];
  /**
   * 判定1: 広告主（ASP）が、リスティング広告を条件つきで認めているか（A8.net の「一部OK」= 禁止キーワードを対象外に設定すれば利用可）。
   * true = 認められている（根拠は approvalNote）／false = 禁止（NG）／null = 未確認
   */
  listingApproved: boolean | null;
  /**
   * 判定2: 許可の範囲（禁止キーワードの完全な一覧・広告主固有の追加制限）を、運営者が確認し終えたか。
   * 「一部OK」だけでは true にしない。確認できていない間は false。
   */
  scopeConfirmed: boolean;
  approvalNote: string | null;
}

export interface IntentLandingText {
  h1: string;
  subcopy: string;
  description: string;
  tags: string[];
  /** 広告文がこの intent を約束するときに使う語 */
  promiseWords: string[];
  /** キーワードの意図判定に使う語（promiseWords を含む） */
  keywordWords: string[];
}

export interface ListingSiteConfig<I extends string = string> {
  siteName: string;
  /** 基本LPの絶対URL（末尾スラッシュ付き。canonical と同じ） */
  baseUrl: string;
  intentParam: string;
  intents: Record<I, IntentLandingText>;
  advertisers: AdvertiserListingRule[];
  campaigns: { campaignName: string; platform: AdPlatform; utmSource: string; utmMedium: string; utmCampaign: string }[];
  adGroups: AdGroupEntry<I>[];
  keywords: KeywordEntry<I>[];
  /**
   * 初期候補のキーワードが含むべき語（資格・商材の特定）。含まない語は、他の検索者・他の商材に配信される。
   * pattern は RegExp のソース。未指定は検査しない。
   */
  initialKeywordSignal?: { pattern: string; reason: string };
  /** 無駄なクリックを抑える対象外キーワード（資格のない検索者・情報収集・別の職種など）。編集部の案で、運営者の確認が要る */
  wasteNegatives: { word: string; reason: string }[];
  /** 広告文に使わない表現（保証・誇大・属性の推測） */
  avoidPhrases: string[];
  /** 属性（年齢・資格・転職意思・状況）を広告文から推測させる表現 */
  inferencePhrases: (string | RegExp)[];
}

export type IssueLevel = "error" | "warn";
export interface Issue {
  level: IssueLevel;
  code: string;
  where: string;
  message: string;
}

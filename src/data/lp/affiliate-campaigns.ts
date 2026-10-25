/**
 * 広告グループ・キャンペーン管理
 * LINEヤフー広告の入稿データ構造（CSV用）
 */

export interface KeywordEntry {
  keyword: string;
  matchType: "exact" | "phrase" | "broad";
  bidPrice?: number; // 推定値（CPC）
}

export interface AffiliateAdGroup {
  // 識別子
  id: string; // "securities-nisa-adgroup-001"
  intentId: string; // "nisa"
  category: string; // "securities"

  // LINEヤフー広告管理
  yahooAdGroupId?: string; // "123456789"
  yahooAdGroupName: string; // "証券-NISA-01"
  yahooAdStatus?: "enabled" | "paused" | "removed";

  // キャンペーンID（複数の広告グループが1つのキャンペーン配下）
  yahooAdGroupParentId?: string; // キャンペーンID

  // キーワード一覧
  keywords: KeywordEntry[];

  // レスポンシブ検索広告
  headlines: string[]; // 最大15個（Google）/ 最大5個（LINEヤフー）
  descriptions: string[]; // 最大4個

  // 最終リンク先
  finalUrl: string; // LP の絶対URL

  // 除外キーワード
  excludeKeywords?: string[];

  // 計測（GA4）
  utmSource: "lp-factory";
  utmMedium: "cpc";
  utmCampaign: string; // "securities-nisa"
  utmContent?: string;

  // ステータス
  readyForUpload?: boolean; // CSV入稿可能か
  uploadedDate?: string;
  notes?: string;
}

// ============================================
// 01. 証券会社 - NISA
// ============================================

export const securitiesNisaAdGroup: AffiliateAdGroup = {
  id: "securities-nisa-adgroup-001",
  intentId: "nisa",
  category: "securities",
  yahooAdGroupName: "証券-NISA-01",
  keywords: [
    { keyword: "NISA 口座選び", matchType: "exact", bidPrice: 150 },
    { keyword: "新NISA 証券会社", matchType: "phrase", bidPrice: 140 },
    { keyword: "NISA 初心者 口座", matchType: "phrase", bidPrice: 130 },
    { keyword: "NISA 手数料 比較", matchType: "phrase", bidPrice: 125 },
  ],
  headlines: [
    "新NISAの口座選びガイド",
    "手数料・取扱商品で比較",
    "初心者向け口座開設ポイント",
    "NISA口座の開設手続き",
    "非課税投資で資産形成",
  ],
  descriptions: [
    "NISA口座を選ぶ際の確認基準を整理します。手数料や取扱商品の違いなど。",
    "新NISA制度の変更点、口座選びのポイントをご説明します。",
    "証券会社の比較で自分に合ったNISA口座を選びましょう。",
  ],
  finalUrl: "https://sokunobank.com/lp/securities/nisa/",
  excludeKeywords: ["シミュレーター", "計算機"],
  utmSource: "lp-factory",
  utmMedium: "cpc",
  utmCampaign: "securities-nisa",
  notes: "確認待ち：A8.net プログラムID未確認",
};

// ============================================
// 01. 証券会社 - IPO
// ============================================

export const securitiesIpoAdGroup: AffiliateAdGroup = {
  id: "securities-ipo-adgroup-001",
  intentId: "ipo",
  category: "securities",
  yahooAdGroupName: "証券-IPO-01",
  keywords: [
    { keyword: "IPO 抽選 申し込み", matchType: "exact", bidPrice: 140 },
    { keyword: "IPO 口座 選び方", matchType: "phrase", bidPrice: 135 },
    { keyword: "IPO 抽選方式 比較", matchType: "phrase", bidPrice: 130 },
  ],
  headlines: [
    "IPO抽選方式の選び方",
    "申込条件や抽選方式を確認",
    "IPO投資の口座選択ガイド",
    "複数証券会社でIPO申し込み",
  ],
  descriptions: [
    "証券会社によるIPO抽選方式の違いを整理します。申込条件の確認を。",
    "IPO投資の基礎知識、口座選びのポイント。",
  ],
  finalUrl: "https://sokunobank.com/lp/securities/ipo/",
  excludeKeywords: ["予想", "投資判断"],
  utmSource: "lp-factory",
  utmMedium: "cpc",
  utmCampaign: "securities-ipo",
  notes: "確認待ち：A8.net プログラムID未確認",
};

// ============================================
// 02. レンタルサーバー - WordPress
// ============================================

export const hostingWordPressAdGroup: AffiliateAdGroup = {
  id: "hosting-wordpress-adgroup-001",
  intentId: "wordpress",
  category: "hosting",
  yahooAdGroupName: "ホスティング-WordPress-01",
  keywords: [
    { keyword: "WordPress レンタルサーバー", matchType: "exact", bidPrice: 120 },
    { keyword: "WordPress 初心者 サーバー", matchType: "phrase", bidPrice: 115 },
    { keyword: "WordPress 高速 サーバー", matchType: "phrase", bidPrice: 110 },
  ],
  headlines: [
    "WordPress向けレンタルサーバー",
    "高速・安定・サポート充実",
    "初心者向けサーバー選択ガイド",
    "WordPressインストール簡単",
  ],
  descriptions: [
    "WordPressサイト構築に最適なサーバー選びのポイント。",
    "費用、速度、セキュリティを比較しましょう。",
  ],
  finalUrl: "https://sokunobank.com/lp/hosting/wordpress/",
  utmSource: "lp-factory",
  utmMedium: "cpc",
  utmCampaign: "hosting-wordpress",
  notes: "確認待ち：A8.net プログラムID未確認",
};

// ============================================
// 03. ウォーターサーバー - 家庭向け
// ============================================

export const waterServerFamilyAdGroup: AffiliateAdGroup = {
  id: "water-server-family-adgroup-001",
  intentId: "family",
  category: "water-server",
  yahooAdGroupName: "ウォーターサーバー-家庭-01",
  keywords: [
    { keyword: "ウォーターサーバー 家庭", matchType: "exact", bidPrice: 100 },
    { keyword: "ウォーターサーバー 料金", matchType: "phrase", bidPrice: 95 },
    { keyword: "ウォーターサーバー 比較", matchType: "phrase", bidPrice: 90 },
  ],
  headlines: [
    "ウォーターサーバー選び",
    "料金・配送条件を確認",
    "家庭向けプランの比較",
  ],
  descriptions: [
    "ウォーターサーバーの月額料金、配送エリア、契約期間を比較。",
  ],
  finalUrl: "https://sokunobank.com/lp/water-server/family/",
  utmSource: "lp-factory",
  utmMedium: "cpc",
  utmCampaign: "water-server-family",
  notes: "確認待ち：A8.net プログラムID未確認",
};

// ============================================
// 04. 美容クリニック - 選び方
// ============================================

export const beautyClinicSelectionAdGroup: AffiliateAdGroup = {
  id: "beauty-clinic-selection-adgroup-001",
  intentId: "selection",
  category: "beauty-clinic",
  yahooAdGroupName: "美容クリニック-選び方-01",
  keywords: [
    { keyword: "美容クリニック 選び方", matchType: "exact", bidPrice: 110 },
    { keyword: "美容皮膚科 選び方", matchType: "phrase", bidPrice: 105 },
    { keyword: "医療脱毛 クリニック", matchType: "phrase", bidPrice: 100 },
  ],
  headlines: [
    "美容クリニック選びガイド",
    "無料カウンセリング相談",
  ],
  descriptions: [
    "美容クリニック選びの確認基準。医師の資格、費用、リスク説明。",
  ],
  finalUrl: "https://sokunobank.com/lp/beauty-clinic/selection/",
  utmSource: "lp-factory",
  utmMedium: "cpc",
  utmCampaign: "beauty-clinic-selection",
  notes: "⚠️ 医療広告ガイドライン要確認。確認待ち：A8.net プログラムID未確認",
};

// ============================================
// 05. 脱毛サロン - 料金
// ============================================

export const hairRemovalPricingAdGroup: AffiliateAdGroup = {
  id: "hair-removal-pricing-adgroup-001",
  intentId: "pricing",
  category: "hair-removal",
  yahooAdGroupName: "脱毛-料金-01",
  keywords: [
    { keyword: "脱毛サロン 料金", matchType: "exact", bidPrice: 105 },
    { keyword: "脱毛サロン 無制限プラン", matchType: "phrase", bidPrice: 100 },
    { keyword: "脱毛 全身 価格", matchType: "phrase", bidPrice: 95 },
  ],
  headlines: [
    "脱毛サロン料金比較",
    "全身脱毛プラン選び",
  ],
  descriptions: [
    "脱毛サロンの月額制・回数制料金を比較。契約条件も確認しましょう。",
  ],
  finalUrl: "https://sokunobank.com/lp/hair-removal/pricing/",
  utmSource: "lp-factory",
  utmMedium: "cpc",
  utmCampaign: "hair-removal-pricing",
  notes: "確認待ち：A8.net プログラムID未確認",
};

// ============================================
// 06. AGA治療 - 相談先
// ============================================

export const agaConsultationAdGroup: AffiliateAdGroup = {
  id: "aga-consultation-adgroup-001",
  intentId: "consultation",
  category: "aga",
  yahooAdGroupName: "AGA-相談-01",
  keywords: [
    { keyword: "AGA治療 相談", matchType: "exact", bidPrice: 115 },
    { keyword: "AGA オンライン診療", matchType: "phrase", bidPrice: 110 },
    { keyword: "抜け毛 相談 医師", matchType: "phrase", bidPrice: 105 },
  ],
  headlines: [
    "AGA治療相談ガイド",
    "初診・オンライン相談",
  ],
  descriptions: [
    "AGA治療を検討する際の確認事項。医師の診察、費用、副作用。",
  ],
  finalUrl: "https://sokunobank.com/lp/aga/consultation/",
  utmSource: "lp-factory",
  utmMedium: "cpc",
  utmCampaign: "aga-consultation",
  notes: "⚠️ 医療広告ガイドライン要確認。確認待ち：A8.net プログラムID未確認",
};

// ============================================
// 07. 結婚相談所 - 選び方
// ============================================

export const marriageSelectionAdGroup: AffiliateAdGroup = {
  id: "marriage-selection-adgroup-001",
  intentId: "selection",
  category: "marriage",
  yahooAdGroupName: "結婚相談所-選び方-01",
  keywords: [
    { keyword: "結婚相談所 選び方", matchType: "exact", bidPrice: 120 },
    { keyword: "結婚相談所 料金", matchType: "phrase", bidPrice: 115 },
    { keyword: "結婚相談所 30代", matchType: "phrase", bidPrice: 110 },
  ],
  headlines: [
    "結婚相談所選びガイド",
    "無料説明会で相談",
  ],
  descriptions: [
    "結婚相談所選びの確認基準。会員数、料金、サポート体制。",
  ],
  finalUrl: "https://sokunobank.com/lp/marriage/selection/",
  utmSource: "lp-factory",
  utmMedium: "cpc",
  utmCampaign: "marriage-selection",
  notes: "確認待ち：A8.net プログラムID未確認",
};

// ============================================
// 08. 占い - オンライン
// ============================================

export const fortuneOnlineAdGroup: AffiliateAdGroup = {
  id: "fortune-online-adgroup-001",
  intentId: "online",
  category: "fortune",
  yahooAdGroupName: "占い-オンライン-01",
  keywords: [
    { keyword: "占い オンライン", matchType: "exact", bidPrice: 90 },
    { keyword: "電話占い 相談", matchType: "phrase", bidPrice: 85 },
    { keyword: "占い アプリ", matchType: "phrase", bidPrice: 80 },
  ],
  headlines: [
    "オンライン占い選び",
    "新規利用者向け割引",
  ],
  descriptions: [
    "オンライン占いサービスの選び方。占い師の経歴、料金、形式を確認。",
  ],
  finalUrl: "https://sokunobank.com/lp/fortune/online/",
  utmSource: "lp-factory",
  utmMedium: "cpc",
  utmCampaign: "fortune-online",
  notes: "⚠️ 根拠のない効果保証禁止。確認待ち：A8.net プログラムID未確認",
};

// ============================================
// 09. ダイエット - 支援サービス
// ============================================

export const dietSupportAdGroup: AffiliateAdGroup = {
  id: "diet-support-adgroup-001",
  intentId: "support",
  category: "diet",
  yahooAdGroupName: "ダイエット-支援-01",
  keywords: [
    { keyword: "ダイエット 支援 サービス", matchType: "exact", bidPrice: 95 },
    { keyword: "パーソナルトレーニング 料金", matchType: "phrase", bidPrice: 90 },
    { keyword: "ダイエット アプリ", matchType: "phrase", bidPrice: 85 },
  ],
  headlines: [
    "ダイエット支援選び",
    "専門家による食事・運動指導",
  ],
  descriptions: [
    "ダイエット支援サービスの選び方。指導者資格、費用、形式を確認。",
  ],
  finalUrl: "https://sokunobank.com/lp/diet/support/",
  utmSource: "lp-factory",
  utmMedium: "cpc",
  utmCampaign: "diet-support",
  notes: "確認待ち：A8.net プログラムID未確認。医学的根拠不明な保証禁止。",
};

// ============================================
// 10. 低身長 - サービス
// ============================================

export const shortStatureServicesAdGroup: AffiliateAdGroup = {
  id: "short-stature-services-adgroup-001",
  intentId: "services",
  category: "short-stature",
  yahooAdGroupName: "低身長-サービス-01",
  keywords: [
    { keyword: "低身長 相談", matchType: "exact", bidPrice: 85 },
    { keyword: "身長 改善 相談", matchType: "phrase", bidPrice: 80 },
    { keyword: "成長相談 医師", matchType: "phrase", bidPrice: 75 },
  ],
  headlines: [
    "身長に関する相談先",
    "医学的相談とサービス",
  ],
  descriptions: [
    "身長に関する相談先と支援サービス。医学的相談と非医学的支援を区別。",
  ],
  finalUrl: "https://sokunobank.com/lp/short-stature/services/",
  utmSource: "lp-factory",
  utmMedium: "cpc",
  utmCampaign: "short-stature-services",
  notes: "⚠️ 未成年向け訴求避ける。身体的不安をあおらない。確認待ち：A8.net プログラムID未確認",
};

// ============================================
// 広告グループ一覧
// ============================================

export const allAffiliateAdGroups: AffiliateAdGroup[] = [
  securitiesNisaAdGroup,
  securitiesIpoAdGroup,
  hostingWordPressAdGroup,
  waterServerFamilyAdGroup,
  beautyClinicSelectionAdGroup,
  hairRemovalPricingAdGroup,
  agaConsultationAdGroup,
  marriageSelectionAdGroup,
  fortuneOnlineAdGroup,
  dietSupportAdGroup,
  shortStatureServicesAdGroup,
];

// ============================================
// ヘルパー関数
// ============================================

export function getAdGroupById(id: string): AffiliateAdGroup | undefined {
  return allAffiliateAdGroups.find((group) => group.id === id);
}

export function getAdGroupsByCategory(category: string): AffiliateAdGroup[] {
  return allAffiliateAdGroups.filter((group) => group.category === category);
}

export function getAdGroupByPath(category: string, intent: string): AffiliateAdGroup | undefined {
  return allAffiliateAdGroups.find((g) => g.category === category && g.intentId === intent);
}

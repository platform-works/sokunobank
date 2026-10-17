/**
 * アフィリエイト案件マスター
 * 10ジャンル × 複数案件を管理
 * A8.net プログラム情報は .env / Cloudflare Secrets から取得
 */

export interface AffiliateOffer {
  // 識別子
  id: string; // "securities-nisa-01"
  category: string; // "securities"
  intent: string; // "nisa"

  // 案件情報（A8.net）
  asp: "a8" | "valuecommerce";
  programName: string; // 公式名
  programId?: string; // A8 programId（秘密情報 → .env）
  affiliateId?: string; // A8 affiliateId

  // 成果・報酬
  conversionAmount: number; // 報酬額（円）
  conversionPoint: string; // 成果地点（申し込み等）
  conversionCondition: string; // 成果条件
  denialCondition?: string; // 否認条件
  approvalRate?: number; // 承認率（%）
  epc?: number; // EPC（期待報酬/クリック）
  revisitDays?: number; // 再訪問期間

  // リスティング制限
  listingAllowed: boolean; // OK/NG
  prohibitedKeywords?: string[];

  // 情報確認状態
  verified: boolean; // A8公式で確認済み
  verifiedDate?: string; // "2026-10-17"
  officialUrl?: string; // 公式参照先
  notes?: string; // 確認待ち・注釈

  // 提携状況
  a8Partnership?: "unapplied" | "pending" | "approved" | "rejected";
  a8PartnershipDate?: string;
}

// ============================================
// 01. 証券会社
// ============================================

export const securitiesNisaOffer: AffiliateOffer = {
  id: "securities-nisa-01",
  category: "securities",
  intent: "nisa",
  asp: "a8",
  programName: "（確認待ち）証券会社 NISA口座開設",
  verified: false,
  listingAllowed: true,
  notes: "A8.net プログラム ID: ユーザー提供待ち",
  conversionAmount: 0,
  conversionPoint: "口座開設",
  conversionCondition: "未確認",
};

export const securitiesIpoOffer: AffiliateOffer = {
  id: "securities-ipo-01",
  category: "securities",
  intent: "ipo",
  asp: "a8",
  programName: "（確認待ち）証券会社 IPO抽選申込",
  verified: false,
  listingAllowed: true,
  notes: "A8.net プログラム ID: ユーザー提供待ち",
  conversionAmount: 0,
  conversionPoint: "口座開設",
  conversionCondition: "未確認",
};

// ============================================
// 02. レンタルサーバー
// ============================================

export const hostingWordPressOffer: AffiliateOffer = {
  id: "hosting-wordpress-01",
  category: "hosting",
  intent: "wordpress",
  asp: "a8",
  programName: "（確認待ち）レンタルサーバー WordPress対応",
  verified: false,
  listingAllowed: true,
  notes: "A8.net プログラム ID: ユーザー提供待ち",
  conversionAmount: 0,
  conversionPoint: "契約申し込み",
  conversionCondition: "未確認",
};

// ============================================
// 03. ウォーターサーバー
// ============================================

export const waterServerFamilyOffer: AffiliateOffer = {
  id: "water-server-family-01",
  category: "water-server",
  intent: "family",
  asp: "a8",
  programName: "（確認待ち）ウォーターサーバー 家庭向け",
  verified: false,
  listingAllowed: true,
  notes: "A8.net プログラム ID: ユーザー提供待ち",
  conversionAmount: 0,
  conversionPoint: "資料請求/申し込み",
  conversionCondition: "未確認",
};

// ============================================
// 04. 美容クリニック
// ============================================

export const beautyClinicSelectionOffer: AffiliateOffer = {
  id: "beauty-clinic-selection-01",
  category: "beauty-clinic",
  intent: "selection",
  asp: "a8",
  programName: "（確認待ち）美容クリニック 無料相談予約",
  verified: false,
  listingAllowed: true,
  notes: "医療広告ガイドライン対応確認待ち。A8.net プログラム ID: ユーザー提供待ち",
  conversionAmount: 0,
  conversionPoint: "無料カウンセリング予約",
  conversionCondition: "未確認",
};

// ============================================
// 05. 脱毛サロン
// ============================================

export const hairRemovalPricingOffer: AffiliateOffer = {
  id: "hair-removal-pricing-01",
  category: "hair-removal",
  intent: "pricing",
  asp: "a8",
  programName: "（確認待ち）脱毛サロン 無料カウンセリング",
  verified: false,
  listingAllowed: true,
  notes: "A8.net プログラム ID: ユーザー提供待ち",
  conversionAmount: 0,
  conversionPoint: "無料カウンセリング予約",
  conversionCondition: "未確認",
};

// ============================================
// 06. AGA治療
// ============================================

export const agaConsultationOffer: AffiliateOffer = {
  id: "aga-consultation-01",
  category: "aga",
  intent: "consultation",
  asp: "a8",
  programName: "（確認待ち）AGA治療 初診・オンライン相談",
  verified: false,
  listingAllowed: true,
  notes: "医療広告ガイドライン対応確認待ち。A8.net プログラム ID: ユーザー提供待ち",
  conversionAmount: 0,
  conversionPoint: "初診予約",
  conversionCondition: "未確認",
};

// ============================================
// 07. 結婚相談所
// ============================================

export const marriageSelectionOffer: AffiliateOffer = {
  id: "marriage-selection-01",
  category: "marriage",
  intent: "selection",
  asp: "a8",
  programName: "（確認待ち）結婚相談所 無料説明会・カウンセリング",
  verified: false,
  listingAllowed: true,
  notes: "A8.net プログラム ID: ユーザー提供待ち",
  conversionAmount: 0,
  conversionPoint: "無料説明会予約",
  conversionCondition: "未確認",
};

// ============================================
// 08. 占い
// ============================================

export const fortuneOnlineOffer: AffiliateOffer = {
  id: "fortune-online-01",
  category: "fortune",
  intent: "online",
  asp: "a8",
  programName: "（確認待ち）オンライン占い サービス登録",
  verified: false,
  listingAllowed: true,
  notes: "根拠のない効果保証を避けること。A8.net プログラム ID: ユーザー提供待ち",
  conversionAmount: 0,
  conversionPoint: "新規登録",
  conversionCondition: "未確認",
};

// ============================================
// 09. ダイエット
// ============================================

export const dietSupportOffer: AffiliateOffer = {
  id: "diet-support-01",
  category: "diet",
  intent: "support",
  asp: "a8",
  programName: "（確認待ち）ダイエット支援サービス 無料相談",
  verified: false,
  listingAllowed: true,
  notes: "A8.net プログラム ID: ユーザー提供待ち",
  conversionAmount: 0,
  conversionPoint: "無料相談申し込み",
  conversionCondition: "未確認",
};

// ============================================
// 10. 低身長
// ============================================

export const shortStatureServicesOffer: AffiliateOffer = {
  id: "short-stature-services-01",
  category: "short-stature",
  intent: "services",
  asp: "a8",
  programName: "（確認待ち）低身長向けサービス 資料請求",
  verified: false,
  listingAllowed: true,
  notes: "医学的相談と非医療サービスを明確に分離。未成年向け訴求の慎重確認必須。A8.net プログラム ID: ユーザー提供待ち",
  conversionAmount: 0,
  conversionPoint: "資料請求",
  conversionCondition: "未確認",
};

// ============================================
// オファー一覧
// ============================================

export const allAffiliateOffers: AffiliateOffer[] = [
  securitiesNisaOffer,
  securitiesIpoOffer,
  hostingWordPressOffer,
  waterServerFamilyOffer,
  beautyClinicSelectionOffer,
  hairRemovalPricingOffer,
  agaConsultationOffer,
  marriageSelectionOffer,
  fortuneOnlineOffer,
  dietSupportOffer,
  shortStatureServicesOffer,
];

// ============================================
// ヘルパー関数
// ============================================

export function getOfferById(id: string): AffiliateOffer | undefined {
  return allAffiliateOffers.find((offer) => offer.id === id);
}

export function getOffersByCategory(category: string): AffiliateOffer[] {
  return allAffiliateOffers.filter((offer) => offer.category === category);
}

export function getOffersByIntent(intent: string): AffiliateOffer[] {
  return allAffiliateOffers.filter((offer) => offer.intent === intent);
}

export function getOffersByPath(category: string, intent: string): AffiliateOffer[] {
  return allAffiliateOffers.filter((offer) => offer.category === category && offer.intent === intent);
}

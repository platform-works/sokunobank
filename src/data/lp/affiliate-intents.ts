/**
 * 検索意図定義
 * ジャンルごとの検索意図、キーワード、LP、広告原稿を一体管理
 */

export interface SearchIntent {
  // 識別子
  id: string; // "nisa"
  category: string; // "securities"
  name: string; // "NISA口座選び"

  // キーワード
  keywords: string[]; // ["NISA 口座選び", "新NISA 証券会社"]
  matchTypes?: ("exact" | "phrase" | "broad")[];
  excludeKeywords?: string[];

  // LP情報
  lpPath: string; // "securities/nisa"
  lpTitle: string;
  lpHeadline: string;
  lpSubheadline?: string;

  // ファーストビューの主張
  catchcopy?: string; // "急ぎで必要な情報か、じっくり検討するのか"
  subcopy?: string;

  // 主要ポイント（ハイライト）
  highlights?: string[];

  // FAQ
  faqItems?: {
    question: string;
    answer: string;
  }[];

  // 広告原稿候補
  adHeadings: string[]; // 複数見出し候補（最大15個、Google/LINEヤフー対応）
  adDescriptions: string[]; // 複数説明文候補（最大4個）

  // CTA
  ctaLabel: string; // "確認する"
  ctaNote?: string; // "確認待ち内容あり"

  // 案件リスト
  offerIds: string[]; // ["securities-nisa-01"]
  primaryOfferId: string; // "securities-nisa-01"

  // 入札単価案（推定値）
  suggestedBid?: number; // CPC 推定値

  // 情報確認状態
  contentVerified: boolean;
  verifiedDate?: string;
  notes?: string;
}

// ============================================
// 01. 証券会社 - NISA
// ============================================

export const securitiesNisaIntent: SearchIntent = {
  id: "nisa",
  category: "securities",
  name: "NISA口座選び",
  keywords: [
    "NISA 口座選び",
    "新NISA 証券会社",
    "NISA 初心者 口座",
    "NISA 手数料 比較",
  ],
  excludeKeywords: ["シミュレーター", "計算機"],
  lpPath: "securities/nisa",
  lpTitle: "NISA口座選びのポイント",
  lpHeadline: "NISA口座選びの確認基準",
  lpSubheadline: "新NISAで非課税投資を始める前に、口座開設先を判断する際のポイント",
  catchcopy: "どの証券会社でNISA口座を開くか",
  subcopy: "取扱商品・手数料・サポート体制から判断する",
  highlights: [
    "取扱商品（国内株・米国株・投資信託）",
    "手数料・口座開設費用",
    "ロボアドバイザー等の補助機能",
    "サポート体制（オンライン・電話等）",
  ],
  adHeadings: [
    "新NISAの口座選びガイド",
    "手数料・取扱商品で比較",
    "初心者向け口座開設ポイント",
    "NISA口座の開設手続き",
  ],
  adDescriptions: [
    "NISA口座を選ぶ際の確認基準を整理します。手数料や取扱商品の違いなど。",
    "新NISA制度の変更点、口座選びのポイントをご説明します。",
  ],
  ctaLabel: "確認する",
  offerIds: ["securities-nisa-01"],
  primaryOfferId: "securities-nisa-01",
  suggestedBid: 150,
  contentVerified: false,
  notes: "確認待ち：NISA制度の最新情報（2026-10月時点）",
};

// ============================================
// 01. 証券会社 - IPO
// ============================================

export const securitiesIpoIntent: SearchIntent = {
  id: "ipo",
  category: "securities",
  name: "IPO抽選・申し込み",
  keywords: [
    "IPO 抽選 申し込み",
    "IPO 口座 選び方",
    "IPO 抽選方式 比較",
    "IPO 当選確率 上げる",
  ],
  excludeKeywords: ["予想", "投資判断"],
  lpPath: "securities/ipo",
  lpTitle: "IPO抽選申し込みの口座選び",
  lpHeadline: "IPO抽選を申し込む前に",
  lpSubheadline: "証券会社による抽選方式の違い、申込条件、当選実績から判断する",
  catchcopy: "複数の証券会社のIPO抽選に申し込む",
  subcopy: "抽選方式による当選確率の違いを理解する",
  highlights: [
    "各証券会社の抽選方式の仕組み",
    "申込条件（最低購入資金等）",
    "取扱実績・過去の当選者数",
    "複数申し込み時の注意点",
  ],
  adHeadings: [
    "IPO抽選方式の選び方",
    "申込条件や抽選方式を確認",
    "IPO投資の口座選択ガイド",
    "複数証券会社でIPO申し込み",
  ],
  adDescriptions: [
    "証券会社によるIPO抽選方式の違いを整理します。申込条件の確認を。",
    "IPO投資の基礎知識、口座選びのポイント。",
  ],
  ctaLabel: "確認する",
  offerIds: ["securities-ipo-01"],
  primaryOfferId: "securities-ipo-01",
  suggestedBid: 140,
  contentVerified: false,
  notes: "確認待ち：IPO取扱実績は定期更新必要",
};

// ============================================
// 02. レンタルサーバー - WordPress
// ============================================

export const hostingWordPressIntent: SearchIntent = {
  id: "wordpress",
  category: "hosting",
  name: "WordPress対応レンタルサーバー",
  keywords: [
    "WordPress レンタルサーバー",
    "WordPress 初心者 サーバー",
    "WordPress 高速 サーバー",
  ],
  excludeKeywords: ["購入", "買う"],
  lpPath: "hosting/wordpress",
  lpTitle: "WordPress向けレンタルサーバーの選び方",
  lpHeadline: "WordPressサイト用サーバーの選定基準",
  lpSubheadline: "費用、速度、サポート体制から最適なサーバーを選ぶ",
  highlights: [
    "WordPress インストール機能",
    "サーバー速度・ストレージ容量",
    "セキュリティ対策（SSL等）",
    "サポート体制（電話・チャット等）",
  ],
  adHeadings: [
    "WordPress向けレンタルサーバー",
    "高速・安定・サポート充実",
    "初心者向けサーバー選択ガイド",
  ],
  adDescriptions: [
    "WordPressサイト構築に最適なサーバー選びのポイント。",
    "費用、速度、セキュリティを比較しましょう。",
  ],
  ctaLabel: "確認する",
  offerIds: ["hosting-wordpress-01"],
  primaryOfferId: "hosting-wordpress-01",
  suggestedBid: 120,
  contentVerified: false,
  notes: "確認待ち：各社の料金・仕様確認",
};

// ============================================
// 03. ウォーターサーバー - 家庭向け
// ============================================

export const waterServerFamilyIntent: SearchIntent = {
  id: "family",
  category: "water-server",
  name: "家庭向けウォーターサーバー",
  keywords: [
    "ウォーターサーバー 家庭",
    "ウォーターサーバー 料金",
    "ウォーターサーバー 比較",
  ],
  lpPath: "water-server/family",
  lpTitle: "家庭向けウォーターサーバー選び",
  lpHeadline: "ウォーターサーバーを選ぶ前に",
  lpSubheadline: "料金、水の種類、レンタル条件から判断する",
  highlights: [
    "月額料金と水の配送料",
    "宅配水と浄水型の違い",
    "レンタル条件（最低利用期間等）",
    "配送スケジュール・エリア",
  ],
  adHeadings: [
    "ウォーターサーバー選び",
    "料金・配送条件を確認",
    "家庭向けプランの比較",
  ],
  adDescriptions: [
    "ウォーターサーバーの月額料金、配送エリア、契約期間を比較。",
  ],
  ctaLabel: "確認する",
  offerIds: ["water-server-family-01"],
  primaryOfferId: "water-server-family-01",
  suggestedBid: 100,
  contentVerified: false,
  notes: "確認待ち：各社の料金確認",
};

// ============================================
// 04. 美容クリニック - 選び方
// ============================================

export const beautyClinicSelectionIntent: SearchIntent = {
  id: "selection",
  category: "beauty-clinic",
  name: "美容クリニック選び",
  keywords: [
    "美容クリニック 選び方",
    "美容皮膚科 選び方",
    "医療脱毛 クリニック",
  ],
  lpPath: "beauty-clinic/selection",
  lpTitle: "美容クリニック選びのポイント",
  lpHeadline: "美容クリニック選びで確認すること",
  lpSubheadline: "医師資格、費用、リスク説明から判断する。⚠️ 医療広告ガイドライン遵守",
  highlights: [
    "医師の資格・経歴",
    "施術内容と費用",
    "リスク・副作用の説明",
    "カウンセリング内容",
  ],
  adHeadings: [
    "美容クリニック選びガイド",
    "無料カウンセリング相談",
  ],
  adDescriptions: [
    "美容クリニック選びの確認基準。医師の資格、費用、リスク説明。",
  ],
  ctaLabel: "相談する",
  offerIds: ["beauty-clinic-selection-01"],
  primaryOfferId: "beauty-clinic-selection-01",
  contentVerified: false,
  notes: "⚠️ 医療広告ガイドライン要確認。効果保証を禁止。",
};

// ============================================
// 05. 脱毛サロン - 料金
// ============================================

export const hairRemovalPricingIntent: SearchIntent = {
  id: "pricing",
  category: "hair-removal",
  name: "脱毛サロン料金・プラン",
  keywords: [
    "脱毛サロン 料金",
    "脱毛サロン 無制限プラン",
    "脱毛 全身 価格",
  ],
  lpPath: "hair-removal/pricing",
  lpTitle: "脱毛サロン料金比較",
  lpHeadline: "脱毛サロンの料金と契約条件",
  lpSubheadline: "月額、総額、契約期間から自分に合ったプランを選ぶ",
  highlights: [
    "月額制と回数制の違い",
    "全身脱毛と部位別の料金",
    "キャンセル・休止条件",
    "効果の目安と施術回数",
  ],
  adHeadings: [
    "脱毛サロン料金比較",
    "全身脱毛プラン選び",
  ],
  adDescriptions: [
    "脱毛サロンの月額制・回数制料金を比較。契約条件も確認しましょう。",
  ],
  ctaLabel: "相談する",
  offerIds: ["hair-removal-pricing-01"],
  primaryOfferId: "hair-removal-pricing-01",
  contentVerified: false,
  notes: "確認待ち：各社の料金体系確認",
};

// ============================================
// 06. AGA治療 - 相談先
// ============================================

export const agaConsultationIntent: SearchIntent = {
  id: "consultation",
  category: "aga",
  name: "AGA治療相談先",
  keywords: [
    "AGA治療 相談",
    "AGA オンライン診療",
    "抜け毛 相談 医師",
  ],
  lpPath: "aga/consultation",
  lpTitle: "AGA治療の相談先と費用確認",
  lpHeadline: "AGA治療を相談する前に",
  lpSubheadline: "医師資格、治療内容、費用、リスク説明を確認。⚠️ 医療広告ガイドライン遵守",
  highlights: [
    "医師による初診の必要性",
    "治療薬と費用",
    "副作用とリスク",
    "オンライン・通院どちらが適切か",
  ],
  adHeadings: [
    "AGA治療相談ガイド",
    "初診・オンライン相談",
  ],
  adDescriptions: [
    "AGA治療を検討する際の確認事項。医師の診察、費用、副作用。",
  ],
  ctaLabel: "相談する",
  offerIds: ["aga-consultation-01"],
  primaryOfferId: "aga-consultation-01",
  contentVerified: false,
  notes: "⚠️ 医療広告ガイドライン要確認。治療効果の保証禁止。",
};

// ============================================
// 07. 結婚相談所 - 選び方
// ============================================

export const marriageSelectionIntent: SearchIntent = {
  id: "selection",
  category: "marriage",
  name: "結婚相談所選び",
  keywords: [
    "結婚相談所 選び方",
    "結婚相談所 料金",
    "結婚相談所 30代",
  ],
  lpPath: "marriage/selection",
  lpTitle: "結婚相談所選びのポイント",
  lpHeadline: "結婚相談所を選ぶ前に",
  lpSubheadline: "会員数、費用、サポート内容から判断する",
  highlights: [
    "会員数・登録者の年齢層",
    "月額費用と成婚料",
    "サポート内容（プロフィール作成等）",
    "無料説明会・カウンセリング",
  ],
  adHeadings: [
    "結婚相談所選びガイド",
    "無料説明会で相談",
  ],
  adDescriptions: [
    "結婚相談所選びの確認基準。会員数、料金、サポート体制。",
  ],
  ctaLabel: "説明会を予約",
  offerIds: ["marriage-selection-01"],
  primaryOfferId: "marriage-selection-01",
  contentVerified: false,
  notes: "確認待ち：各社の会員数・料金確認",
};

// ============================================
// 08. 占い - オンライン
// ============================================

export const fortuneOnlineIntent: SearchIntent = {
  id: "online",
  category: "fortune",
  name: "オンライン占いサービス",
  keywords: [
    "占い オンライン",
    "電話占い 相談",
    "占い アプリ",
  ],
  lpPath: "fortune/online",
  lpTitle: "オンライン占いサービス選び",
  lpHeadline: "オンライン占いサービスの選び方",
  lpSubheadline: "占い師の経歴、料金、サービス形式から判断。⚠️ 根拠のない効果保証を避ける",
  highlights: [
    "占い師の経歴・資格",
    "料金（鑑定料・待機時間等）",
    "電話・チャット・映像の選択肢",
    "初回割引やポイント還元",
  ],
  adHeadings: [
    "オンライン占い選び",
    "新規利用者向け割引",
  ],
  adDescriptions: [
    "オンライン占いサービスの選び方。占い師の経歴、料金、形式を確認。",
  ],
  ctaLabel: "利用を開始",
  offerIds: ["fortune-online-01"],
  primaryOfferId: "fortune-online-01",
  contentVerified: false,
  notes: "⚠️ 根拠のない効果保証禁止。科学的根拠不明。",
};

// ============================================
// 09. ダイエット - 支援サービス
// ============================================

export const dietSupportIntent: SearchIntent = {
  id: "support",
  category: "diet",
  name: "ダイエット支援サービス",
  keywords: [
    "ダイエット 支援 サービス",
    "パーソナルトレーニング 料金",
    "ダイエット アプリ",
  ],
  lpPath: "diet/support",
  lpTitle: "ダイエット支援サービス選び",
  lpHeadline: "ダイエット支援サービスの選び方",
  lpSubheadline: "指導形式、費用、専門家資格から判断。⚠️ 医学的根拠のない保証禁止",
  highlights: [
    "指導者の資格（栄養士等）",
    "オンライン・通院どちらか",
    "月額費用と契約期間",
    "食事記録アプリやジム施設の有無",
  ],
  adHeadings: [
    "ダイエット支援選び",
    "専門家による食事・運動指導",
  ],
  adDescriptions: [
    "ダイエット支援サービスの選び方。指導者資格、費用、形式を確認。",
  ],
  ctaLabel: "相談する",
  offerIds: ["diet-support-01"],
  primaryOfferId: "diet-support-01",
  contentVerified: false,
  notes: "確認待ち：各サービスの指導内容確認。医学的根拠不明な保証禁止。",
};

// ============================================
// 10. 低身長 - サービス
// ============================================

export const shortStatureServicesIntent: SearchIntent = {
  id: "services",
  category: "short-stature",
  name: "低身長関連サービス",
  keywords: [
    "低身長 相談",
    "身長 改善 相談",
    "成長相談 医師",
  ],
  lpPath: "short-stature/services",
  lpTitle: "低身長関連サービスと相談先",
  lpHeadline: "身長に関する相談先とサービス",
  lpSubheadline: "医学的相談と非医学的サービスを明確に分離。⚠️ 未成年・身体的不安に慎重",
  highlights: [
    "医学的相談（医師による診察）",
    "非医学的サービス（靴・ファッション等）",
    "成長に関する学的情報",
    "相談無料と有料の区別",
  ],
  adHeadings: [
    "身長に関する相談先",
    "医学的相談とサービス",
  ],
  adDescriptions: [
    "身長に関する相談先と支援サービス。医学的相談と非医学的支援を区別。",
  ],
  ctaLabel: "相談する",
  offerIds: ["short-stature-services-01"],
  primaryOfferId: "short-stature-services-01",
  contentVerified: false,
  notes: "⚠️ 未成年者向け訴求は避ける。身体的不安をあおらない。医学と非医学を明確分離。",
};

// ============================================
// 検索意図一覧
// ============================================

export const allSearchIntents: SearchIntent[] = [
  securitiesNisaIntent,
  securitiesIpoIntent,
  hostingWordPressIntent,
  waterServerFamilyIntent,
  beautyClinicSelectionIntent,
  hairRemovalPricingIntent,
  agaConsultationIntent,
  marriageSelectionIntent,
  fortuneOnlineIntent,
  dietSupportIntent,
  shortStatureServicesIntent,
];

// ============================================
// ヘルパー関数
// ============================================

export function getIntentById(id: string): SearchIntent | undefined {
  return allSearchIntents.find((intent) => intent.id === id);
}

export function getIntentsByCategory(category: string): SearchIntent[] {
  return allSearchIntents.filter((intent) => intent.category === category);
}

export function getIntentByPath(category: string, intent: string): SearchIntent | undefined {
  return allSearchIntents.find((i) => i.category === category && i.id === intent);
}

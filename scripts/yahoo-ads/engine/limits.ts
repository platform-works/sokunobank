/**
 * 媒体別の広告文の上限。媒体ごとに別定義にして、混同しない。
 * 値と確認状況を verified に残す。確認できていない媒体の値は、入稿前に必ず公式ヘルプで再確認する。
 */
export interface RsaLimits {
  platform: "google" | "yahoo";
  /** 単位: 全角=2・半角=1 の重み（width.ts） */
  headlineMax: number;
  headlineCount: { min: number; max: number };
  descriptionMax: number;
  descriptionCount: { min: number; max: number };
  /** 表示URLのパス（この媒体にない場合は null。値を作らない） */
  pathMax: number | null;
  verified: { source: string; checkedAt: string; note: string };
}

export const GOOGLE_RSA: RsaLimits = {
  platform: "google",
  headlineMax: 30,
  headlineCount: { min: 3, max: 15 },
  descriptionMax: 90,
  descriptionCount: { min: 2, max: 4 },
  pathMax: 15,
  verified: {
    source: "https://support.google.com/google-ads/answer/7684791 （Google 広告ヘルプ: Responsive search ad requirements）",
    checkedAt: "2026-10-10",
    note: "見出し3〜15（各30）、説明文2〜4（各90）、パス各15。日本語の全角は1文字を2文字として数える。",
  },
};

export const YAHOO_RSA: RsaLimits = {
  platform: "yahoo",
  // 全角15文字・半角30文字 / 全角45文字・半角90文字（全角=2換算で 30 / 90）
  headlineMax: 30,
  headlineCount: { min: 3, max: 15 },
  descriptionMax: 90,
  descriptionCount: { min: 2, max: 4 },
  // 表示URLのパスの上限は、確認できていないため値を持たない
  pathMax: null,
  verified: {
    source: "https://www.lycbiz.com/jp/news/yahoo-ads/20210513-01 （LINEヤフー for Business: レスポンシブ検索広告の提供開始。2021年5月の告知）",
    checkedAt: "2026-10-10",
    note: "2021年の告知に基づく値。現行の入稿規定・CSV の列名は未確認のため、入稿前に管理画面・公式ヘルプで再確認する。入稿用 CSV は作らない。",
  },
};

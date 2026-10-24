import type { ProductListing, ReviewAnalysis, ReviewRecord, TrustReport } from "./types";

/** 件数しきい値。初期仮説でありカテゴリごとに調整する */
export const TRUST_THRESHOLDS = { insufficient: 10, reference: 30 } as const;

const RECENT_DAYS = 365;

/**
 * Review Trust Evaluator。本文レビュー(あれば)と集計値から信頼度を判定する。
 * 不正を断定せず、異常傾向を anomalies に記録する。件数が少なければ「参考情報」止まり。
 */
export function evaluateTrust(params: {
  productKey: string;
  analysis: ReviewAnalysis | null;
  reviews: ReviewRecord[];
  aggregate: ProductListing["aggregateReview"];
  now?: Date;
}): TrustReport {
  const { productKey, analysis, reviews, aggregate } = params;
  const now = params.now ?? new Date();
  const dist: TrustReport["ratingDistribution"] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const anomalies: string[] = [];
  const notes: string[] = [];

  const textCount = analysis?.analyzedCount ?? 0;
  const aggregateOnly = textCount === 0;
  const count = aggregateOnly ? aggregate?.count ?? 0 : textCount;

  let newest: string | null = null;
  if (!aggregateOnly) {
    for (const r of reviews) {
      const k = Math.round(r.rating) as 1 | 2 | 3 | 4 | 5;
      if (k >= 1 && k <= 5) dist[k]++;
    }
    const total = Object.values(dist).reduce((a, b) => a + b, 0);
    if (total > 0) {
      if (dist[5] / total >= 0.9 && total >= 10) anomalies.push("星5が90%以上に偏っている(異常傾向として記録。不正の断定ではない)");
      if ((dist[1] + dist[5]) / total >= 0.95 && total >= 10) anomalies.push("評価が両極端(1と5)に集中している");
    }
    newest = reviews.map((r) => r.postedAt).sort().at(-1) ?? null;
    if (newest && (now.getTime() - new Date(newest).getTime()) / 86400000 > RECENT_DAYS) anomalies.push("最新レビューが1年以上前");
    if (analysis && analysis.excluded.duplicate > 0) anomalies.push(`重複レビューを${analysis.excluded.duplicate}件除外`);
  } else {
    notes.push("本文は解析していない(集計値のみ)。論点別の傾向は算出不可");
  }

  let level: TrustReport["level"] = "standard";
  if (count < TRUST_THRESHOLDS.insufficient) level = "insufficient";
  else if (count < TRUST_THRESHOLDS.reference) level = "reference";
  if (level === "reference") notes.push("件数が少ないため参考情報として扱う");
  if (level === "insufficient") notes.push("件数不足のためレビュー評価は算出しない");
  if (aggregateOnly && level === "standard") level = "reference"; // 本文を確認できないものは確実性を下げる
  if (anomalies.length > 0 && level === "standard") level = "reference";

  return { productKey, level, analyzedCount: textCount, ratingDistribution: dist, anomalies, newestPostedAt: newest, aggregateOnly, notes };
}

/** 「購入者全体の評価」と書いてよいか。標本が全体を代表すると確認できない限り false */
export function mayClaimOverallBuyerRating(): boolean {
  return false;
}

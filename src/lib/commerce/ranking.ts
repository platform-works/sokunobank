import type { RankableProduct, RankingWeights, ScoredProduct } from "./types";

/**
 * 即納性・信頼性・収益性を統合した独自ランキングエンジン。カテゴリー非依存。
 * 重みは呼び出し側(カテゴリーごとのconfig)から注入し、ここにカテゴリー固有の値は置かない。
 */

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

/** 配送日スコア。day=0(当日)を最高評価とし、不明な場合は中間的な値を返す(過小評価も過大評価もしない)。 */
export function deliveryScore(deliveryDay: number | null): number {
  if (deliveryDay === 0) return 100;
  if (deliveryDay === 1) return 85;
  if (deliveryDay === 2) return 65;
  return 50;
}

/** レビュー評価スコア。件数はlog変換して寄与を抑え、大量レビュー商品だけが支配しないようにする。 */
export function reviewScore(rate: number, count: number): number {
  if (count <= 0) return 40; // レビューが無い商品を0点にはしない(新規出品の可能性もあるため)
  const base = (clamp(rate, 0, 5) / 5) * 70;
  const countBonus = Math.min(30, Math.log10(count + 1) * 12);
  return clamp(base + countBonus);
}

/** ストア信頼性スコア。ベストストアであること・ストア自体のレビュー評価と件数を考慮する。 */
export function storeScore(isBestSeller: boolean, storeRate: number, storeCount: number): number {
  const base = (clamp(storeRate, 0, 5) / 5) * 65;
  const countBonus = Math.min(20, Math.log10(storeCount + 1) * 10);
  const bestSellerBonus = isBestSeller ? 15 : 0;
  return clamp(base + countBonus + bestSellerBonus);
}

/** 想定成果報酬額(price * affiliateRate / 100)を算出し、referenceMaxに対して正規化する。 */
export function revenueScore(price: number, affiliateRate: number, referenceMax: number): {
  score: number;
  estimatedCommission: number;
} {
  const estimatedCommission = price * (affiliateRate / 100);
  const score = clamp((estimatedCommission / Math.max(1, referenceMax)) * 100);
  return { score, estimatedCommission };
}

/**
 * Yahooの実CVRは取得できないため、代理指標として「売れやすさ推定値」を算出する。
 * レビュー評価・件数・ストア信頼性・価格の妥当性から合成する(UI上には出さない内部値)。
 */
export function conversionProxyScore(params: {
  reviewScoreValue: number;
  storeScoreValue: number;
  price: number;
  priceMin?: number;
  priceMax?: number;
}): number {
  const { reviewScoreValue, storeScoreValue, price, priceMin, priceMax } = params;
  let priceFit = 70;
  if (priceMin !== undefined && price < priceMin) priceFit = 40;
  if (priceMax !== undefined && price > priceMax) priceFit = 40;
  return clamp(reviewScoreValue * 0.45 + storeScoreValue * 0.35 + priceFit * 0.2);
}

export function scoreProduct(
  product: RankableProduct,
  weights: RankingWeights,
  revenueScoreReferenceMax: number,
  priceFilter?: { min?: number; max?: number }
): ScoredProduct {
  const dScore = deliveryScore(product.deliveryDay);
  const rScore = reviewScore(product.reviewRate, product.reviewCount);
  const sScore = storeScore(product.storeIsBestSeller, product.storeReviewRate, product.storeReviewCount);
  const { score: revScore, estimatedCommission } = revenueScore(
    product.price,
    product.affiliateRate,
    revenueScoreReferenceMax
  );
  const cvScore = conversionProxyScore({
    reviewScoreValue: rScore,
    storeScoreValue: sScore,
    price: product.price,
    priceMin: priceFilter?.min,
    priceMax: priceFilter?.max,
  });

  const totalScore =
    dScore * weights.delivery +
    cvScore * weights.conversionProxy +
    rScore * weights.review +
    sScore * weights.store +
    revScore * weights.revenue;

  return {
    ...product,
    deliveryScore: dScore,
    reviewScore: rScore,
    storeScore: sScore,
    revenueScore: revScore,
    conversionProxyScore: cvScore,
    totalScore,
    estimatedCommission,
    // Yahoo!ショッピングの元URLをそのまま渡す。アフィリエイトリンクへの変換は
    // ValueCommerce LinkSwitchがブラウザ側で行うため、ここでは加工しない
    // (2026-09-27導入、詳細はtypes.tsのScoredProduct.productUrlコメント参照)。
    productUrl: product.url,
  };
}

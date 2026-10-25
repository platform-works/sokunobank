// 「レビュー評価・件数が高い商品を選ぶ」ためのカテゴリー非依存ロジック(2026-10-24導入、ユーザー指示)。
// 納期・報酬額は一切使わない。Yahoo!ショッピングの商品レビュー(平均・件数)だけで決める。
// 件数が少ない商品の平均は、全体の事前平均(3.8)へ寄せるベイズ補正で割り引く
// (reviewIntel/rankingEngine.ts のreviewAxisと同じ考え方・同じ定数)。

/** 事前平均(全体の平均的な評価)。件数が少ないほどこの値に寄せる */
export const REVIEW_PRIOR = 3.8;
/** 補正の強さ(仮想的に事前平均を何件分見込むか) */
export const REVIEW_PRIOR_WEIGHT = 15;
/** これ未満の件数の商品は、レビューによる推薦の対象にしない */
export const MIN_REVIEW_COUNT = 3;

export interface Reviewable {
  reviewRate: number;
  reviewCount: number;
  /** サーバーが楽天のレビューと照合して算出した合算の補正後評価(あれば、こちらを順位に使う) */
  reviewSignal?: number;
}

/** 順位付けに使う評価。reviewSignalがあればそれ、なければYahoo!のレビューを件数補正した値 */
export function rankingScore(p: Reviewable): number {
  return p.reviewSignal !== undefined ? p.reviewSignal : adjustedRating(p.reviewRate, p.reviewCount);
}

/** 件数補正後の評価平均(1〜5)。件数0は事前平均を返す */
export function adjustedRating(rate: number, count: number): number {
  const c = Math.max(0, count);
  const r = Math.min(5, Math.max(0, rate));
  return (r * c + REVIEW_PRIOR * REVIEW_PRIOR_WEIGHT) / (c + REVIEW_PRIOR_WEIGHT);
}

/**
 * レビュー評価・件数が高い順に上位limit件を返す。補正後平均の降順、同点は件数の多い順。
 * 件数がMIN_REVIEW_COUNT未満・評価0の商品は対象外(レビューが無い商品を推薦しない)。
 */
export function pickByReview<T extends Reviewable>(products: T[], limit: number): T[] {
  return products
    .filter((p) => p.reviewCount >= MIN_REVIEW_COUNT && p.reviewRate > 0)
    .map((p) => ({ p, score: rankingScore(p) }))
    .sort((a, b) => b.score - a.score || b.p.reviewCount - a.p.reviewCount)
    .slice(0, limit)
    .map((x) => x.p);
}

/** 「毎月5・15・25日」の「5のつく日」か(日本時間の日付で判定) */
export function isGotsukuDay(now: Date = new Date()): boolean {
  const day = Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tokyo", day: "numeric" }).format(now));
  return day % 10 === 5;
}

import { MIN_IDENTITY_CONFIDENCE } from "./productIdentityMatcher";
import type { AxisKey, AxisResult, RankedItem, RankingCandidate, RankingKind, RankingResult, UserNeed } from "./types";
import { RANKING_SOURCES } from "./types";

export const ALGORITHM_VERSION = "rie-0.1.0-dryrun";

/** 初期仮説の重み。カテゴリごとに調整・検証する */
export const DEFAULT_WEIGHTS: Record<AxisKey, number> = {
  review: 0.3,
  needFit: 0.3,
  spec: 0.2,
  price: 0.15,
  availability: 0.05,
};

/** 評価可能な軸の重み合計がこの値未満なら、比較不十分としてランキング対象外にする */
const MIN_EVALUABLE_WEIGHT = 0.5;
/** 順位を付けるために必要な最小商品数。満たさなければ候補一覧にする */
const MIN_RANKABLE_ITEMS = 3;

const clamp = (v: number) => Math.min(100, Math.max(0, v));

function reviewAxis(c: RankingCandidate, w: number): AxisResult {
  const agg = c.listing.aggregateReview;
  if (!agg || !c.trust || c.trust.level === "insufficient")
    return { key: "review", weight: w, score: null, reason: "評価不能(レビュー件数不足または集計値なし)" };
  // 件数が少ないほど全体平均(3.8)へ寄せるベイズ補正。参考情報はさらに確実性を下げる
  const prior = 3.8;
  const k = c.trust.level === "reference" ? 30 : 15;
  const adj = (agg.rate * agg.count + prior * k) / (agg.count + k);
  return { key: "review", weight: w, score: clamp(((adj - 1) / 4) * 100), reason: `補正後平均${adj.toFixed(2)}(元${agg.rate}/${agg.count}件, 信頼度:${c.trust.level})` };
}

function needFitAxis(c: RankingCandidate, need: UserNeed, w: number): AxisResult {
  if (!c.analysis || c.analysis.analyzedCount < 10 || need.priorityThemes.length === 0)
    return { key: "needFit", weight: w, score: null, reason: "評価不能(用途に関する本文レビューを解析できていない)" };
  let sum = 0;
  let n = 0;
  const parts: string[] = [];
  for (const t of need.priorityThemes) {
    const s = c.analysis.themes.find((x) => x.theme === t);
    if (!s || s.mentions < 3) continue;
    const ratio = (s.positive - s.negative) / s.mentions; // -1..1
    sum += ((ratio + 1) / 2) * 100;
    n++;
    parts.push(`${t}: 肯定${s.positive}/否定${s.negative}/言及${s.mentions}`);
  }
  if (n === 0) return { key: "needFit", weight: w, score: null, reason: "評価不能(重視テーマへの言及が少ない)" };
  return { key: "needFit", weight: w, score: sum / n, reason: parts.join("; ") };
}

function specAxis(c: RankingCandidate, need: UserNeed, all: RankingCandidate[], w: number): AxisResult {
  const keys = Object.keys(need.specPreference);
  if (keys.length === 0) return { key: "spec", weight: w, score: null, reason: "評価不能(比較する仕様項目の指定なし)" };
  let sum = 0;
  let n = 0;
  const parts: string[] = [];
  for (const k of keys) {
    const v = c.listing.specs[k];
    const vals = all.map((x) => x.listing.specs[k]).filter((x): x is number => typeof x === "number");
    if (typeof v !== "number" || vals.length < 2) continue;
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const norm = max === min ? 50 : ((v - min) / (max - min)) * 100;
    sum += need.specPreference[k] === "high" ? norm : 100 - norm;
    n++;
    parts.push(`${k}=${v}`);
  }
  if (n === 0) return { key: "spec", weight: w, score: null, reason: "評価不能(公式仕様の数値が取得できない)" };
  return { key: "spec", weight: w, score: sum / n, reason: `公式仕様 ${parts.join(", ")}(候補内相対評価)` };
}

function priceAxis(c: RankingCandidate, need: UserNeed, all: RankingCandidate[], w: number): AxisResult {
  const p = c.listing.price;
  if (p === null) return { key: "price", weight: w, score: null, reason: "評価不能(価格なし)" };
  if (need.budgetMax !== null && p > need.budgetMax) return { key: "price", weight: w, score: 0, reason: `予算${need.budgetMax}円超(${p}円)` };
  const prices = all.map((x) => x.listing.price).filter((x): x is number => x !== null);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return { key: "price", weight: w, score: max === min ? 50 : (1 - (p - min) / (max - min)) * 100, reason: `${p}円(候補内相対評価)` };
}

function availabilityAxis(c: RankingCandidate, w: number): AxisResult {
  const d = c.listing.deliveryDay;
  if (d === null) return { key: "availability", weight: w, score: null, reason: "評価不能(配送日不明)" };
  return { key: "availability", weight: w, score: d === 0 ? 100 : d === 1 ? 85 : d === 2 ? 65 : 40, reason: `配送予定${d === 0 ? "当日" : d + "日後"}` };
}

/**
 * Ranking Engine。入力型に報酬率・提携情報が存在しないため、順位に混ぜようがない。
 * Amazon出品はRANKING_SOURCES外なので代表出品に選ばない(呼び出し側で除外済みでも二重に弾く)。
 * 評価不能の軸は 0点/満点にせず、評価可能な軸の重みで再配分(合計0.5未満なら対象外)。
 */
export function rankProducts(candidates: RankingCandidate[], need: UserNeed, now: Date = new Date()): RankingResult {
  const excluded: RankingResult["excluded"] = [];
  const pool: RankingCandidate[] = [];
  for (const c of candidates) {
    if (c.identity.confidence < MIN_IDENTITY_CONFIDENCE) excluded.push({ productKey: c.identity.productKey, reason: "同一商品の確度が低い" });
    else if (!RANKING_SOURCES.includes(c.listing.source)) excluded.push({ productKey: c.identity.productKey, reason: `${c.listing.source}はランキング計算に使えない取得元` });
    else pool.push(c);
  }

  const scored = pool.map((c) => {
    const axes = [
      reviewAxis(c, DEFAULT_WEIGHTS.review),
      needFitAxis(c, need, DEFAULT_WEIGHTS.needFit),
      specAxis(c, need, pool, DEFAULT_WEIGHTS.spec),
      priceAxis(c, need, pool, DEFAULT_WEIGHTS.price),
      availabilityAxis(c, DEFAULT_WEIGHTS.availability),
    ];
    return { c, axes };
  });

  const items: RankedItem[] = [];
  for (const { c, axes } of scored) {
    const ok = axes.filter((a) => a.score !== null);
    const wSum = ok.reduce((s, a) => s + a.weight, 0);
    if (wSum < MIN_EVALUABLE_WEIGHT) {
      excluded.push({ productKey: c.identity.productKey, reason: `評価可能な軸の重み合計が${wSum.toFixed(2)}で比較不十分` });
      continue;
    }
    const total = ok.reduce((s, a) => s + (a.score as number) * a.weight, 0) / wSum;
    const missing = axes.filter((a) => a.score === null).map((a) => a.key);
    const best = [...ok].sort((a, b) => (b.score as number) - (a.score as number))[0];
    const worst = [...axes].sort((a, b) => (a.score ?? 101) - (b.score ?? 101))[0];
    items.push({
      rank: 0,
      productKey: c.identity.productKey,
      name: c.listing.name,
      totalScore: Math.round(total * 10) / 10,
      axes,
      renormalizedNote: missing.length ? `評価不能(${missing.join(",")})を除き、残りの軸の重みを${wSum.toFixed(2)}→1.00に再配分して算出` : null,
      selectionReason: `${best.key}が相対的に高評価: ${best.reason}`,
      drawbacks: [`${worst.key}: ${worst.reason}`, ...(c.trust?.anomalies ?? [])],
      evidence: axes.map((a) => `${a.key}(${a.weight}): ${a.score === null ? "評価不能" : a.score.toFixed(1)} - ${a.reason}`),
    });
  }
  items.sort((a, b) => b.totalScore - a.totalScore);
  items.forEach((it, i) => (it.rank = i + 1));

  const reviewBased = items.length > 0 && items.every((it) => it.axes.find((a) => a.key === "review")?.score !== null);
  let kind: RankingKind = reviewBased ? "review_based" : "spec_comparison";
  if (items.length < MIN_RANKABLE_ITEMS) {
    kind = "candidate_list"; // 比較可能な情報が不足 → 順位ではなく候補一覧
    items.forEach((it) => (it.rank = 0));
  }
  return {
    kind,
    algorithmVersion: ALGORITHM_VERSION,
    generatedAt: now.toISOString(),
    items,
    excluded,
    method:
      "購入者評価30%・用途適合30%・公式仕様20%・価格15%・納期5%(初期仮説)。評価不能の軸は重みを再配分、合計0.5未満は対象外。報酬率・提携有無・Amazonデータは計算に含めない。",
  };
}

import { generateLpContent, type AmazonAssociateLink, type LpContent } from "./lpContentGenerator";
import { matchProducts } from "./productIdentityMatcher";
import { rankProducts, ALGORITHM_VERSION } from "./rankingEngine";
import { collectReviews, type ReviewTextProvider } from "./reviewDataConnector";
import { analyzeReviews } from "./reviewSentimentAnalyzer";
import { evaluateTrust } from "./reviewTrustEvaluator";
import { licenseSummary } from "./sourceLicenseValidator";
import { RANKING_SOURCES } from "./types";
import type { ProductListing, RankingCandidate, ReviewAnalysis, RunLogEntry, TrustReport, UserNeed } from "./types";

export interface PipelineInput {
  /** DRY_RUN固定。falseを渡すと拒否する(本番公開は未実装) */
  dryRun: true;
  listings: ProductListing[];
  need: UserNeed;
  h1: string;
  conclusion: string;
  amazonLinks: AmazonAssociateLink[];
  providers?: ReviewTextProvider[];
  faq?: LpContent["faq"];
  now?: Date;
}

export async function runPipeline(input: PipelineInput) {
  if (input.dryRun !== true) throw new Error("本番公開は未実装です。DRY_RUNのみ実行できます。");
  const now = input.now ?? new Date();
  const identities = matchProducts(input.listings);
  const candidates: RankingCandidate[] = [];
  const analyses: Record<string, ReviewAnalysis | null> = {};
  const trusts: Record<string, TrustReport | null> = {};
  const listingsByKey: Record<string, ProductListing[]> = {};
  const log: RunLogEntry[] = [];
  let hadApiError = false;

  for (const id of identities) {
    listingsByKey[id.productKey] = id.listings;
    // 代表出品: ランキングに使える取得元(楽天/Yahoo!)のうち最安のもの
    const rankable = id.listings.filter((l) => RANKING_SOURCES.includes(l.source));
    const rep = [...rankable].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))[0];
    if (!rep) continue; // Amazon出品のみの商品は計算に使えない。同一性が低いものはランキング側で除外される
    const conn = await collectReviews(rep, input.providers);
    if (conn.error) hadApiError = true;
    const analysis = conn.reviews.length ? analyzeReviews(id.productKey, conn.reviews) : null;
    const trust = evaluateTrust({ productKey: id.productKey, analysis, reviews: conn.reviews, aggregate: conn.aggregate, now });
    analyses[id.productKey] = analysis;
    trusts[id.productKey] = trust;
    candidates.push({ identity: id, listing: { ...rep, aggregateReview: conn.aggregate }, analysis, trust });
    log.push({
      productKey: id.productKey,
      sources: [...new Set(id.listings.map((l) => l.source))],
      fetchMethod: conn.method,
      licenseSummary: licenseSummary([...new Set(id.listings.map((l) => l.source))]),
      analyzedCount: analysis?.analyzedCount ?? 0,
      analyzedAt: now.toISOString(),
      axes: ["review", "needFit", "spec", "price", "availability"],
      algorithmVersion: ALGORITHM_VERSION,
      missing: [...conn.missing, ...(id.separatedNotes ?? [])],
      sourceUrls: id.listings.map((l) => l.url),
      publishable: false, // LP生成後に確定
    });
  }

  const ranking = rankProducts(candidates, input.need, now);
  const lp = generateLpContent({
    h1: input.h1,
    conclusion: input.conclusion,
    ranking,
    listingsByKey,
    analyses,
    trusts,
    amazonLinks: input.amazonLinks,
    faq: input.faq ?? [],
    hadApiError,
  });
  for (const e of log) e.publishable = lp.publish.publishable;
  return { identities, ranking, lp, log, hadApiError };
}

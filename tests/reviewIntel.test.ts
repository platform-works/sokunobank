import { describe, expect, it } from "vitest";
import { runPipeline } from "../src/lib/reviewIntel/pipeline";
import { matchProducts } from "../src/lib/reviewIntel/productIdentityMatcher";
import { analyzeReviews } from "../src/lib/reviewIntel/reviewSentimentAnalyzer";
import { isValidAssociateLink } from "../src/lib/reviewIntel/lpContentGenerator";
import { decidePublish } from "../src/lib/reviewIntel/sourceLicenseValidator";
import type { ProductListing, ReviewRecord, UserNeed } from "../src/lib/reviewIntel/types";

const base = (o: Partial<ProductListing>): ProductListing => ({
  source: "yahoo", listingId: "x", url: "https://example.com/x", name: "ドライヤー", janCode: null, maker: "A社", brand: "A社",
  modelNumber: null, variantAttrs: {}, price: 10000, imageUrl: null, storeName: "店", deliveryDay: 1,
  aggregateReview: null, specs: {}, fetchedAt: "2026-10-24T00:00:00Z", ...o,
});
const need: UserNeed = { conditions: ["静音"], priorityThemes: ["静音"], specPreference: { noiseDb: "low" }, budgetMax: null };

describe("Product Identity Matcher", () => {
  it("JAN一致は束ね、同型番でも容量が違えば別商品にする", () => {
    const g = matchProducts([
      base({ listingId: "1", janCode: "4900000000001" }),
      base({ source: "rakuten", listingId: "2", janCode: "4900000000001" }),
      base({ listingId: "3", modelNumber: "KD-1", variantAttrs: { capacity: "1.0L" } }),
      base({ source: "rakuten", listingId: "4", modelNumber: "KD-1", variantAttrs: { capacity: "1.5L" } }),
    ]);
    expect(g).toHaveLength(3);
    expect(g[0].listings).toHaveLength(2);
    expect(g[1].separatedNotes[0]).toContain("capacity");
  });
});

describe("Review analyzer", () => {
  const rv = (id: string, text: string, target: ReviewRecord["target"] = "product"): ReviewRecord => ({
    source: "rakuten", reviewId: id, listingId: "1", rating: 4, postedAt: "2026-09-01", text, target,
  });
  it("許諾がない取得元の本文は解析に入れない(現状の登録では全て除外)", () => {
    const a = analyzeReviews("k", [rv("1", "静かで良い")]);
    expect(a.analyzedCount).toBe(0);
    expect(a.excluded.licenseDenied).toBe(1);
  });
});

describe("Pipeline (DRY_RUN)", () => {
  const listings = [
    base({ listingId: "a", janCode: "1", price: 8000, aggregateReview: { rate: 4.5, count: 200 }, specs: { noiseDb: 50 }, imageUrl: "https://img/a.jpg" }),
    base({ source: "rakuten", listingId: "ra", janCode: "1", price: 8500, aggregateReview: { rate: 4.4, count: 120 }, specs: { noiseDb: 50 } }),
    base({ listingId: "b", janCode: "2", price: 12000, aggregateReview: { rate: 4.8, count: 3 }, specs: { noiseDb: 40 } }),
    base({ listingId: "c", janCode: "3", price: 9000, aggregateReview: { rate: 4.0, count: 80 }, specs: { noiseDb: 60 } }),
    base({ source: "amazon", listingId: "B000000000", janCode: "4", price: 100, aggregateReview: { rate: 5, count: 9999 }, specs: { noiseDb: 1 } }),
  ];
  const run = () => runPipeline({ dryRun: true, listings, need, h1: "静かなドライヤー", conclusion: "結論", amazonLinks: [] });

  it("Amazonのデータはランキングに入らず、Amazonリンク未登録ならCTAは出ない", async () => {
    const r = await run();
    expect(r.ranking.items.some((i) => i.productKey === "jan:4")).toBe(false);
    expect(r.lp.firstViewAmazonCta).toBeNull();
    expect(r.lp.products.every((p) => p.amazonCta === null)).toBe(true);
  });

  it("本文レビューがないため購入者評価の本文分析は行わず、少数件の商品はレビュー軸が評価不能になる", async () => {
    const r = await run();
    // 3件のみ・用途適合も評価不能 → 評価可能な軸の重みが0.5未満で比較不十分として除外される
    expect(r.ranking.items.some((i) => i.productKey === "jan:2")).toBe(false);
    expect(r.ranking.excluded.find((e) => e.productKey === "jan:2")?.reason).toContain("比較不十分");
    const a = r.ranking.items.find((i) => i.productKey === "jan:1")!;
    expect(a.axes.find((x) => x.key === "needFit")!.score).toBeNull();
    expect(a.renormalizedNote).toContain("再配分");
    expect(r.lp.products[0].buyerEvaluation[0]).toContain("本文レビューの分析は行っていません");
  });

  it("画像・集計評価の公開許諾が未確認なので publishable は false", async () => {
    const r = await run();
    expect(r.lp.publish.publishable).toBe(false);
    expect(r.lp.publish.blockers.length).toBeGreaterThan(0);
  });

  it("商品が少なすぎる場合は順位を付けず候補一覧にする", async () => {
    const r = await runPipeline({ dryRun: true, listings: listings.slice(0, 1), need, h1: "h", conclusion: "c", amazonLinks: [] });
    expect(r.ranking.kind).toBe("candidate_list");
  });
});

describe("Amazon associate link", () => {
  it("タグ・ASIN形式が正しいものだけ有効", () => {
    const ok = { productKey: "k", asin: "B0ABCDEFGH", url: "https://www.amazon.co.jp/dp/B0ABCDEFGH?tag=sokunobank-22", extension: null };
    expect(isValidAssociateLink(ok)).toBe(true);
    expect(isValidAssociateLink({ ...ok, url: "https://www.amazon.co.jp/dp/B0ABCDEFGH" })).toBe(false);
    expect(isValidAssociateLink({ ...ok, asin: "bad" })).toBe(false);
  });
  it("確認済みリンクがあればファーストビューCTAに出る", async () => {
    const r = await runPipeline({
      dryRun: true,
      listings: [1, 2, 3].map((n) => base({ listingId: String(n), janCode: String(n), price: 1000 * n, specs: { noiseDb: 40 + n }, aggregateReview: { rate: 4, count: 100 } })),
      need, h1: "h", conclusion: "c",
      amazonLinks: [{ productKey: "jan:1", asin: "B0ABCDEFGH", url: "https://www.amazon.co.jp/dp/B0ABCDEFGH?tag=sokunobank-22", extension: null }],
    });
    expect(r.lp.firstViewAmazonCta?.url).toContain("tag=sokunobank-22");
  });
});

describe("decidePublish", () => {
  it("APIエラー時は公開を止める", () => {
    expect(decidePublish({ sources: [], showsReviewText: false, showsAggregate: false, showsImages: false, hadApiError: true }).publishable).toBe(false);
  });
});

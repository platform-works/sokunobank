import { describe, expect, it } from "vitest";
import { buildReviewSignals, modelTokens } from "../src/lib/rakuten/signal";
import { adjustedRating, pickByReview } from "../src/lib/commerce/reviewPick";
import type { RakutenProduct } from "../src/lib/rakuten/types";

const rk = (o: Partial<RakutenProduct>): RakutenProduct => ({
  source: "rakuten", itemCode: "s:1", name: "インバーター発電機 DK3000iS", modelNumber: null, janCode: null, price: 80000,
  imageUrl: null, itemUrl: null, affiliateUrl: null, shopName: null, reviewAverage: 4.5, reviewCount: 100, ...o,
});
const yh = (o: Partial<{ code: string; name: string; price: number; reviewRate: number; reviewCount: number }>) => ({
  code: "y1", name: "EENOUR 発電機 DK3000iS 3000W", price: 76900, reviewRate: 4.0, reviewCount: 20, ...o,
});

describe("modelTokens", () => {
  it("型番は拾い、仕様値(3000W・2048Wh・mAh)は拾わない", () => {
    expect(modelTokens("EENOUR DK3000iS 3000W 2048Wh 120000mAh 100V")).toEqual(["dk3000is"]);
  });
  it("全角・ハイフン・大文字小文字を正規化する", () => {
    expect(modelTokens("ＤＫ-3000ＩＳ")).toEqual(["dk3000is"]);
  });
});

describe("buildReviewSignals", () => {
  it("型番一致+価格帯が近ければ、両方のレビューを合算した補正後評価になる", () => {
    const m = buildReviewSignals([yh({})], [rk({})]);
    const s = m.get("y1")!;
    expect(s.rakutenMatches).toBe(1);
    // (4.0*20 + 4.5*100) / 120 = 4.4167 を件数120で補正
    expect(s.score).toBeCloseTo(adjustedRating((4.0 * 20 + 4.5 * 100) / 120, 120), 6);
    expect(s.score).toBeGreaterThan(adjustedRating(4.0, 20));
  });
  it("価格が±30%を超えるとセット品・別仕様とみなして使わない", () => {
    expect(buildReviewSignals([yh({ price: 30000 })], [rk({})]).size).toBe(0);
  });
  it("型番が違う、または型番が複数併記された商品は使わない(曖昧)", () => {
    expect(buildReviewSignals([yh({ name: "EENOUR 発電機 DK2500iS" })], [rk({})]).size).toBe(0);
    expect(buildReviewSignals([yh({})], [rk({ name: "発電機 DK3000iS DK2500iS" })]).size).toBe(0);
  });
  it("楽天側にレビューがない商品は使わない", () => {
    expect(buildReviewSignals([yh({})], [rk({ reviewAverage: null, reviewCount: null })]).size).toBe(0);
  });
  it("Yahoo!にレビューがなくても、楽天のレビューだけで信号が付く", () => {
    const s = buildReviewSignals([yh({ reviewRate: 0, reviewCount: 0 })], [rk({})]).get("y1")!;
    expect(s.score).toBeCloseTo(adjustedRating(4.5, 100), 6);
  });
});

describe("pickByReview + reviewSignal", () => {
  it("reviewSignalがある商品は、その値で順位付けされる", () => {
    const a = { name: "a", reviewRate: 4.6, reviewCount: 80 };
    const b = { name: "b", reviewRate: 4.3, reviewCount: 40, reviewSignal: 4.7 };
    expect(pickByReview([a, b], 1)[0].name).toBe("b");
  });
});

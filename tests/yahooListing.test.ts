import { describe, expect, it } from "vitest";
import { yahooToListing } from "../src/lib/commerce/yahooListing";
import type { RankableProduct } from "../src/lib/commerce/types";

const p = (o: Partial<RankableProduct>): RankableProduct => ({
  code: "s_1", janCode: "4900000000001", name: "ドライヤー", descriptionText: "", url: "https://store.shopping.yahoo.co.jp/s/1.html",
  image: "https://item-shopping.c.yimg.jp/i/j/s_1", price: 9800, reviewRate: 4.5, reviewCount: 20, storeName: "店",
  storeIsBestSeller: false, storeReviewRate: 4, storeReviewCount: 100, affiliateRate: 3, deliveryDay: 1, brand: "A社", ...o,
});

describe("yahooToListing", () => {
  it("共通モデルへ変換し、報酬率は引き継がない", () => {
    const l = yahooToListing(p({}), "2026-10-24T00:00:00Z");
    expect(l.source).toBe("yahoo");
    expect(l.aggregateReview).toEqual({ rate: 4.5, count: 20 });
    expect(JSON.stringify(l)).not.toContain("affiliateRate");
  });
  it("レビュー0件は評価なし(null)、価格0・画像なしもnull", () => {
    const l = yahooToListing(p({ reviewCount: 0, reviewRate: 0, price: 0, image: "" }), "t");
    expect(l.aggregateReview).toBeNull();
    expect(l.price).toBeNull();
    expect(l.imageUrl).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { adjustedRating, isGotsukuDay, pickByReview } from "../src/lib/commerce/reviewPick";

const p = (name: string, reviewRate: number, reviewCount: number) => ({ name, reviewRate, reviewCount });

describe("pickByReview", () => {
  it("少数の満点より、多数の高評価を上位にする(件数補正)", () => {
    const r = pickByReview([p("少数満点", 5, 3), p("多数高評価", 4.6, 300)], 2);
    expect(r.map((x) => x.name)).toEqual(["多数高評価", "少数満点"]);
  });
  it("レビュー件数が少ない・評価なしは対象外", () => {
    expect(pickByReview([p("a", 5, 2), p("b", 0, 50), p("c", 4, 0)], 3)).toEqual([]);
  });
  it("同じ補正後評価なら件数が多い方を先にする", () => {
    expect(adjustedRating(3.8, 10)).toBeCloseTo(3.8);
    expect(adjustedRating(3.8, 100)).toBeCloseTo(3.8);
    const r = pickByReview([p("少", 3.8, 10), p("多", 3.8, 100)], 2);
    expect(r[0].name).toBe("多");
  });
  it("limitを超えて返さず、入力を変更しない", () => {
    const input = [p("a", 4, 10), p("b", 4.5, 10), p("c", 3, 10)];
    expect(pickByReview(input, 1)).toHaveLength(1);
    expect(input.map((x) => x.name)).toEqual(["a", "b", "c"]);
  });
});

describe("isGotsukuDay", () => {
  it("日本時間の5・15・25日だけtrue", () => {
    expect(isGotsukuDay(new Date("2026-10-05T03:00:00+09:00"))).toBe(true);
    expect(isGotsukuDay(new Date("2026-10-15T23:30:00+09:00"))).toBe(true);
    expect(isGotsukuDay(new Date("2026-10-25T00:10:00+09:00"))).toBe(true);
    expect(isGotsukuDay(new Date("2026-10-24T23:59:00+09:00"))).toBe(false);
    expect(isGotsukuDay(new Date("2026-10-10T12:00:00+09:00"))).toBe(false);
  });
});

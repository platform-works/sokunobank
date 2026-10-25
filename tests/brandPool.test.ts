import { describe, expect, it } from "vitest";
import { matchesWords, mergeBrandExtras, prioritizeBrand } from "../src/lib/commerce/brandPool";

const p = (code: string, name: string, janCode: string | null = null, brand: string | null = null) => ({ code, name, janCode, brand });

describe("mergeBrandExtras", () => {
  it("共通の商品群に、ブランド追加分のうち未掲載のものだけを足す", () => {
    const base = [p("a", "A商品"), p("b", "B商品")];
    const extras = [p("b", "B商品(重複)"), p("c", "C商品")];
    expect(mergeBrandExtras(base, extras).map((x) => x.code)).toEqual(["a", "b", "c"]);
  });
  it("同じJAN・同じ商品名の重複は、共通の商品群のほうを残す", () => {
    const base = [p("a", "同名", "4900000000001")];
    const extras = [p("x", "別名", "4900000000001"), p("y", "同名")];
    expect(mergeBrandExtras(base, extras).map((x) => x.code)).toEqual(["a"]);
  });
  it("入力を変更しない", () => {
    const base = [p("a", "A")];
    mergeBrandExtras(base, [p("b", "B")]);
    expect(base).toHaveLength(1);
  });
});

describe("prioritizeBrand", () => {
  it("指定ブランドの商品を先頭へ寄せ、各グループ内の順序は維持する", () => {
    const sorted = [p("1", "EENOUR 発電機"), p("2", "Jackery 1000"), p("3", "BLUETTI"), p("4", "ジャクリ 240")];
    expect(prioritizeBrand(sorted, ["jackery", "ジャクリ"]).map((x) => x.code)).toEqual(["2", "4", "1", "3"]);
  });
  it("ブランド名の欄でも判定する(大文字小文字を区別しない)", () => {
    expect(matchesWords(p("1", "ポータブル電源", null, "JACKERY"), ["jackery"])).toBe(true);
    expect(matchesWords(p("1", "ポータブル電源"), ["jackery"])).toBe(false);
  });
});

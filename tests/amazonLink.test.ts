import { describe, expect, it } from "vitest";
import { amazonJanUrl, isValidJan } from "../src/lib/commerce/amazonLink";

describe("amazonJanUrl", () => {
  it("13桁・8桁のJANから検索結果URLを作り、アソシエイトタグを付ける", () => {
    expect(amazonJanUrl("6975137430096")).toBe("https://www.amazon.co.jp/s?k=6975137430096&tag=sokunobank-22");
    expect(amazonJanUrl("49123456")).toBe("https://www.amazon.co.jp/s?k=49123456&tag=sokunobank-22");
  });
  it("桁数・文字が不正なJANはnull(ボタンを出さない)", () => {
    for (const bad of ["", "123", "697513743009", "69751374300961", "69751374300a6", "6975137430096&tag=x", null, undefined]) {
      expect(amazonJanUrl(bad as never)).toBeNull();
      expect(isValidJan(bad as never)).toBe(false);
    }
  });
});

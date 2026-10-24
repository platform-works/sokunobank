import { describe, expect, it } from "vitest";
import { yahooImageUrl } from "../src/lib/commerce/yahooImage";

describe("yahooImageUrl", () => {
  it("Yahoo!の商品画像URLのサイズ文字を差し替える(既定は600px)", () => {
    expect(yahooImageUrl("https://item-shopping.c.yimg.jp/i/g/dji-store_6937224125704k")).toBe("https://item-shopping.c.yimg.jp/i/l/dji-store_6937224125704k");
    expect(yahooImageUrl("https://item-shopping.c.yimg.jp/i/c/shop_item-1", "k")).toBe("https://item-shopping.c.yimg.jp/i/k/shop_item-1");
  });
  it("想定外のURL・空は、そのまま(空はnull→空文字)", () => {
    expect(yahooImageUrl("https://example.com/i/g/x")).toBe("https://example.com/i/g/x");
    expect(yahooImageUrl("http://item-shopping.c.yimg.jp/i/g/x")).toBe("http://item-shopping.c.yimg.jp/i/g/x");
    expect(yahooImageUrl("https://item-shopping.c.yimg.jp/i/g/x?a=1")).toBe("https://item-shopping.c.yimg.jp/i/g/x?a=1");
    expect(yahooImageUrl("")).toBe("");
    expect(yahooImageUrl(null)).toBe("");
  });
});

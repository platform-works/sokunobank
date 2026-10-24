import { describe, expect, it } from "vitest";
import { descriptionExcerpt } from "../src/lib/commerce/descriptionExcerpt";
import { amazonKeywordUrl } from "../src/lib/commerce/amazonLink";

describe("descriptionExcerpt", () => {
  it("HTMLタグと注意書きの行を除いて、文章を抜粋する", () => {
    const raw =
      "※画像はイメージです。<br>※沖縄県への発送は出来ません<br><br>防災や車中泊で使える大容量のポータブル電源です。シガーソケットからも充電できます。<br>●商品名 ポータブル電源";
    expect(descriptionExcerpt(raw)).toBe("防災や車中泊で使える大容量のポータブル電源です。シガーソケットからも充電できます。");
  });
  it("配送・在庫・返品などの案内文は商品説明として使わない", () => {
    const raw =
      "*在庫状況により、関西倉庫から関東地方のお客様に商品発送される場合があり、翌日午前の配達に遅れる場合がございます。ご了承ください。<br>返品・交換は商品到着後7日以内にご連絡ください。ポイント倍率は変更になる場合があります。";
    expect(descriptionExcerpt(raw)).toBe("");
  });
  it("関連キーワード以降のタグ羅列は使わない", () => {
    const raw = "軽量で持ち運びやすい、家庭用のインバーター発電機です。<br>★関連キーワード★ 発電機 防災 台風 停電 キャンプ 車中泊";
    expect(descriptionExcerpt(raw)).toBe("軽量で持ち運びやすい、家庭用のインバーター発電機です。");
  });
  it("キーワードの羅列・空・短すぎる文章は空文字", () => {
    expect(descriptionExcerpt("ポータブル電源 コンパクト 防災 蓄電池 家庭用 車中泊 キャンプ 停電 災害 非常用")).toBe("");
    expect(descriptionExcerpt("")).toBe("");
    expect(descriptionExcerpt(null)).toBe("");
    expect(descriptionExcerpt("新品です。")).toBe("");
  });
  it("長い文章は140字で切って省略記号を付ける", () => {
    const long = "とても長い説明文です、" + "あ".repeat(300) + "。";
    const r = descriptionExcerpt(long);
    expect(r.length).toBe(141);
    expect(r.endsWith("…")).toBe(true);
  });
});

describe("amazonKeywordUrl", () => {
  it("キーワード検索のURLを作り、空のキーワードはnull", () => {
    expect(amazonKeywordUrl("EENOUR 発電機")).toBe(
      `https://www.amazon.co.jp/s?k=${encodeURIComponent("EENOUR 発電機")}&tag=sokunobank-22`
    );
    expect(amazonKeywordUrl("  ")).toBeNull();
    expect(amazonKeywordUrl(null)).toBeNull();
  });
});

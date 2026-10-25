import { describe, expect, it } from "vitest";
import { searchRakuten, normalizeItem, extractModelNumber, isTrustedRakutenUrl, RAKUTEN_ENDPOINT } from "../src/lib/rakuten/client";
import { matchYahooRakuten, formatRakutenRating, rakutenToListing } from "../src/lib/rakuten/match";
import { RakutenApiError } from "../src/lib/rakuten/types";
import type { RankableProduct } from "../src/lib/commerce/types";

const env = { RAKUTEN_APPLICATION_ID: "app-test", RAKUTEN_ACCESS_KEY: "key-test" };
const noSleep = async () => {};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

const item = {
  itemName: "静音ドライヤー KD-2000 大風量",
  itemCode: "shop:1",
  itemPrice: 9800,
  itemUrl: "https://item.rakuten.co.jp/shop/1/",
  shopName: "テスト店",
  mediumImageUrls: ["https://thumbnail.image.rakuten.co.jp/a.jpg"],
  reviewAverage: "4.5",
  reviewCount: 12,
};

const yahoo = (o: Partial<RankableProduct>): RankableProduct => ({
  code: "y1", janCode: null, name: "ドライヤー KD-2000", descriptionText: "", url: "https://shopping.yahoo.co.jp/x", image: "",
  price: 10000, reviewRate: 0, reviewCount: 0, storeName: "", storeIsBestSeller: false, storeReviewRate: 0, storeReviewCount: 0,
  affiliateRate: 0, deliveryDay: 1, brand: null, ...o,
});

describe("normalizeItem", () => {
  it("取得できない項目はnull、件数0の評価は評価なしにする", () => {
    const p = normalizeItem({ itemName: "A", itemCode: "s:1", reviewAverage: 0, reviewCount: 0 })!;
    expect(p.price).toBeNull();
    expect(p.imageUrl).toBeNull();
    expect(p.reviewAverage).toBeNull();
    expect(p.reviewCount).toBeNull();
    expect(p.janCode).toBeNull();
  });
  it("必須項目欠落は捨てる", () => {
    expect(normalizeItem({ itemName: "A" })).toBeNull();
  });
  it("型番は一意に取れた場合のみ", () => {
    expect(extractModelNumber("ドライヤー KD-2000")).toBe("KD-2000");
    expect(extractModelNumber("KD-2000 と HD-3000 のセット")).toBeNull();
  });
});

describe("searchRakuten", () => {
  it("認証情報なしは no_credentials", async () => {
    await expect(searchRakuten({}, { keyword: "ドライヤー" })).rejects.toMatchObject({ kind: "no_credentials" });
  });
  it("新エンドポイント・認証・Refererを付けて取得し、正規化する", async () => {
    let seen: { url: string; referer: string | null } | undefined;
    const fetchImpl = (async (u: string, init?: RequestInit) => {
      seen = { url: u, referer: new Headers(init?.headers).get("referer") };
      return json({ items: [item] });
    }) as unknown as typeof fetch;
    const r = await searchRakuten(env, { keyword: "ドライヤー", hits: 99 }, { fetchImpl, sleep: noSleep });
    expect(seen!.url.startsWith(RAKUTEN_ENDPOINT)).toBe(true);
    expect(seen!.url).toContain("applicationId=app-test");
    expect(seen!.url).toContain("accessKey=key-test");
    expect(seen!.url).toContain("hits=30");
    expect(seen!.referer).toBe("https://sokunobank.com/");
    expect(r[0]).toMatchObject({ itemCode: "shop:1", price: 9800, reviewAverage: 4.5, reviewCount: 12 });
  });
  it("429は再試行して成功する", async () => {
    let n = 0;
    const fetchImpl = (async () => (++n < 3 ? json({}, 429) : json({ items: [item] }))) as unknown as typeof fetch;
    const r = await searchRakuten(env, { keyword: "ドライヤー" }, { fetchImpl, sleep: noSleep });
    expect(n).toBe(3);
    expect(r).toHaveLength(1);
  });
  it("429が続けば rate_limited(キーはメッセージに含まない)", async () => {
    const fetchImpl = (async () => json({}, 429)) as unknown as typeof fetch;
    const e = await searchRakuten(env, { keyword: "ドライヤー" }, { fetchImpl, sleep: noSleep }).catch((x) => x);
    expect(e).toBeInstanceOf(RakutenApiError);
    expect(e.kind).toBe("rate_limited");
    expect(e.message).not.toContain("key-test");
  });
  it("404は空配列、403は forbidden", async () => {
    expect(await searchRakuten(env, { keyword: "ドライヤー" }, { fetchImpl: (async () => json({}, 404)) as unknown as typeof fetch, sleep: noSleep })).toEqual([]);
    await expect(
      searchRakuten(env, { keyword: "ドライヤー" }, { fetchImpl: (async () => json({}, 403)) as unknown as typeof fetch, sleep: noSleep })
    ).rejects.toMatchObject({ kind: "forbidden" });
  });
  it("キャッシュヒット時はAPIを呼ばず、キャッシュキーに認証情報を含まない", async () => {
    const store = new Map<string, never>();
    let calls = 0;
    const fetchImpl = (async () => (calls++, json({ items: [item] }))) as unknown as typeof fetch;
    const cache = {
      get: async (k: string) => store.get(k) as never,
      set: async (k: string, v: never) => void store.set(k, v),
    };
    await searchRakuten(env, { keyword: "ドライヤー" }, { fetchImpl, sleep: noSleep, cache });
    await searchRakuten(env, { keyword: "ドライヤー" }, { fetchImpl, sleep: noSleep, cache });
    expect(calls).toBe(1);
    expect([...store.keys()].join()).not.toContain("key-test");
  });
});

describe("Yahoo!との同一性判定", () => {
  const r = normalizeItem(item)!;
  it("JAN一致を最優先(confidence 1)", () => {
    const m = matchYahooRakuten([yahoo({ janCode: "4900000000001", name: "別名" })], [{ ...r, janCode: "4900000000001" }]);
    expect(m[0]).toMatchObject({ basis: "jan", confidence: 1 });
  });
  it("型番一致+価格近接は候補(0.7)、価格が大きく違えば別商品", () => {
    expect(matchYahooRakuten([yahoo({})], [r])[0]).toMatchObject({ basis: "model", confidence: 0.7 });
    expect(matchYahooRakuten([yahoo({ price: 30000 })], [r])).toEqual([]);
  });
  it("名前が似ているだけでは束ねない", () => {
    expect(matchYahooRakuten([yahoo({ name: "静音ドライヤー 大風量" })], [{ ...r, modelNumber: null }])).toEqual([]);
  });
});

describe("表示補助", () => {
  it("評価には出典を明記し、評価なしは表示しない", () => {
    expect(formatRakutenRating({ reviewAverage: 4.5, reviewCount: 12 })).toBe("楽天市場の評価 4.50(12件)");
    expect(formatRakutenRating({ reviewAverage: null, reviewCount: null })).toBeNull();
  });
  it("楽天ドメイン以外のURLは信頼しない", () => {
    expect(isTrustedRakutenUrl("https://item.rakuten.co.jp/a/b")).toBe(true);
    expect(isTrustedRakutenUrl("https://evil.example.com/rakuten.co.jp")).toBe(false);
    expect(isTrustedRakutenUrl("http://item.rakuten.co.jp/a")).toBe(false);
  });
  it("reviewIntel用listingは出典がrakutenのまま", () => {
    expect(rakutenToListing(normalizeItem(item)!, "2026-10-24T00:00:00Z")!.source).toBe("rakuten");
  });
});

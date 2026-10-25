import { describe, expect, it } from "vitest";
import { extractTvSpecs } from "../src/lib/commerce/tv/extractTvSpecs";
import {
  BUDGETS,
  dedupeProducts,
  emptyCriteria,
  filterProducts,
  recommend,
  sizeForDistance,
  type Answers,
  type TvProduct,
} from "../src/lib/commerce/tv/recommend";

let n = 0;
function tv(name: string, price: number, extra: Partial<TvProduct> = {}): TvProduct {
  n += 1;
  return {
    code: `c${n}`,
    name,
    image: "",
    brand: null,
    price,
    reviewRate: 4.2,
    reviewCount: 30,
    storeName: "店",
    storeIsBestSeller: false,
    productUrl: "https://store.shopping.yahoo.co.jp/x/y.html",
    tvSpecs: extractTvSpecs(name),
    ...extra,
  };
}

const base: Answers = { use: "all", budget: "50-100", size: "s50-55", brand: "any", features: [] };

const catalog = [
  tv("TCL 55V型 4K液晶テレビ 4Kチューナー内蔵 YouTube対応 55P69K", 69800),
  tv("ハイセンス 55V型 4K液晶テレビ 地上・BS・110度CSデジタル 55E6N 裏番組録画", 81000),
  tv("シャープ AQUOS 50V型 4K液晶テレビ 4Kチューナー内蔵 4T-C50DL1", 98000),
  tv("ソニー BRAVIA 55V型 有機ELテレビ 4Kチューナー内蔵 K-55XR80", 330000),
  tv("MAXZEN 32型 液晶テレビ フルハイビジョン 裏録画 J32CH06", 24980),
  tv("55型 チューナーレス スマートテレビ Google TV", 52000),
  tv("[展示品]REGZA 55M550R (55インチ) 配達エリアは近畿圏のみです", 60000),
  tv("液晶テレビ TVS REGZA 55Z770S", 90000),
];

describe("recommend", () => {
  it("予算・サイズの必須条件を満たす商品だけを推薦する", () => {
    const r = recommend(catalog, base);
    expect(r.picks.length).toBeGreaterThan(0);
    for (const p of r.picks) {
      expect(p.product.price).toBeGreaterThanOrEqual(BUDGETS["50-100"].min);
      expect(p.product.price).toBeLessThanOrEqual(100000);
      expect(p.product.tvSpecs.sizeV).not.toBeNull();
      expect(p.product.tvSpecs.sizeV as number).toBeGreaterThanOrEqual(50);
      expect(p.product.tvSpecs.sizeV as number).toBeLessThanOrEqual(60);
    }
  });

  it("サイズが商品名で確認できない商品は、サイズを指定した場合は推薦しない", () => {
    const r = recommend(catalog, base);
    expect(r.picks.some((p) => p.product.name.includes("55Z770S"))).toBe(false);
  });

  it("展示品・配送エリア限定の商品は推薦しない", () => {
    const r = recommend(catalog, base);
    expect(r.picks.some((p) => p.product.name.includes("展示品"))).toBe(false);
  });

  it("選んだ機能が確認できない商品は推薦しない", () => {
    const r = recommend(catalog, { ...base, features: ["bs4k"] });
    expect(r.picks.length).toBeGreaterThan(0);
    for (const p of r.picks) expect(p.product.tvSpecs.bs4k).toBe(true);
    const rec = recommend(catalog, { ...base, features: ["recording"] });
    for (const p of rec.picks) expect(p.product.tvSpecs.recording).toBeTruthy();
  });

  it("放送を使う用途ではチューナーレスを推薦しない", () => {
    const r = recommend(catalog, { ...base, use: "broadcast" });
    expect(r.picks.some((p) => p.product.tvSpecs.tunerless)).toBe(false);
  });

  it("同じ商品を重複して推薦しない", () => {
    const r = recommend(catalog, base);
    const codes = r.picks.map((p) => p.product.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(r.picks.length).toBeLessThanOrEqual(3);
  });

  it("条件を満たす商品が足りないときは、実際に満たす商品だけを返す", () => {
    const r = recommend(catalog, { ...base, features: ["recording"] });
    expect(r.picks.length).toBeLessThan(3);
    expect(r.picks.length).toBe(r.eligibleCount);
  });

  it("0件のときは緩和の選択肢を件数つきで返し、条件は自動では緩めない", () => {
    const a: Answers = { ...base, budget: "u30", size: "s65" };
    const r = recommend(catalog, a);
    expect(r.picks).toEqual([]);
    expect(r.relaxations.length).toBeGreaterThan(0);
    for (const x of r.relaxations) {
      expect(x.count).toBeGreaterThan(0);
      expect(recommend(catalog, x.answers).picks.length).toBeGreaterThan(0);
    }
  });

  it("推薦理由は確認できた仕様から作り、未確認の仕様は注意に出す", () => {
    const r = recommend(catalog, base);
    for (const p of r.picks) {
      expect(p.reasons.length).toBeGreaterThan(0);
      expect(p.cautions.some((c) => c.includes("商品ページで確認"))).toBe(true);
    }
    const tcl = r.picks.find((p) => p.product.name.startsWith("TCL"));
    if (tcl) expect(tcl.cautions.some((c) => c.includes("録画機能") && c.includes("未確認"))).toBe(true);
  });

  it("価格重視は、推薦した商品の中で最も安い", () => {
    const r = recommend(catalog, { ...base, budget: "50-100", size: "unknown" });
    const value = r.picks.find((p) => p.type === "value");
    expect(value).toBeDefined();
    for (const p of r.picks) expect(value!.product.price).toBeLessThanOrEqual(p.product.price);
  });

  it("ブランド希望は必須条件にしない(候補の数は変わらない)", () => {
    const dom = recommend(catalog, { ...base, brand: "domestic" });
    const any = recommend(catalog, { ...base, brand: "any" });
    expect(dom.eligibleCount).toBe(any.eligibleCount);
  });
});

describe("dedupeProducts", () => {
  it("同じ型番・サイズの商品は最も安い販売店を残す", () => {
    const a = tv("TCL 55V型 4K液晶テレビ 55P69K", 70000);
    const b = tv("TCL 55V型 4K液晶テレビ 55P69K 新品", 65000);
    expect(dedupeProducts([a, b]).map((p) => p.code)).toEqual([b.code]);
  });
});

describe("filterProducts", () => {
  it("未確認の仕様は、その条件を選んだ検索の結果に含めない", () => {
    const c = { ...emptyCriteria(), bs4k: true };
    const r = filterProducts(catalog, c);
    expect(r.length).toBeGreaterThan(0);
    for (const p of r) expect(p.tvSpecs.bs4k).toBe(true);
  });
  it("条件なしなら全商品を返す", () => {
    expect(filterProducts(catalog, emptyCriteria()).length).toBe(catalog.length);
  });
  it("メーカーと価格帯で絞り込める", () => {
    const r = filterProducts(catalog, { ...emptyCriteria(), makers: ["TCL"], budgets: ["50-100"] });
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((p) => p.tvSpecs.maker === "TCL")).toBe(true);
  });
});

describe("sizeForDistance", () => {
  it("65型4Kの目安(約1.2m)と整合する", () => {
    expect(sizeForDistance(1.21, "4K")).toBeGreaterThanOrEqual(64);
    expect(sizeForDistance(1.21, "4K")).toBeLessThanOrEqual(66);
  });
});

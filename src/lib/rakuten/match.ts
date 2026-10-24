import type { RankableProduct } from "../commerce/types";
import type { ProductListing } from "../reviewIntel/types";
import { extractModelNumber } from "./client";
import type { RakutenProduct } from "./types";

// Yahoo!商品と楽天商品の同一性判定。JANコード > 型番 の順。商品名の類似だけでは束ねない。
// 楽天APIのドキュメントにはJANの出力項目が無く、通常はjanCodeがnullになる。その場合は型番一致
// (商品名から1つだけ確実に取れた型番同士)かつ価格が近い場合のみ「候補(0.7)」として扱う。

export type MatchBasis = "jan" | "model";

export interface CrossMatch {
  yahooCode: string;
  rakutenItemCode: string;
  basis: MatchBasis;
  /** jan=1.0 / model=0.7(候補。ランキングや「同一商品」表示の根拠にはしない) */
  confidence: number;
}

const norm = (s: string) => s.normalize("NFKC").toLowerCase().replace(/[\s_-]/g, "");

export function matchYahooRakuten(yahoo: RankableProduct[], rakuten: RakutenProduct[]): CrossMatch[] {
  const out: CrossMatch[] = [];
  for (const r of rakuten) {
    const byJan = r.janCode ? yahoo.find((y) => y.janCode === r.janCode) : undefined;
    if (byJan) {
      out.push({ yahooCode: byJan.code, rakutenItemCode: r.itemCode, basis: "jan", confidence: 1 });
      continue;
    }
    if (!r.modelNumber) continue;
    const rm = norm(r.modelNumber);
    const hit = yahoo.find((y) => {
      const ym = extractModelNumber(y.name);
      if (!ym || norm(ym) !== rm) return false;
      // 型番が同じでも容量違い・セット品等で価格が大きく異なれば別商品の可能性が高い
      return r.price === null || y.price <= 0 || Math.abs(r.price - y.price) / y.price <= 0.4;
    });
    if (hit) out.push({ yahooCode: hit.code, rakutenItemCode: r.itemCode, basis: "model", confidence: 0.7 });
  }
  return out;
}

/** reviewIntel の同一商品判定・ランキングへ渡すための変換(出典は混ぜない) */
export function rakutenToListing(r: RakutenProduct, fetchedAt: string): ProductListing | null {
  if (!r.itemUrl) return null;
  return {
    source: "rakuten",
    listingId: r.itemCode,
    url: r.itemUrl,
    name: r.name,
    janCode: r.janCode,
    maker: null,
    brand: null,
    modelNumber: r.modelNumber,
    variantAttrs: {},
    price: r.price,
    imageUrl: r.imageUrl,
    storeName: r.shopName,
    deliveryDay: null,
    aggregateReview: r.reviewAverage !== null && r.reviewCount !== null ? { rate: r.reviewAverage, count: r.reviewCount } : null,
    specs: {},
    fetchedAt,
  };
}

/** 楽天の評価表示文。出典を必ず明記する。評価が無ければ null(表示しない) */
export function formatRakutenRating(r: Pick<RakutenProduct, "reviewAverage" | "reviewCount">): string | null {
  if (r.reviewAverage === null || r.reviewCount === null) return null;
  return `楽天市場の評価 ${r.reviewAverage.toFixed(2)}(${r.reviewCount}件)`;
}

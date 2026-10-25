import type { ProductListing } from "../reviewIntel/types";
import type { RankableProduct } from "./types";

/**
 * Yahoo!ショッピング商品(RankableProduct)を、楽天(src/lib/rakuten/match.ts の rakutenToListing)と
 * 共通の ProductListing へ変換する。reviewIntel の同一商品判定・ランキングへ渡すための変換で、
 * 既存のcommerceランキング(ranking.ts)には影響しない。報酬率(affiliateRate)は意図的に引き継がない。
 * レビュー件数0は「評価なし(null)」とし、0点として扱わない。
 */
export function yahooToListing(p: RankableProduct, fetchedAt: string): ProductListing {
  const hasReview = p.reviewCount > 0 && p.reviewRate > 0;
  return {
    source: "yahoo",
    listingId: p.code,
    url: p.url,
    name: p.name,
    janCode: p.janCode,
    maker: null,
    brand: p.brand,
    modelNumber: null,
    variantAttrs: {},
    price: p.price > 0 ? p.price : null,
    imageUrl: p.image || null,
    storeName: p.storeName || null,
    deliveryDay: p.deliveryDay,
    aggregateReview: hasReview ? { rate: p.reviewRate, count: p.reviewCount } : null,
    specs: {},
    fetchedAt,
  };
}

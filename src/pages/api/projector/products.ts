import type { APIRoute } from "astro";
import { projectorConfig } from "../../../lib/commerce/categories/projector.config";
import { isValidPrefectureCode } from "../../../lib/commerce/prefectures";
import { searchProducts } from "../../../lib/commerce/yahooShoppingClient";
import { filterRelevantProducts } from "../../../lib/commerce/productFilter";
import { scoreProduct } from "../../../lib/commerce/ranking";
import { buildAffiliateUrl } from "../../../lib/commerce/affiliate";
import type { SortKey } from "../../../lib/commerce/types";

// projector専用の商品ランキングAPI。ユーザー入力を検索クエリへ直接渡さない
// (検索語はprojector.config.tsのsearchQueriesに固定)。受け付けるパラメータのみ厳格に検証する。
export const prerender = false;

const MAX_PRICE = 5_000_000;
const CACHE_TTL_SECONDS = 900; // 15分

function validateArea(value: string | null): string | undefined {
  if (!value) return undefined;
  if (!isValidPrefectureCode(value)) return undefined;
  return value;
}

function validateDelivery(value: string | null): number | undefined {
  if (value === null) return undefined;
  const n = Number(value);
  // day=0(当日到着)は現実的に成立しづらいため受け付けない。1(明日まで)・2(翌々日まで)のみ有効。
  if (!Number.isInteger(n) || n < 1 || n > 2) return undefined;
  return n;
}

function validatePrice(value: string | null): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > MAX_PRICE) return undefined;
  return n;
}

function validateReview(value: string | null): number {
  if (!value) return 0;
  const n = Number(value);
  const allowed = projectorConfig.reviewThresholds.map((t) => t.min);
  return allowed.includes(n) ? n : 0;
}

function validateSort(value: string | null): SortKey {
  const allowed = projectorConfig.sortOptions.map((s) => s.key);
  if (value && (allowed as string[]).includes(value)) return value as SortKey;
  return "recommended";
}

export const GET: APIRoute = async (context) => {
  const { request } = context;
  const url = new URL(request.url);
  const params = url.searchParams;

  const area = validateArea(params.get("area"));
  const delivery = validateDelivery(params.get("delivery"));
  const priceMin = validatePrice(params.get("priceMin"));
  const priceMax = validatePrice(params.get("priceMax"));
  const reviewMin = validateReview(params.get("review"));
  const sort = validateSort(params.get("sort"));

  const cacheKeyUrl = new URL(request.url);
  cacheKeyUrl.search = new URLSearchParams({
    area: area ?? "",
    delivery: delivery !== undefined ? String(delivery) : "",
    priceMin: priceMin !== undefined ? String(priceMin) : "",
    priceMax: priceMax !== undefined ? String(priceMax) : "",
    review: String(reviewMin),
    sort,
  }).toString();
  const cacheKey = new Request(cacheKeyUrl.toString());

  const cache = typeof caches !== "undefined" ? (caches as unknown as { default: Cache }).default : undefined;
  if (cache) {
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
  }

  // @astrojs/cloudflare は on-demand ルートで Astro.locals.runtime.env にCloudflareの
  // env(vars/secrets)を注入する。ローカル開発では .dev.vars から platformProxy 経由で入る。
  const runtimeEnv = (context.locals as { runtime?: { env?: Record<string, string> } }).runtime?.env ?? {};
  const appId = runtimeEnv.YAHOO_APP_ID;
  const affiliateId = runtimeEnv.VALUECOMMERCE_AFFILIATE_ID;

  if (!appId) {
    return new Response(
      JSON.stringify({ products: [], error: "YAHOO_APP_ID が設定されていません" }),
      { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }

  let response: Response;
  try {
    const rawProducts = await searchProducts({
      appId,
      queries: projectorConfig.searchQueries,
      area,
      deliveryDay: delivery,
    });

    const filtered = filterRelevantProducts(
      rawProducts,
      projectorConfig.requiredKeywords,
      projectorConfig.excludeKeywords
    ).filter((p) => {
      if (reviewMin > 0 && p.reviewRate < reviewMin) return false;
      if (priceMin !== undefined && p.price < priceMin) return false;
      if (priceMax !== undefined && p.price > priceMax) return false;
      return true;
    });

    const scored = filtered.map((p) =>
      scoreProduct(
        p,
        projectorConfig.weights,
        projectorConfig.revenueScoreReferenceMax,
        buildAffiliateUrl(affiliateId, p.url),
        { min: priceMin, max: priceMax }
      )
    );

    const sorted = sortProducts(scored, sort).slice(0, 50);

    response = new Response(
      JSON.stringify({
        products: sorted.map((p) => ({
          code: p.code,
          name: p.name,
          image: p.image,
          price: p.price,
          reviewRate: p.reviewRate,
          reviewCount: p.reviewCount,
          storeName: p.storeName,
          storeIsBestSeller: p.storeIsBestSeller,
          deliveryDay: p.deliveryDay,
          affiliateUrl: p.affiliateUrl,
        })),
        count: sorted.length,
        generatedAt: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": `public, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=3600`,
        },
      }
    );
  } catch {
    return new Response(
      JSON.stringify({ products: [], error: "現在商品情報を取得できません。時間をおいて再度お試しください。" }),
      { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }

  if (cache) {
    context.locals.runtime?.ctx?.waitUntil?.(cache.put(cacheKey, response.clone()));
  }
  return response;
};

function sortProducts<T extends { totalScore: number; reviewCount: number; price: number; estimatedCommission: number }>(
  products: T[],
  sort: SortKey
): T[] {
  const copy = [...products];
  switch (sort) {
    case "trust":
      return copy.sort((a, b) => b.reviewCount - a.reviewCount || b.totalScore - a.totalScore);
    case "revenue":
      return copy.sort((a, b) => b.estimatedCommission - a.estimatedCommission);
    case "reviewCount":
      return copy.sort((a, b) => b.reviewCount - a.reviewCount);
    case "priceAsc":
      return copy.sort((a, b) => a.price - b.price);
    case "recommended":
    default:
      return copy.sort((a, b) => b.totalScore - a.totalScore);
  }
}

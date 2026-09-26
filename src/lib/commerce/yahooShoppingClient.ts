import type { RankableProduct } from "./types";
import { dedupeByCode, isTrustedYahooUrl } from "./productFilter";

// Yahoo!ショッピング 商品検索API v3のサーバー専用クライアント。
// ブラウザからは絶対に呼ばない(APIキーはサーバー側の環境変数からのみ渡す)。
// カテゴリー非依存(検索クエリ・除外条件は呼び出し側のconfigから渡す)。

const ENDPOINT = "https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch";

export interface YahooSearchParams {
  appId: string;
  queries: string[];
  area?: string; // JIS都道府県コード
  deliveryDay?: number; // 0,1,2。指定時は 0..deliveryDay を統合して取得する
  affiliateType?: "vc";
  affiliateId?: string;
}

interface YahooHit {
  code?: string;
  janCode?: string;
  name?: string;
  headLine?: string;
  description?: string;
  url?: string;
  image?: { medium?: string; small?: string };
  price?: number;
  review?: { rate?: number; count?: number };
  seller?: {
    name?: string;
    isBestSeller?: boolean;
    review?: { rate?: number; count?: number };
  };
  affiliateRate?: number;
  delivery?: { area?: string; deadLine?: string; day?: number };
}

interface YahooSearchResponse {
  hits?: YahooHit[];
}

function buildUrl(params: {
  appId: string;
  query: string;
  area?: string;
  deliveryDay?: number;
  affiliateType?: "vc";
  affiliateId?: string;
}): string {
  const url = new URL(ENDPOINT);
  url.searchParams.set("appid", params.appId);
  url.searchParams.set("query", params.query);
  url.searchParams.set("in_stock", "true");
  url.searchParams.set("condition", "new");
  url.searchParams.set("image_size", "300");
  url.searchParams.set("results", "50");
  if (params.area) {
    url.searchParams.set("delivery_area", params.area);
    if (params.deliveryDay !== undefined) {
      url.searchParams.set("delivery_day", String(params.deliveryDay));
      url.searchParams.set("delivery_deadline", "99");
    }
  }
  if (params.affiliateType && params.affiliateId) {
    url.searchParams.set("affiliate_type", params.affiliateType);
    url.searchParams.set("affiliate_id", params.affiliateId);
  }
  return url.toString();
}

function normalizeHit(hit: YahooHit): RankableProduct | null {
  if (!hit.code || !hit.name || !hit.url) return null;
  if (!isTrustedYahooUrl(hit.url)) return null;
  return {
    code: hit.code,
    janCode: hit.janCode && hit.janCode.trim() !== "" ? hit.janCode : null,
    name: hit.name,
    descriptionText: `${hit.headLine ?? ""} ${hit.description ?? ""}`,
    url: hit.url,
    image: hit.image?.medium ?? hit.image?.small ?? "",
    price: hit.price ?? 0,
    reviewRate: hit.review?.rate ?? 0,
    reviewCount: hit.review?.count ?? 0,
    storeName: hit.seller?.name ?? "",
    storeIsBestSeller: hit.seller?.isBestSeller ?? false,
    storeReviewRate: hit.seller?.review?.rate ?? 0,
    storeReviewCount: hit.seller?.review?.count ?? 0,
    affiliateRate: hit.affiliateRate ?? 0,
    deliveryDay: typeof hit.delivery?.day === "number" ? hit.delivery.day : null,
  };
}

/**
 * 複数クエリ(・複数配送日条件)から候補プールを取得し、重複除去して返す。
 * 1クエリでも失敗した場合はそのクエリ分だけ諦め、他の結果で継続する(全滅時のみ例外を投げる)。
 */
export async function searchProducts(params: YahooSearchParams): Promise<RankableProduct[]> {
  // day=0(当日)は現実的に成立しづらいため問い合わせ対象に含めない。1(明日)〜deliveryDayを取得する。
  const dayValues =
    params.area && params.deliveryDay !== undefined
      ? Array.from({ length: params.deliveryDay }, (_, i) => i + 1)
      : [undefined];

  const requests: Promise<{ ok: boolean; items: RankableProduct[] }>[] = [];
  for (const query of params.queries) {
    for (const day of dayValues) {
      const url = buildUrl({
        appId: params.appId,
        query,
        area: params.area,
        deliveryDay: day,
        affiliateType: params.affiliateType,
        affiliateId: params.affiliateId,
      });
      requests.push(
        fetch(url)
          .then(async (res) => {
            if (!res.ok) return { ok: false, items: [] };
            const data = (await res.json()) as YahooSearchResponse;
            const items = (data.hits ?? [])
              .map(normalizeHit)
              .filter((p): p is RankableProduct => p !== null);
            return { ok: true, items };
          })
          .catch(() => ({ ok: false, items: [] }))
      );
    }
  }

  const results = await Promise.all(requests);
  const anySucceeded = results.some((r) => r.ok);
  if (!anySucceeded && requests.length > 0) {
    // 全リクエストが失敗した場合のみエラーとして扱う(0件ヒットは正常系として区別する)
    throw new Error("Yahoo!ショッピングAPIから商品を取得できませんでした");
  }
  const merged = results.flatMap((r) => r.items);
  return dedupeByCode(merged);
}

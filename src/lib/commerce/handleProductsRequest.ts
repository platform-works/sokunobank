import type { APIContext } from "astro";
import { isValidPrefectureCode } from "./prefectures";
import { searchProducts } from "./yahooShoppingClient";
import { filterRelevantProducts, dedupeByJan, dedupeByExactName } from "./productFilter";
import { scoreProduct } from "./ranking";
import { buildAffiliateUrl } from "./affiliate";
import type { CommerceCategoryConfig, ScoredProduct, SortKey } from "./types";

// 「Yahoo!ショッピング商品ランキング型」カテゴリー共通のAPIハンドラー。
// カテゴリーごとにコピーしない — src/pages/api/[slug]/products.ts (動的ルート)から
// レジストリで解決した設定を渡して呼ばれる。ユーザー入力を検索クエリへ直接渡さない
// (検索語は各カテゴリーのconfig.searchQueriesに固定)。受け付けるパラメータのみ厳格に検証する。

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

function validateSort(config: CommerceCategoryConfig, value: string | null): SortKey {
  const allowed = config.sortOptions.map((s) => s.key);
  if (value && (allowed as string[]).includes(value)) return value as SortKey;
  return "recommended";
}

function sortProducts<T extends { totalScore: number; reviewCount: number; price: number; estimatedCommission: number }>(
  products: T[],
  sort: SortKey
): T[] {
  const copy = [...products];
  switch (sort) {
    case "trust":
      return copy.sort((a, b) => b.reviewCount - a.reviewCount || b.totalScore - a.totalScore);
    case "reviewCount":
      return copy.sort((a, b) => b.reviewCount - a.reviewCount);
    case "priceAsc":
      return copy.sort((a, b) => a.price - b.price);
    case "recommended":
    default:
      return copy.sort((a, b) => b.totalScore - a.totalScore);
  }
}

export async function handleProductsRequest(config: CommerceCategoryConfig, context: APIContext): Promise<Response> {
  const { request } = context;
  const url = new URL(request.url);
  const params = url.searchParams;

  const area = validateArea(params.get("area"));
  const delivery = validateDelivery(params.get("delivery"));
  const sort = validateSort(config, params.get("sort"));

  // お届け先(都道府県)が分かっているのに到着希望が未指定だと、Yahoo APIは配送日情報
  // (delivery.day)自体を返さない(delivery_area/delivery_day/delivery_deadlineの3つが
  // 揃って初めて配送日が判定されるため)。その結果「配送日は商品ページでご確認ください」
  // ばかりが表示されてしまうため、お届け先が分かる場合は到着希望が未指定でも
  // 翌々日まで(2)を指定し、配送日を必ず判定させる(表示件数を絞り込む用途ではなく、
  // 配送日情報を取得するために指定している)。
  const effectiveDeliveryDay = area ? delivery ?? 2 : undefined;

  // キャッシュキーは area+delivery のみ(sortを含めない)。sortはYahoo APIへの問い合わせ内容に
  // 一切影響せず、検索・フィルタ・スコアリング・重複除去まで終わった候補一覧を並べ替えるだけの
  // 処理のため、ここに保存するのは「重複除去済みだが並び替え前」の候補一覧にする。こうすることで
  // 並び順が違うだけの再訪問(このサイトで最も起きやすいキャッシュミスパターン)がYahoo APIの
  // 再呼び出しを発生させなくなる(2026-09-26、Yahoo側のレート制限(1分30リクエスト/アプリID)を
  // 踏まえてsortをキーから外し、最大4倍(sortOptionsの数)あった無駄な呼び出しを解消した)。
  const candidatesCacheKeyUrl = new URL(request.url);
  candidatesCacheKeyUrl.search = new URLSearchParams({
    area: area ?? "",
    delivery: effectiveDeliveryDay !== undefined ? String(effectiveDeliveryDay) : "",
  }).toString();
  const candidatesCacheKey = new Request(candidatesCacheKeyUrl.toString());

  const cache = typeof caches !== "undefined" ? (caches as unknown as { default: Cache }).default : undefined;

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

  let deduped: ScoredProduct[];
  try {
    const cached = cache ? await cache.match(candidatesCacheKey) : undefined;
    if (cached) {
      deduped = await cached.json();
    } else {
      const rawProducts = await searchProducts({
        appId,
        queries: config.searchQueries,
        area,
        deliveryDay: effectiveDeliveryDay,
      });

      const filtered = filterRelevantProducts(
        rawProducts,
        config.requiredKeywords,
        config.excludeKeywords,
        config.longLeadTimeExcludeKeywords
      );

      const scored = filtered.map((p) =>
        scoreProduct(p, config.weights, config.revenueScoreReferenceMax, buildAffiliateUrl(affiliateId, p.url))
      );

      // 同一JAN(同一商品の複数ストア出品)の中に配送日が確定している出品と未確定の出品が
      // 混在する場合、未確定の方が先に残ってしまわないよう、重複除去の前に
      // 「配送日確定 > totalScoreが高い」の優先順で並べ替えてから重複除去する。
      // (これをせずユーザーが選んだ並び順(価格順等)のままdedupeすると、価格が安いだけで
      // 配送日不明の出品が優先的に残ってしまうことがあった)
      // JANが取得できない商品は商品名の完全一致で補完的に重複除去する。
      // 重複除去した後に、あらためてユーザーが選んだ並び順で最終的な表示順を決める(下記)。
      const dedupPriority = [...scored].sort((a, b) => {
        const aKnown = a.deliveryDay !== null ? 1 : 0;
        const bKnown = b.deliveryDay !== null ? 1 : 0;
        if (aKnown !== bKnown) return bKnown - aKnown;
        return b.totalScore - a.totalScore;
      });
      deduped = dedupeByExactName(dedupeByJan(dedupPriority));

      if (cache) {
        const candidatesResponse = new Response(JSON.stringify(deduped), {
          headers: { "Cache-Control": `public, s-maxage=${CACHE_TTL_SECONDS}` },
        });
        context.locals.runtime?.ctx?.waitUntil?.(cache.put(candidatesCacheKey, candidatesResponse));
      }
    }
  } catch {
    return new Response(
      JSON.stringify({ products: [], error: "現在商品情報を取得できません。時間をおいて再度お試しください。" }),
      { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }

  const sorted = sortProducts(deduped, sort).slice(0, 50);
  return new Response(
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
}

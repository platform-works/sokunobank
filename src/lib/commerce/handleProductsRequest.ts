import type { APIContext } from "astro";
import { isValidPrefectureCode } from "./prefectures";
import { fetchCandidates } from "./fetchCandidates";
import { scoreProduct } from "./ranking";
import type { CommerceCategoryConfig, ScoredProduct, SortKey } from "./types";
import { buildReviewSignals, fetchRakutenPool } from "../rakuten/signal";
import { descriptionExcerpt } from "./descriptionExcerpt";
import { mergeBrandExtras, prioritizeBrand } from "./brandPool";

function descriptionField(raw: string): { description?: string } {
  const d = descriptionExcerpt(raw);
  return d ? { description: d } : {};
}
import type { RakutenEnv } from "../rakuten/client";
import type { RakutenProduct } from "../rakuten/types";

// 楽天の照合用商品群のキャッシュ保持期間(6時間)。レビュー件数順の売れ筋は短時間では変わらない
const RAKUTEN_POOL_TTL_SECONDS = 21600;

/**
 * ブランド指定時の追加候補(brandPool.ts)。ブランドごとに30分キャッシュする(失敗しても呼び出し側が共通の商品群だけで続行する)。
 * 楽天の評価との照合は、共通の商品群と同じ方法で行う。
 */
async function getBrandExtras(
  config: CommerceCategoryConfig,
  brandId: string,
  appId: string,
  env: Record<string, string>,
  cache: Cache | undefined,
  waitUntil: ((p: Promise<unknown>) => void) | undefined
): Promise<ScoredProduct[]> {
  const bs = config.brandSearch?.[brandId];
  if (!bs) return [];
  const key = new Request(
    `https://cache.sokunobank.invalid/brand-extra/${config.slug}/${brandId}?v=${CACHE_SCHEMA_VERSION}${config.rakutenSignal ? "-r1" : ""}`
  );
  const hit = cache ? await cache.match(key) : undefined;
  if (hit) return (await hit.json()) as ScoredProduct[];
  const { candidates } = await fetchCandidates({
    appId,
    queries: bs.queries,
    requiredKeywords: config.requiredKeywords,
    excludeKeywords: config.excludeKeywords,
    longLeadTimeExcludeKeywords: config.longLeadTimeExcludeKeywords,
    minEstimatedCommission: config.minEstimatedCommission,
    targetCount: bs.targetCount ?? 100,
    maxPagesPerQuery: config.maxPagesPerQuery ?? MAX_PAGES_PER_QUERY,
  });
  let scored = candidates.map((p) => scoreProduct(p, config.weights, config.revenueScoreReferenceMax));
  if (config.rakutenSignal) {
    try {
      const signals = buildReviewSignals(scored, await getRakutenPool(config, env, cache));
      scored = scored.map((p) => {
        const s = signals.get(p.code);
        return s ? { ...p, reviewSignal: s.score } : p;
      });
    } catch {
      // 楽天側の失敗は表示に影響させない
    }
  }
  if (cache) {
    const put = cache.put(
      key,
      new Response(JSON.stringify(scored), { headers: { "Cache-Control": `public, s-maxage=${CACHE_TTL_SECONDS}` } })
    );
    if (waitUntil) waitUntil(put);
    else await put;
  }
  return scored;
}

async function getRakutenPool(
  config: CommerceCategoryConfig,
  env: RakutenEnv,
  cache: Cache | undefined
): Promise<RakutenProduct[]> {
  if (!config.rakutenSignal || !env.RAKUTEN_APPLICATION_ID || !env.RAKUTEN_ACCESS_KEY) return [];
  // 認証情報を含まない合成URLをキーにする
  const key = new Request(`https://cache.sokunobank.invalid/rakuten-pool/${config.slug}?v=1`);
  const hit = cache ? await cache.match(key) : undefined;
  if (hit) return (await hit.json()) as RakutenProduct[];
  const pool = await fetchRakutenPool(env, config.rakutenSignal.keywords, config.rakutenSignal.pagesPerKeyword);
  if (cache && pool.length > 0) {
    await cache.put(
      key,
      new Response(JSON.stringify(pool), { headers: { "Cache-Control": `public, s-maxage=${RAKUTEN_POOL_TTL_SECONDS}` } })
    );
  }
  return pool;
}

// 「Yahoo!ショッピング商品ランキング型」カテゴリー共通のAPIハンドラー。
// カテゴリーごとにコピーしない — src/pages/api/[slug]/products.ts (動的ルート)から
// レジストリで解決した設定を渡して呼ばれる。ユーザー入力を検索クエリへ直接渡さない
// (検索語は各カテゴリーのconfig.searchQueriesに固定)。受け付けるパラメータのみ厳格に検証する。

// 2026-09-26: Yahoo!ショッピングAPIのレート制限(1分間30リクエスト/アプリID)を踏まえ、
// トラフィック増加時にも余裕を持たせるため15分から30分に延長した。表示データが多少古くなる
// (最大30分)トレードオフはあるが、「在庫・配送予定は変動します」の注意書きで既に許容範囲。
const CACHE_TTL_SECONDS = 1800; // 30分
// Yahoo API呼び出し自体が失敗した場合(レート制限超過・障害等)に、期限切れでも直前の
// 正常な結果を出し続けるためのフォールバック用キャッシュの保持期間。通常のCACHE_TTL_SECONDS
// より大幅に長く保持し、「エラーで空表示」より「多少古いが商品が表示される」を優先する。
const FALLBACK_CACHE_TTL_SECONDS = 86400; // 24時間
// 2026-09-27: 候補集めの目標件数とページ上限(ユーザー指示による再設計)。
// 要件(requiredKeywords/excludeKeywords/longLeadTime/報酬額500円)を満たす商品が
// この件数に達するまでYahoo APIのページを追加取得する。1クエリあたりの上限ページ数を
// 設けてレート制限(1分30リクエスト)を超えないようにする。
const CANDIDATES_TARGET_COUNT = 100;
const DEFAULT_MAX_DISPLAY_COUNT = 50;
const MAX_PAGES_PER_QUERY = 3;
// キャッシュに保存するScoredProductの「形」を変えるコード変更(フィールドの追加・削除・改名等)を
// するたびにこの値を上げること。2026-09-27、affiliateUrl→productUrlへのフィールド改名時に、
// デプロイ直前にキャッシュされた旧い形のデータがそのまま再利用され、productUrlがundefinedに
// なる(＝商品リンクが壊れる)不具合が判明したため導入した。キャッシュキーに含めることで、
// 形が変わった直後は必ずキャッシュミスとして扱われ、新しい形で再取得される。
const CACHE_SCHEMA_VERSION = 2;

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

function sortProducts<
  T extends { totalScore: number; reviewCount: number; price: number; estimatedCommission: number; deliveryDay: number | null },
>(
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
    case "deliveryAsc":
      // 2026-09-30追加(発電機カテゴリー)。配送日が判定できた商品(明日=1→翌々日=2)を先に、
      // 判定できなかった商品(null)は後ろに置く。同順位内は総合スコア順。
      return copy.sort((a, b) => (a.deliveryDay ?? 99) - (b.deliveryDay ?? 99) || b.totalScore - a.totalScore);
    case "recommended":
    default:
      return copy.sort((a, b) => b.totalScore - a.totalScore);
  }
}

export async function handleProductsRequest(config: CommerceCategoryConfig, context: APIContext): Promise<Response> {
  const { request } = context;
  const url = new URL(request.url);
  const params = url.searchParams;

  const area = config.ignoreDeliveryArea ? undefined : validateArea(params.get("area"));
  const delivery = config.ignoreDeliveryArea ? undefined : validateDelivery(params.get("delivery"));
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
    // 候補件数を個別に設定したカテゴリーだけキャッシュを分離する(他カテゴリーのキャッシュは無効化しない)
    v: String(CACHE_SCHEMA_VERSION) + (config.candidatesTargetCount ? `-t${config.candidatesTargetCount}` : "") + (config.maxPagesPerQuery ? `-p${config.maxPagesPerQuery}` : "") + (config.rakutenSignal ? "-r1" : ""),
  }).toString();
  const candidatesCacheKey = new Request(candidatesCacheKeyUrl.toString());
  // 通常キャッシュと同じ内容を、Yahoo API障害時のフォールバック専用として長期保持する別キー
  // (URLを変えてcandidatesCacheKeyとは別エントリにする。フォールバックは明示的に読みに行った
  // 時だけ使い、通常経路では絶対に参照しない)。
  const fallbackCacheKeyUrl = new URL(candidatesCacheKeyUrl);
  fallbackCacheKeyUrl.searchParams.set("fallback", "1");
  const fallbackCacheKey = new Request(fallbackCacheKeyUrl.toString());

  const cache = typeof caches !== "undefined" ? (caches as unknown as { default: Cache }).default : undefined;

  // @astrojs/cloudflare は on-demand ルートで Astro.locals.runtime.env にCloudflareの
  // env(vars/secrets)を注入する。ローカル開発では .dev.vars から platformProxy 経由で入る。
  const runtimeEnv = (context.locals as { runtime?: { env?: Record<string, string> } }).runtime?.env ?? {};
  const appId = runtimeEnv.YAHOO_APP_ID;

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
      // 2026-09-27改訂(ユーザー指示): 候補が目標件数(100件)に達するまでYahoo APIの
      // ページを追加取得してから、要件フィルタ→報酬額足切り→重複除去の順に適用する方式に変更。
      // 「先頭◯件を取得してから500円未満を足切りする」と、母数不足でそのまま件数が
      // 目減りしてしまうため、fetchCandidates内部で「足切り後100件に達するまでページを進める」
      // ロジックを持たせている。ここでの並び順はYahoo APIの返却順のままで、
      // estimatedCommissionによる並べ替えは行わない(最終的な表示順は下記sortProductsで決める)。
      const { candidates } = await fetchCandidates({
        appId,
        queries: config.searchQueries,
        area,
        deliveryDay: effectiveDeliveryDay,
        requiredKeywords: config.requiredKeywords,
        excludeKeywords: config.excludeKeywords,
        longLeadTimeExcludeKeywords: config.longLeadTimeExcludeKeywords,
        minEstimatedCommission: config.minEstimatedCommission,
        targetCount: config.candidatesTargetCount ?? CANDIDATES_TARGET_COUNT,
        maxPagesPerQuery: config.maxPagesPerQuery ?? MAX_PAGES_PER_QUERY,
      });

      // 2026-09-27導入(ValueCommerce LinkSwitch): 以前はここでbuildAffiliateUrl()により
      // Yahoo!ショッピングの商品URLをValueCommerceの遷移URLへサーバー側で事前変換していたが、
      // LinkSwitch導入に伴いこの変換をやめた。scoreProduct()はYahoo!ショッピングの元URLを
      // そのままScoredProduct.productUrlに設定する。アフィリエイトリンクへの変換はLinkSwitchが
      // ブラウザ側で行うため、DB・JSON・キャッシュに保存するURLも常に元URLのままにする
      // (LinkSwitch変換後のURLを保存・キャッシュしないことが重要)。
      deduped = candidates.map((p) => scoreProduct(p, config.weights, config.revenueScoreReferenceMax));

      // 楽天のレビューを裏側の順位付けに使う設定のカテゴリーだけ(2026-10-24導入)。失敗してもYahoo!の
      // 表示は維持する(例外は握りつぶし、reviewSignalが付かないだけにする)。楽天の商品群は別キャッシュで
      // 6時間保持し、お届け先ごとのキャッシュミスのたびに楽天APIを呼ばないようにする。
      if (config.rakutenSignal) {
        try {
          const pool = await getRakutenPool(config, runtimeEnv, cache);
          const signals = buildReviewSignals(deduped, pool);
          deduped = deduped.map((p) => {
            const s = signals.get(p.code);
            return s ? { ...p, reviewSignal: s.score } : p;
          });
        } catch {
          // 楽天側の失敗はYahoo!の表示に影響させない
        }
      }

      if (cache) {
        const candidatesResponse = new Response(JSON.stringify(deduped), {
          headers: { "Cache-Control": `public, s-maxage=${CACHE_TTL_SECONDS}` },
        });
        context.locals.runtime?.ctx?.waitUntil?.(cache.put(candidatesCacheKey, candidatesResponse));
        const fallbackResponse = new Response(JSON.stringify(deduped), {
          headers: { "Cache-Control": `public, s-maxage=${FALLBACK_CACHE_TTL_SECONDS}` },
        });
        context.locals.runtime?.ctx?.waitUntil?.(cache.put(fallbackCacheKey, fallbackResponse));
      }
    }
  } catch {
    // Yahoo APIの呼び出し自体が失敗した(レート制限超過・障害等)場合、空のエラー表示にする前に
    // フォールバック用キャッシュ(最大24時間前の正常な結果)が無いか確認する。多少古くても
    // 商品が表示される方が、空表示より利用者にとって有用なため。
    const fallback = cache ? await cache.match(fallbackCacheKey) : undefined;
    if (fallback) {
      deduped = await fallback.json();
    } else {
      return new Response(
        JSON.stringify({ products: [], error: "現在商品情報を取得できません。時間をおいて再度お試しください。" }),
        { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }
  }

  // ブランド指定(brand=<ID>)のとき、そのブランドの追加候補を共通の商品群へ足し、返す件数の上限で切るときも
  // そのブランドの商品が先頭に残るようにする。未定義のIDや追加取得の失敗は無視し、共通の商品群だけで返す。
  let brandWords: string[] | null = null;
  const brandParam = params.get("brand");
  if (brandParam && config.brandSearch && Object.prototype.hasOwnProperty.call(config.brandSearch, brandParam)) {
    brandWords = config.brandSearch[brandParam].words;
    try {
      const extras = await getBrandExtras(config, brandParam, appId, runtimeEnv, cache, context.locals.runtime?.ctx?.waitUntil?.bind(context.locals.runtime.ctx));
      deduped = mergeBrandExtras(deduped, extras);
    } catch {
      // 追加取得に失敗しても、共通の商品群は表示する
    }
  }
  const sortedAll = sortProducts(deduped, sort);
  const ordered = brandWords ? prioritizeBrand(sortedAll, brandWords) : sortedAll;
  const sorted = ordered.slice(0, config.maxDisplayCount ?? DEFAULT_MAX_DISPLAY_COUNT);
  return new Response(
    JSON.stringify({
      products: sorted.map((p) => ({
        code: p.code,
        name: p.name,
        image: p.image,
        brand: p.brand,
        price: p.price,
        reviewRate: p.reviewRate,
        reviewCount: p.reviewCount,
        storeName: p.storeName,
        storeIsBestSeller: p.storeIsBestSeller,
        // お届け先を使わない取得では、Yahoo!が返す配送日は実際の配送日を表さない(店舗の既定値)ため返さない。
        // 共通のProductGridが「翌々日到着対象」と誤って表示するのを防ぐ。
        deliveryDay: config.ignoreDeliveryArea ? null : p.deliveryDay,
        productUrl: p.productUrl,
        // 楽天と照合できた商品だけ(順位付け専用の合算評価。楽天のデータ自体は含めない)
        ...(p.reviewSignal !== undefined ? { reviewSignal: p.reviewSignal } : {}),
        // AmazonのJAN検索リンク用(設定したカテゴリーのみ、JANがある商品のみ)
        ...(config.amazonJanLink && p.janCode ? { janCode: p.janCode } : {}),
        // 商品説明の抜粋(設定したカテゴリーのみ、文章として読めるものがある商品のみ)
        ...(config.showDescription ? descriptionField(p.descriptionText) : {}),
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

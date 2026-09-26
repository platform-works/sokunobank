import type { RankableProduct } from "./types";
import { filterRelevantProducts, dedupeByJan, dedupeByExactName, isTrustedYahooUrl } from "./productFilter";

// 「候補をYahoo APIから複数ページ取得し、要件を満たす商品が目標件数に達するまでページを
// 進める」ためのカテゴリー非依存の共通ロジック(2026-09-27導入)。
//
// 経緯: 従来のsearchProducts()(yahooShoppingClient.ts)は1クエリにつきresults=50を1回
// 取得するだけで、Yahoo側の実際のヒット数(オフィスチェアで2万件超)に対してサンプリング量が
// 極端に少なかった。さらに「Yahoo APIの先頭◯件を取得してから500円未満を足切りする」設計だと、
// 母数が少ないままでは足切り後の件数がさらに減ってしまう。
// このため、ユーザー指示により以下の順序で「目標件数(100件)に達するまでページを追加取得する」
// 方式に変更した:
//   1. Yahoo APIから複数ページ取得(results=100/ページ、実測確認済みの上限)
//   2. normalize
//   3. requiredKeywords
//   4. excludeKeywords
//   5. longLeadTimeExcludeKeywords
//   6. estimatedCommissionを計算
//   7. estimatedCommission < 閾値の商品を除外
//   8. JAN・商品名の重複除去
//   9. 先頭targetCount件を採用
// estimatedCommissionによる降順ソートは行わず、Yahoo APIが返した順序をそのまま維持する。

const ENDPOINT = "https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch";
// 2026-09-27実測: results=100は成功、results=200はHTTP 400。100が実質上限。
const RESULTS_PER_PAGE = 100;

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

export interface FetchCandidatesParams {
  appId: string;
  queries: string[];
  area?: string;
  /**
   * 1(あすつく)または2(翌々日配送)。2026-09-27実測確認: delivery_day=2でリクエストすると
   * day=1相当の商品も結果に含まれる(day=1の結果は完全にday=2の結果の部分集合だった)ため、
   * 1と2を別々にリクエストして合算する必要はない。ここでは単一の値をそのまま渡す。
   */
  deliveryDay?: number;
  affiliateType?: "vc";
  affiliateId?: string;
  requiredKeywords: string[];
  excludeKeywords: string[];
  longLeadTimeExcludeKeywords: string[];
  minEstimatedCommission?: number;
  /** 要件を満たす商品をこの件数集められた時点で追加のページ取得を停止する */
  targetCount: number;
  /** 1クエリあたりに取得してよい最大ページ数(レート制限との兼ね合いで上限を設ける) */
  maxPagesPerQuery: number;
}

export interface FetchCandidatesDiagnostics {
  apiFetched: number;
  afterNormalize: number;
  afterRequiredKeywords: number;
  afterExcludeKeywords: number;
  afterLongLeadTime: number;
  afterCommissionThreshold: number;
  afterDedupe: number;
  final: number;
}

export interface FetchCandidatesResult {
  candidates: RankableProduct[];
  diagnostics: FetchCandidatesDiagnostics;
}

function buildPageUrl(params: {
  appId: string;
  query: string;
  area?: string;
  deliveryDay?: number;
  start: number;
  affiliateType?: "vc";
  affiliateId?: string;
}): string {
  const url = new URL(ENDPOINT);
  url.searchParams.set("appid", params.appId);
  url.searchParams.set("query", params.query);
  url.searchParams.set("in_stock", "true");
  url.searchParams.set("condition", "new");
  url.searchParams.set("results", String(RESULTS_PER_PAGE));
  url.searchParams.set("start", String(params.start));
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
 * カテゴリー横断の共通ロジック本体。呼び出し側(handleProductsRequest.ts)は
 * このtargetCount件(既定100件)の候補一覧を受け取り、その中からユーザーが選んだ並び順で
 * 最終的な表示件数(50件)を選ぶ。
 */
export async function fetchCandidates(params: FetchCandidatesParams): Promise<FetchCandidatesResult> {
  const seenCode = new Set<string>();
  const candidates: RankableProduct[] = [];
  const diagnostics: FetchCandidatesDiagnostics = {
    apiFetched: 0,
    afterNormalize: 0,
    afterRequiredKeywords: 0,
    afterExcludeKeywords: 0,
    afterLongLeadTime: 0,
    afterCommissionThreshold: 0,
    afterDedupe: 0,
    final: 0,
  };
  // 2026-09-26に修正した「一部のリクエストが失敗しても正常系として扱わない」という安全策の
  // 考え方は維持しつつ、しきい値を2026-09-27に見直した。ページネーション方式では1回の
  // リクエストで最大12回(4クエリ×最大3ページ)ものYahoo API呼び出しが発生するため、
  // 「1回でも失敗したら即座に全て破棄してエラー表示」にすると、旧方式(6リクエスト中心)より
  // 遥かに高い頻度でエラーが表示されてしまうことが判明した(実際に本番で頻発を確認)。
  // ページ単位の失敗はそのクエリの以降のページを諦めて次のクエリに進むだけにとどめ、
  // 「取得できた候補が実質ゼロ」の場合にのみ例外を投げてフォールバックキャッシュに委ねる
  // (1〜2ページの失敗があっても、他のページ・クエリから十分な候補が得られていれば
  // それをそのまま使う方が、空のエラー表示より利用者にとって有用なため)。
  let hadFetchError = false;

  queryLoop: for (const query of params.queries) {
    for (let page = 0; page < params.maxPagesPerQuery; page++) {
      if (candidates.length >= params.targetCount) break queryLoop;

      const start = page * RESULTS_PER_PAGE + 1;
      let hits: YahooHit[];
      try {
        const res = await fetch(
          buildPageUrl({
            appId: params.appId,
            query,
            area: params.area,
            deliveryDay: params.deliveryDay,
            start,
            affiliateType: params.affiliateType,
            affiliateId: params.affiliateId,
          })
        );
        if (!res.ok) {
          hadFetchError = true;
          break; // このクエリはこれ以上ページを進めず、次のクエリへ
        }
        const data = (await res.json()) as YahooSearchResponse;
        hits = data.hits ?? [];
      } catch {
        hadFetchError = true;
        break;
      }
      if (hits.length === 0) break; // これ以上ページが存在しない(失敗ではない正常な終端)

      diagnostics.apiFetched += hits.length;

      const newHits = hits.filter((h) => {
        if (!h.code || seenCode.has(h.code)) return false;
        seenCode.add(h.code);
        return true;
      });
      const normalized = newHits.map(normalizeHit).filter((p): p is RankableProduct => p !== null);
      diagnostics.afterNormalize += normalized.length;

      // filterRelevantProducts を条件を段階的に増やしながら複数回呼び、
      // 各段階の通過件数を診断用に記録する(ロジック自体は既存の共通関数をそのまま再利用)。
      const afterRequired = filterRelevantProducts(normalized, params.requiredKeywords, [], []);
      diagnostics.afterRequiredKeywords += afterRequired.length;
      const afterExclude = filterRelevantProducts(afterRequired, params.requiredKeywords, params.excludeKeywords, []);
      diagnostics.afterExcludeKeywords += afterExclude.length;
      const afterLeadTime = filterRelevantProducts(
        afterExclude,
        params.requiredKeywords,
        params.excludeKeywords,
        params.longLeadTimeExcludeKeywords
      );
      diagnostics.afterLongLeadTime += afterLeadTime.length;

      for (const product of afterLeadTime) {
        const estimatedCommission = product.price * (product.affiliateRate / 100);
        if (params.minEstimatedCommission !== undefined && estimatedCommission < params.minEstimatedCommission) {
          continue;
        }
        diagnostics.afterCommissionThreshold++;
        candidates.push(product); // Yahoo APIが返した順序をそのまま維持する(降順ソートしない)
        if (candidates.length >= params.targetCount) break;
      }

      if (hits.length < RESULTS_PER_PAGE) break; // 最終ページに到達済み
    }
  }

  // 取得エラーがあり、なおかつ候補が実質ゼロの場合のみ「取得失敗」として扱う。
  // 一部のページ・クエリが失敗しても他から十分な候補が得られていれば、それをそのまま使う。
  if (hadFetchError && candidates.length === 0) {
    throw new Error("Yahoo!ショッピングAPIから一部の検索結果を取得できませんでした");
  }

  const deduped = dedupeByExactName(dedupeByJan(candidates));
  diagnostics.afterDedupe = deduped.length;
  const final = deduped.slice(0, params.targetCount);
  diagnostics.final = final.length;

  return { candidates: final, diagnostics };
}

import type { EcSource, ProductListing, ReviewRecord } from "./types";
import { isAllowed } from "./sourceLicenseValidator";

/**
 * Review Data Connector。取得元ごとに「正規経路で何が取れるか」を抽象化する。
 * 現状、本文を取得できる許諾済みの正規経路は無いため、本文は空配列を返す(補完生成はしない)。
 * 集計値は各ECの商品検索APIレスポンス(listing.aggregateReview)から受け取る。
 * DRY_RUNでは外部通信をせず、呼び出し側が渡した fixture のみを扱う。
 */
export interface ConnectorResult {
  source: EcSource;
  aggregate: { rate: number; count: number } | null;
  reviews: ReviewRecord[];
  method: string;
  missing: string[];
  error: string | null;
}

export interface ReviewTextProvider {
  source: EcSource;
  /** 利用許諾が確認できた正規提供経路の名称(契約サービス等) */
  channelName: string;
  fetch(listingId: string): Promise<ReviewRecord[]>;
}

export async function collectReviews(listing: ProductListing, providers: ReviewTextProvider[] = []): Promise<ConnectorResult> {
  const missing: string[] = [];
  let aggregate: ConnectorResult["aggregate"] = null;
  if (listing.aggregateReview && isAllowed(listing.source, "fetchAggregate")) aggregate = listing.aggregateReview;
  else missing.push("評価集計(取得経路または許諾なし)");

  const provider = providers.find((p) => p.source === listing.source);
  let reviews: ReviewRecord[] = [];
  let method = "商品検索APIの集計値のみ";
  let error: string | null = null;
  if (provider && isAllowed(listing.source, "fetchText")) {
    try {
      reviews = await provider.fetch(listing.listingId);
      method = `正規提供経路: ${provider.channelName}`;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  } else {
    missing.push("レビュー本文(許諾済みの正規経路なし)");
  }
  return { source: listing.source, aggregate, reviews, method, missing, error };
}

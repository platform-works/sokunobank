import { RakutenApiError, type RakutenProduct } from "./types";

// 楽天市場商品検索API(2026-07-01版)のサーバー側クライアント。
// 認証: applicationId + accessKey(クエリ)。さらにRefererヘッダが必須(無いと拒否されるとの報告あり。
// サーバー側fetchでは自動付与されないため明示する)。Refererはアプリ登録の「許可するウェブサイト」と
// 一致させること。キーはログ・エラーメッセージ・キャッシュキーに出さない。

export const RAKUTEN_ENDPOINT = "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701";
const TIMEOUT_MS = 8000;
const MAX_RETRIES = 2;
// 同一URLへの短時間アクセス集中で応答停止する旨がドキュメントにあるため、控えめな間隔を保つ
const MIN_INTERVAL_MS = 1100;

export interface RakutenEnv {
  RAKUTEN_APPLICATION_ID?: string;
  RAKUTEN_ACCESS_KEY?: string;
  /** 任意。楽天アフィリエイトID(指定時のみaffiliateUrlが返る) */
  RAKUTEN_AFFILIATE_ID?: string;
  /** 任意。Refererに送るサイトURL(既定 https://sokunobank.com/) */
  RAKUTEN_REFERER?: string;
}

export interface RakutenSearchParams {
  keyword?: string;
  itemCode?: string;
  /** 1〜30 */
  hits?: number;
  page?: number;
  sort?: string;
  minPrice?: number;
  maxPrice?: number;
  /** 既定 true(在庫あり) */
  inStockOnly?: boolean;
}

export interface RakutenClientOptions {
  fetchImpl?: typeof fetch;
  /** テスト用: 待機を差し替える */
  sleep?: (ms: number) => Promise<void>;
  cache?: { get(key: string): Promise<RakutenProduct[] | undefined>; set(key: string, v: RakutenProduct[]): Promise<void> };
}

interface RawItem {
  itemName?: string;
  itemCode?: string;
  itemPrice?: number;
  itemUrl?: string;
  affiliateUrl?: string;
  shopName?: string;
  mediumImageUrls?: (string | { imageUrl?: string })[];
  reviewAverage?: number | string;
  reviewCount?: number;
  janCode?: string;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
};
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v : null);

/** 型番らしい英数字トークン(英字と数字を両方含む4文字以上)を商品名から1つだけ確実に取れた場合のみ返す */
export function extractModelNumber(name: string): string | null {
  const tokens = name.normalize("NFKC").match(/[A-Za-z0-9][A-Za-z0-9-]{3,}/g) ?? [];
  const cands = [...new Set(tokens.filter((t) => /[A-Za-z]/.test(t) && /\d/.test(t)))];
  return cands.length === 1 ? cands[0] : null;
}

/** reviewCount=0 のとき平均は0で返るため、件数0は「評価なし(null)」として扱う */
export function normalizeItem(raw: RawItem): RakutenProduct | null {
  const itemCode = str(raw.itemCode);
  const name = str(raw.itemName);
  if (!itemCode || !name) return null;
  const img = raw.mediumImageUrls?.[0];
  const reviewCount = num(raw.reviewCount);
  const avg = num(raw.reviewAverage);
  const hasReview = reviewCount !== null && reviewCount > 0 && avg !== null;
  return {
    source: "rakuten",
    itemCode,
    name,
    modelNumber: extractModelNumber(name),
    janCode: str(raw.janCode),
    price: num(raw.itemPrice),
    imageUrl: str(typeof img === "string" ? img : img?.imageUrl),
    itemUrl: str(raw.itemUrl),
    affiliateUrl: str(raw.affiliateUrl),
    shopName: str(raw.shopName),
    reviewAverage: hasReview ? avg : null,
    reviewCount: hasReview ? reviewCount : null,
  };
}

/** 楽天ドメインのhttpsリンクのみ許可(外部URLの無検証な埋め込みを避ける) */
export function isTrustedRakutenUrl(url: string | null): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && (u.hostname.endsWith(".rakuten.co.jp") || u.hostname === "rakuten.co.jp");
  } catch {
    return false;
  }
}

let lastCallAt = 0;

export async function searchRakuten(
  env: RakutenEnv,
  params: RakutenSearchParams,
  opts: RakutenClientOptions = {}
): Promise<RakutenProduct[]> {
  const appId = env.RAKUTEN_APPLICATION_ID;
  const accessKey = env.RAKUTEN_ACCESS_KEY;
  if (!appId || !accessKey) throw new RakutenApiError("no_credentials", "RAKUTEN_APPLICATION_ID / RAKUTEN_ACCESS_KEY が未設定");
  if (!params.keyword && !params.itemCode) throw new RakutenApiError("wrong_parameter", "keyword か itemCode が必要");

  const url = new URL(RAKUTEN_ENDPOINT);
  url.searchParams.set("format", "json");
  url.searchParams.set("formatVersion", "2");
  if (params.keyword) url.searchParams.set("keyword", params.keyword);
  if (params.itemCode) url.searchParams.set("itemCode", params.itemCode);
  url.searchParams.set("hits", String(Math.min(30, Math.max(1, params.hits ?? 30))));
  url.searchParams.set("page", String(Math.min(100, Math.max(1, params.page ?? 1))));
  url.searchParams.set("availability", params.inStockOnly === false ? "0" : "1");
  if (params.sort) url.searchParams.set("sort", params.sort);
  if (params.minPrice !== undefined) url.searchParams.set("minPrice", String(params.minPrice));
  if (params.maxPrice !== undefined) url.searchParams.set("maxPrice", String(params.maxPrice));
  if (env.RAKUTEN_AFFILIATE_ID) url.searchParams.set("affiliateId", env.RAKUTEN_AFFILIATE_ID);

  // キャッシュキーには認証情報を含めない(アフィリエイトIDは公開情報だが、キー自体はURLに入れない)
  const cacheKey = url.toString();
  const cached = await opts.cache?.get(cacheKey);
  if (cached) return cached;

  url.searchParams.set("applicationId", appId);
  url.searchParams.set("accessKey", accessKey);

  const doFetch = opts.fetchImpl ?? fetch;
  const sleep = opts.sleep ?? defaultSleep;

  for (let attempt = 0; ; attempt++) {
    const wait = lastCallAt + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastCallAt = Date.now();

    let res: Response;
    try {
      const referer = env.RAKUTEN_REFERER ?? "https://sokunobank.com/";
      res = await doFetch(url.toString(), {
        // Node(undici)ではRefererヘッダが禁止ヘッダとして無視されるため、referrerオプションでも指定する
        // (2026-10-24実測: ヘッダのみだと403 REQUEST_CONTEXT_BODY_HTTP_REFERRER_MISSING、referrerオプション+Originで200)。
        // Cloudflare Workersではヘッダ指定が有効なため両方付ける。
        referrer: referer,
        headers: { Referer: referer, Origin: new URL(referer).origin, Accept: "application/json" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (e) {
      const timeout = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
      if (attempt < MAX_RETRIES) {
        await sleep(500 * 2 ** attempt);
        continue;
      }
      throw new RakutenApiError(timeout ? "timeout" : "network", timeout ? "楽天APIがタイムアウト" : "楽天APIへ接続できない");
    }

    if (res.ok) {
      let body: { Items?: RawItem[]; items?: RawItem[] };
      try {
        body = (await res.json()) as typeof body;
      } catch {
        throw new RakutenApiError("parse", "楽天APIの応答を解析できない", res.status);
      }
      const items = (body.Items ?? body.items ?? []).map((i) => normalizeItem((i as { Item?: RawItem }).Item ?? i));
      const products = items.filter((p): p is RakutenProduct => p !== null);
      await opts.cache?.set(cacheKey, products);
      return products;
    }

    if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
      const ra = Number(res.headers.get("retry-after"));
      await sleep(Number.isFinite(ra) && ra > 0 ? Math.min(ra * 1000, 10000) : 1000 * 2 ** attempt);
      continue;
    }
    // 404 は「該当なし」なので空配列として扱う
    if (res.status === 404) return [];
    const kind =
      res.status === 429 ? "rate_limited" : res.status === 400 ? "wrong_parameter" : res.status === 401 || res.status === 403 ? "forbidden" : "server";
    throw new RakutenApiError(kind, `楽天APIエラー(HTTP ${res.status})`, res.status);
  }
}

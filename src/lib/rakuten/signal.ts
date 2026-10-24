import { adjustedRating } from "../commerce/reviewPick";
import { searchRakuten, type RakutenClientOptions, type RakutenEnv } from "./client";
import type { RakutenProduct } from "./types";

// 楽天市場の評価・件数を「裏側の順位付けの材料」にするための照合ロジック(2026-10-24導入、ユーザー指示)。
// 楽天のデータは画面にも、ブラウザへ返すJSONにも出さない。サーバー側で
//   Yahoo!商品 ←(商品名の型番が一致 かつ 価格が近い)→ 楽天商品
// を照合し、両方のレビューを合算した「件数補正後の評価(reviewSignal)」という数値1つだけをYahoo!商品に付ける。
// 楽天APIにJANの出力は無いため、照合は型番+価格帯で行う(JANでは照合しない)。確度が低い曖昧な組み合わせは捨てる。

/** 型番ではない「数値+単位」(3000W・2048Wh・120000mAh等)。これを型番として誤照合しないよう除外する */
const SPEC_VALUE = /^\d+(\.\d+)?(w|wh|kwh|kw|kva|va|v|a|ah|mah|l|hz|cc|kg|g|mm|cm|m|db|rpm|pcs)$/i;

/** 価格がこの比率以内なら「同じ価格帯」とみなす(型番が一致しても、セット品・容量違いは価格が大きく異なる) */
export const PRICE_BAND_RATIO = 0.3;
/** 1つのYahoo!商品に合算する楽天商品の上限(同一型番の出品が多数ある場合) */
const MAX_MATCHES = 5;

/**
 * 商品名から型番らしいトークンを取り出す。英字と数字を両方含む4文字以上の英数字で、
 * 「3000W」のような仕様値は除く。全角は半角へ、大文字小文字は区別しない。
 */
export function modelTokens(name: string): string[] {
  const tokens = name.normalize("NFKC").match(/[A-Za-z0-9][A-Za-z0-9-]{3,}/g) ?? [];
  const out = new Set<string>();
  for (const t of tokens) {
    if (!/[A-Za-z]/.test(t) || !/\d/.test(t)) continue;
    if (SPEC_VALUE.test(t)) continue;
    out.add(t.toLowerCase().replace(/-/g, ""));
  }
  return [...out];
}

export interface YahooForMatch {
  code: string;
  name: string;
  price: number;
  reviewRate: number;
  reviewCount: number;
}

export interface ReviewSignal {
  /** 件数補正後の評価(1〜5)。Yahoo!と楽天のレビューを合算して算出 */
  score: number;
  /** 合算に使った楽天商品の数(0なら楽天は寄与していない=Yahoo!のレビューだけ) */
  rakutenMatches: number;
}

/**
 * 楽天側の商品群(pool)とYahoo!商品を照合し、商品コードごとのreviewSignalを返す。
 * 照合条件(すべて満たす場合のみ): 型番トークンが一致 / 価格差が±30%以内 /
 * 両者とも型番が1つに特定できる(複数型番の併記商品は曖昧なので使わない) / 楽天側にレビューがある。
 */
export function buildReviewSignals(yahoo: YahooForMatch[], pool: RakutenProduct[]): Map<string, ReviewSignal> {
  const byToken = new Map<string, RakutenProduct[]>();
  for (const r of pool) {
    if (r.price === null || r.reviewAverage === null || r.reviewCount === null) continue;
    const t = modelTokens(r.name);
    if (t.length !== 1) continue;
    const list = byToken.get(t[0]) ?? [];
    list.push(r);
    byToken.set(t[0], list);
  }

  const out = new Map<string, ReviewSignal>();
  for (const y of yahoo) {
    if (y.price <= 0) continue;
    const t = modelTokens(y.name);
    if (t.length !== 1) continue;
    const matches = (byToken.get(t[0]) ?? [])
      .filter((r) => Math.abs((r.price as number) - y.price) / y.price <= PRICE_BAND_RATIO)
      .slice(0, MAX_MATCHES);
    if (matches.length === 0) continue;

    let count = Math.max(0, y.reviewCount);
    let sum = y.reviewRate > 0 ? y.reviewRate * count : 0;
    if (y.reviewRate <= 0) count = 0;
    for (const r of matches) {
      count += r.reviewCount as number;
      sum += (r.reviewAverage as number) * (r.reviewCount as number);
    }
    if (count <= 0) continue;
    out.set(y.code, { score: adjustedRating(sum / count, count), rakutenMatches: matches.length });
  }
  return out;
}

/**
 * 楽天から照合用の商品群を集める。keywordごとに最大pages頁(30件/頁)を取得し、itemCodeで重複を除く。
 * 一部の取得が失敗しても、取れた分だけを返す(全滅なら空配列。呼び出し側はYahoo!のみで続行する)。
 */
export async function fetchRakutenPool(
  env: RakutenEnv,
  keywords: string[],
  pagesPerKeyword: number,
  opts: RakutenClientOptions = {}
): Promise<RakutenProduct[]> {
  const seen = new Set<string>();
  const pool: RakutenProduct[] = [];
  for (const keyword of keywords) {
    for (let page = 1; page <= pagesPerKeyword; page++) {
      try {
        // レビュー件数の多い順に取る(売れている=レビューが多い商品の評価を材料にするため)
        const items = await searchRakuten(env, { keyword, page, hits: 30, sort: "-reviewCount" }, opts);
        for (const it of items) {
          if (seen.has(it.itemCode)) continue;
          seen.add(it.itemCode);
          pool.push(it);
        }
        if (items.length < 30) break;
      } catch {
        break; // このキーワードは以降の頁を諦めて次へ(認証エラー等でも例外を外へ出さない)
      }
    }
  }
  return pool;
}

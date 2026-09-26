import type { RankableProduct } from "./types";

/**
 * 商品名から本体らしい商品だけを残す。
 * 1) requiredKeywords のいずれかを含まない商品は無関係(検索語と緩く一致しただけ)として除外
 * 2) 残った中から excludeKeywords を含む商品(付属品・消耗品等)を除外
 * カテゴリー非依存の汎用関数。過剰除外を避けるため、名称の部分一致のみで判定する単純なロジックに留める。
 */
export function filterRelevantProducts(
  products: RankableProduct[],
  requiredKeywords: string[],
  excludeKeywords: string[]
): RankableProduct[] {
  const requiredPatterns = requiredKeywords.map((k) => k.toLowerCase());
  const excludePatterns = excludeKeywords.map((k) => k.toLowerCase());
  return products.filter((p) => {
    const name = p.name.toLowerCase();
    if (requiredPatterns.length > 0 && !requiredPatterns.some((keyword) => name.includes(keyword))) {
      return false;
    }
    return !excludePatterns.some((keyword) => name.includes(keyword));
  });
}

/** Yahoo商品URLがYahoo!ショッピングのドメインであることを確認する(外部URLの無検証な埋め込みを避ける) */
export function isTrustedYahooUrl(url: string): boolean {
  try {
    const { hostname, protocol } = new URL(url);
    if (protocol !== "https:") return false;
    return hostname === "shopping.yahoo.co.jp" || hostname.endsWith(".shopping.yahoo.co.jp");
  } catch {
    return false;
  }
}

/** hits.code 等の商品識別子で重複を除去する(先勝ち) */
export function dedupeByCode(products: RankableProduct[]): RankableProduct[] {
  const seen = new Set<string>();
  const result: RankableProduct[] = [];
  for (const p of products) {
    if (seen.has(p.code)) continue;
    seen.add(p.code);
    result.push(p);
  }
  return result;
}

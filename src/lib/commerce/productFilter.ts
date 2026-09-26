import type { RankableProduct } from "./types";

// 出品者が検索ヒット率を上げるため、説明文の末尾に無関係な語句を大量に列挙する
// 「関連Word: ○○ ○○ ...」的なタグ羅列を付けていることが多い(2026-09-26、PCモニターの
// 除外条件調査で発覚。例:モニター本体の説明文に「関連Word: ... モニターアーム ...」とあり、
// アーム単体商品でもないのにexcludeKeywords「モニターアーム」に誤ヒットして除外されていた)。
// この手のタグ羅列以降はexcludeKeywords判定の対象から外す(本文中の正当な長納期表記等は
// タグ羅列より前に書かれるのが通例のため、除外検出の精度が落ちる心配はない)。
const RELATED_WORD_MARKER = /(関連word|関連ワード|関連キーワード|検索ワード)[:：]/i;

function stripRelatedWordTags(text: string): string {
  const idx = text.search(RELATED_WORD_MARKER);
  return idx === -1 ? text : text.slice(0, idx);
}

/**
 * 商品名から本体らしい商品だけを残す。
 * 1) requiredKeywords のいずれかを含まない商品は無関係(検索語と緩く一致しただけ)として除外
 * 2) 残った中から excludeKeywords を含む商品(付属品・消耗品・お取り寄せ品等)を除外
 *    (excludeKeywordsは商品名だけでなく、商品説明・キャッチコピーも対象にする。
 *    「在庫状況：お取り寄せ/お届け：2〜3ヶ月」等は商品名には出ず説明文にのみ出るため)
 * カテゴリー非依存の汎用関数。過剰除外を避けるため、文字列の部分一致のみで判定する単純なロジックに留める。
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
    const description = stripRelatedWordTags(p.descriptionText.toLowerCase());
    const searchableText = `${name} ${description}`;
    return !excludePatterns.some((keyword) => searchableText.includes(keyword));
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

/**
 * 同一JANコード(同一商品)が複数ストアから出品されている場合、先に現れたものだけを残す。
 * ソート済みの配列に対して使うことで「価格・収益性等の並び順で最初に来たもの」を残せる。
 * JANコードが取得できない商品(null)は重複判定の対象外とし、そのまま残す。
 */
export function dedupeByJan<T extends { janCode: string | null }>(products: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const p of products) {
    if (p.janCode) {
      if (seen.has(p.janCode)) continue;
      seen.add(p.janCode);
    }
    result.push(p);
  }
  return result;
}

/**
 * JANコードが取得できない商品(セラー側の入力漏れ等)でも、商品名が完全一致する場合は
 * 同一商品の別ストア出品とみなして先勝ちで重複除去する(dedupeByJanの後段として使う)。
 */
export function dedupeByExactName<T extends { name: string }>(products: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const p of products) {
    if (seen.has(p.name)) continue;
    seen.add(p.name);
    result.push(p);
  }
  return result;
}

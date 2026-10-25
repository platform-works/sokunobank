// ブランド指定時の商品の追加取得(2026-10-24導入、発電機カテゴリーが最初の利用者)。
// 全員共通の商品群(お届け先に依存しない1つのキャッシュ)は、検索語「発電機」「ポータブル電源」の上位から集めるため、
// 特定ブランドの商品が取りこぼされることがある。ブランドを指定したときだけ、そのブランドの検索語で追加の候補を集め、
// 共通の商品群へ足す(共通の商品群は減らさない。別のブランドへ切り替えても、そのブランドの追加分が足されるだけ)。

import { dedupeByExactName, dedupeByJan } from "./productFilter";

export interface BrandSearchConfig {
  /** 商品名・ブランド名に含まれる語(大文字小文字を区別しない)。表示の絞り込み(generatorClientのbrandOptions)と同じ語にする */
  words: string[];
  /** そのブランドを追加で集めるYahoo!ショッピングの検索語 */
  queries: string[];
  /** 追加で集める候補の目標件数(既定100) */
  targetCount?: number;
}

/** 共通の商品群へ、ブランド追加分を足す。商品コード・JAN・同一の商品名の重複は、共通の商品群のものを残す */
export function mergeBrandExtras<T extends { code: string; janCode: string | null; name: string }>(base: T[], extras: T[]): T[] {
  const seen = new Set(base.map((p) => p.code));
  const added = extras.filter((p) => !seen.has(p.code));
  return dedupeByExactName(dedupeByJan([...base, ...added]));
}

/** 商品名・ブランド名に、指定した語のいずれかが含まれるか */
export function matchesWords(product: { name: string; brand?: string | null }, words: string[]): boolean {
  const text = `${product.name} ${product.brand ?? ""}`.toLowerCase();
  return words.some((w) => text.includes(w.toLowerCase()));
}

/**
 * 並べ替え済みの商品を、指定ブランドの商品を先頭へ寄せた順にする(各グループ内の順序は維持)。
 * 返す件数の上限で切るとき、ブランド指定の商品が切り落とされないようにするため。
 */
export function prioritizeBrand<T extends { name: string; brand?: string | null }>(sorted: T[], words: string[]): T[] {
  const hit: T[] = [];
  const rest: T[] = [];
  for (const p of sorted) (matchesWords(p, words) ? hit : rest).push(p);
  return [...hit, ...rest];
}

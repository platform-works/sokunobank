import type { ProductIdentity, ProductListing } from "./types";

const norm = (s: string | null) => (s ?? "").normalize("NFKC").toLowerCase().replace(/[\s\-_/・]/g, "");

function attrsDiff(a: ProductListing, b: ProductListing): string | null {
  for (const k of Object.keys(a.variantAttrs)) {
    const bv = b.variantAttrs[k];
    if (bv !== undefined && norm(bv) !== norm(a.variantAttrs[k])) return `${k}が異なる(${a.variantAttrs[k]} / ${bv})`;
  }
  return null;
}

function makeKey(l: ProductListing): string {
  if (l.janCode) return `jan:${l.janCode}`;
  if (l.modelNumber) {
    const v = Object.values(l.variantAttrs).map(norm).join("|");
    return `model:${norm(l.brand ?? l.maker)}:${norm(l.modelNumber)}:${v}`;
  }
  return `${l.source}:${l.listingId}`;
}

/**
 * 同一商品判定。優先順位: JAN一致 > 型番+ブランド一致 > (束ねない。名前だけの類似は低信頼の単独扱い)。
 * 型番が同じでも容量等の variantAttrs が食い違えば別商品として分離する。
 */
export function matchProducts(listings: ProductListing[]): ProductIdentity[] {
  const groups: ProductIdentity[] = [];
  for (const l of listings) {
    let placed = false;
    for (const g of groups) {
      const rep = g.listings[0];
      const sameJan = !!l.janCode && !!rep.janCode && l.janCode === rep.janCode;
      const brandL = norm(l.brand ?? l.maker);
      const sameModel =
        !!l.modelNumber && !!rep.modelNumber && norm(l.modelNumber) === norm(rep.modelNumber) && brandL !== "" && brandL === norm(rep.brand ?? rep.maker);
      if (!sameJan && !sameModel) continue;
      const diff = sameJan ? null : attrsDiff(l, rep);
      if (diff) {
        g.separatedNotes.push(`${l.source}:${l.listingId} は型番一致だが${diff}ため別商品として扱った`);
        continue;
      }
      g.listings.push(l);
      if (sameJan) {
        g.matchBasis = "jan";
        g.confidence = 1;
      }
      placed = true;
      break;
    }
    if (!placed) {
      groups.push({
        productKey: makeKey(l),
        listings: [l],
        matchBasis: l.janCode ? "jan" : l.modelNumber ? "model+brand" : "name-fuzzy",
        confidence: l.janCode ? 1 : l.modelNumber ? 0.85 : 0.3,
        separatedNotes: [],
      });
    }
  }
  return groups;
}

/** ランキング・レビュー集約に使ってよい同一性の信頼度 */
export const MIN_IDENTITY_CONFIDENCE = 0.8;

import { decidePublish } from "./sourceLicenseValidator";
import type { EcSource, PublishDecision, RankingResult, ReviewAnalysis, TrustReport, ProductListing } from "./types";

/** 確認済みのAmazonアソシエイトリンク。ASIN・URLが未確認の商品はここに登録しない(推測生成禁止) */
export interface AmazonAssociateLink {
  productKey: string;
  asin: string;
  url: string;
  /** 将来Creators APIが使えるようになったら画像・価格を足すための拡張枠(現在は常にnull) */
  extension: { imageUrl: string | null; price: number | null } | null;
}

export const ASSOCIATE_TAG = "sokunobank-22";

export function isValidAssociateLink(l: AmazonAssociateLink): boolean {
  try {
    const u = new URL(l.url);
    return u.hostname === "www.amazon.co.jp" && u.searchParams.get("tag") === ASSOCIATE_TAG && /^[A-Z0-9]{10}$/.test(l.asin);
  } catch {
    return false;
  }
}

export interface LpProductBlock {
  productKey: string;
  name: string;
  rank: number;
  specs: Record<string, number>;
  /** 画像は楽天/Yahoo!のみ。出典ECと商品リンクを必ず併設。許諾未確認なら null(非表示) */
  image: { url: string; sourceLabel: string; linkUrl: string } | null;
  priceTable: { source: EcSource; store: string | null; price: number | null; url: string; fetchedAt: string }[];
  buyerEvaluation: string[];
  pros: string[];
  cons: string[];
  /** 商品ごとのAmazon CTA。リンク未登録なら null(CTA非表示) */
  amazonCta: { url: string; label: string } | null;
}

export interface LpContent {
  dryRun: true;
  h1: string;
  conclusion: string;
  firstViewAmazonCta: { url: string; label: string } | null;
  prLabel: string;
  rankingKind: RankingResult["kind"];
  rankingMethod: string;
  updatedAt: string;
  products: LpProductBlock[];
  faq: { question: string; answer: string }[];
  sources: string[];
  publish: PublishDecision;
}

const SOURCE_LABEL: Record<EcSource, string> = { yahoo: "Yahoo!ショッピング", rakuten: "楽天市場", amazon: "Amazon" };

export function generateLpContent(params: {
  h1: string;
  conclusion: string;
  ranking: RankingResult;
  listingsByKey: Record<string, ProductListing[]>;
  analyses: Record<string, ReviewAnalysis | null>;
  trusts: Record<string, TrustReport | null>;
  amazonLinks: AmazonAssociateLink[];
  faq: LpContent["faq"];
  hadApiError?: boolean;
}): LpContent {
  const links = params.amazonLinks.filter(isValidAssociateLink);
  const products: LpProductBlock[] = params.ranking.items.map((it) => {
    const ls = params.listingsByKey[it.productKey] ?? [];
    // Amazon出品の価格・画像・評価は他社データで代用しない。表示対象は楽天/Yahoo!のみ
    const shown = ls.filter((l) => l.source !== "amazon");
    const withImage = shown.find((l) => l.imageUrl);
    const an = params.analyses[it.productKey];
    const tr = params.trusts[it.productKey];
    const evaluation: string[] = [];
    if (an && an.analyzedCount > 0 && an.period) {
      evaluation.push(`分析対象${an.analyzedCount}件(${an.period.from}〜${an.period.to})の傾向であり、購入者全体の評価ではありません。`);
      for (const t of an.themes.slice(0, 4)) evaluation.push(`${t.theme}: 肯定${t.positive}件・否定${t.negative}件(言及${t.mentions}件)`);
    } else {
      evaluation.push("本文レビューの分析は行っていません(利用許諾のある取得経路がないため)。");
    }
    const agg = shown.find((l) => l.aggregateReview)?.aggregateReview;
    if (agg) evaluation.push(`ストア商品ページの評価平均 ${agg.rate}(${agg.count}件)${tr?.level === "reference" ? " ※参考情報" : ""}`);
    const link = links.find((l) => l.productKey === it.productKey);
    return {
      productKey: it.productKey,
      name: it.name,
      rank: it.rank,
      specs: ls[0]?.specs ?? {},
      image: withImage?.imageUrl ? { url: withImage.imageUrl, sourceLabel: `画像出典: ${SOURCE_LABEL[withImage.source]}`, linkUrl: withImage.url } : null,
      priceTable: shown.map((l) => ({ source: l.source, store: l.storeName, price: l.price, url: l.url, fetchedAt: l.fetchedAt })),
      buyerEvaluation: evaluation,
      pros: it.evidence.filter((e) => !e.includes("評価不能")).slice(0, 3),
      cons: it.drawbacks,
      amazonCta: link ? { url: link.url, label: "Amazonで見る" } : null,
    };
  });

  const topLink = products.find((p) => p.amazonCta)?.amazonCta ?? null;
  const sources = [...new Set(products.flatMap((p) => p.priceTable.map((r) => r.source)))] as EcSource[];
  const publish = decidePublish({
    sources,
    showsReviewText: false,
    showsAggregate: products.some((p) => p.buyerEvaluation.some((e) => e.includes("評価平均"))),
    showsImages: products.some((p) => p.image),
    hadApiError: params.hadApiError ?? false,
  });
  return {
    dryRun: true,
    h1: params.h1,
    conclusion: params.conclusion,
    firstViewAmazonCta: topLink,
    prLabel: "PR:本ページはアフィリエイト広告を含みます",
    rankingKind: params.ranking.kind,
    rankingMethod: params.ranking.method,
    updatedAt: params.ranking.generatedAt,
    products,
    faq: params.faq,
    sources: sources.map((s) => SOURCE_LABEL[s]),
    publish,
  };
}

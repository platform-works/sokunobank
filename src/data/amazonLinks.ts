import { isValidAssociateLink, type AmazonAssociateLink } from "../lib/reviewIntel/lpContentGenerator";

/**
 * 確認済みのAmazonアソシエイト商品リンク(ページ単位)。
 * ASIN・商品リンクはアソシエイト管理画面で本人が確認したものだけを登録する(推測で生成しない)。
 * 未登録のページではCTAは表示されない。Amazonの価格・画像・評価は表示せず、他社データでも代用しない。
 * Creators API利用可能後に extension(画像・価格)を足せる構造にしてある。
 */
export const AMAZON_LINKS_BY_PAGE: Record<string, { label: string; link: AmazonAssociateLink }[]> = {
  "urgent-portable-power-station": [],
};

export function getAmazonCtas(pageKey: string) {
  return (AMAZON_LINKS_BY_PAGE[pageKey] ?? []).filter((e) => isValidAssociateLink(e.link));
}

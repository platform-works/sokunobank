// ValueCommerceの動的リダイレクト形式(sid/pidを含む固定プレフィックス + vc_url=対象URL)で
// アフィリエイトリンクを組み立てる。プレフィックス自体は環境変数(VALUECOMMERCE_AFFILIATE_ID)に
// 実値を持たせ、コード中には一切書かない。

export function buildAffiliateUrl(affiliateUrlPrefix: string | undefined, destinationUrl: string): string {
  if (!affiliateUrlPrefix) return destinationUrl;
  return `${affiliateUrlPrefix}${encodeURIComponent(destinationUrl)}`;
}

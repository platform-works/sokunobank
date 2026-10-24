// AmazonアソシエイトのJAN検索リンク(2026-10-24導入、ユーザー指示)。CLAUDE.mdの「Amazonアソシエイト連携ルール」に従い、
// 検索結果ページへのリンクのみ(PA-API/Creators APIは使わない)。価格・評価・在庫・配達日は取得・表示せず、
// 検索結果に同じ商品があるとも保証しない(表記は「AmazonでJAN検索」)。

export const AMAZON_TAG = "sokunobank-22";

/** JANコード(JAN-8またはJAN-13/EAN-13)。数字のみ8桁または13桁。それ以外は無効として扱う */
export function isValidJan(jan: string | null | undefined): jan is string {
  return typeof jan === "string" && /^(\d{8}|\d{13})$/.test(jan);
}

/** JAN検索のAmazon検索結果URL。JANが無効ならnull(ボタンを出さない) */
export function amazonJanUrl(jan: string | null | undefined): string | null {
  if (!isValidJan(jan)) return null;
  return `https://www.amazon.co.jp/s?k=${jan}&tag=${AMAZON_TAG}`;
}

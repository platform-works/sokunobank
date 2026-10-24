// Yahoo!ショッピングの商品画像URLを、表示サイズに合った大きさへ差し替える(2026-10-24導入)。
// 商品取得APIが返す image.medium は146×146pxと小さく、大きく表示するとぼやける。画像のCDN(item-shopping.c.yimg.jp)は
// URLの「/i/<サイズ>/<ID>」のサイズ文字で大きさが変わる。実測(2026-10-24、3店舗で一致):
//   c=76 / g=146(medium) / i=200 / j=300 / k=400 / l=600 / (n・zはそれ以上、店舗により異なる)
// 自社ホスティングはせず、Yahoo!の画像URLをそのまま参照する(既存の表示と同じ)。URLが想定の形でなければ元のURLを返す。

export type YahooImageSize = "i" | "j" | "k" | "l";

const PATTERN = /^(https:\/\/item-shopping\.c\.yimg\.jp\/i\/)[a-z](\/[^?#\s]+)$/;

export function yahooImageUrl(url: string | null | undefined, size: YahooImageSize = "l"): string {
  if (!url) return "";
  const m = url.match(PATTERN);
  return m ? `${m[1]}${size}${m[2]}` : url;
}

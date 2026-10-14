/**
 * 広告の文字数。Google 広告は、全角（日本語）の1文字を2、半角を1として数える（公式ヘルプ: Responsive search ad requirements）。
 * 例: 見出し30 = 全角15文字、説明文90 = 全角45文字。
 */
export function weight(text: string): number {
  let n = 0;
  for (const ch of text.normalize("NFC")) {
    const c = ch.codePointAt(0)!;
    // ASCII・半角カナ（U+FF61–FF9F）は1。それ以外（全角・漢字・かな・全角記号）は2
    n += c <= 0x7e || (c >= 0xff61 && c <= 0xff9f) ? 1 : 2;
  }
  return n;
}

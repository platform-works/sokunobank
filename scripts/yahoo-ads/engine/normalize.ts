/**
 * 禁止語・社名の照合用の正規化。全角半角・大文字小文字・カタカナ/ひらがな・空白・中点・ハイフンの違いを吸収する。
 * （表記ゆれで、禁止語を見逃さないため。照合する側・される側の両方に同じ処理をかける）
 */
export function normalizeForMatch(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60)) // カタカナ→ひらがな
    .replace(/[\s　・･\-ー_.,，、。]/g, "");
}

export function containsTerm(text: string, term: string): boolean {
  const t = normalizeForMatch(term);
  return t.length > 0 && normalizeForMatch(text).includes(t);
}

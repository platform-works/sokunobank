// 商品説明の抜粋(2026-10-24導入、ユーザー指示)。Yahoo!ショッピングの商品説明は出品者がHTML混じりで書く文章で、
// 注意書き(※...)やキーワードの羅列も多い。そのため、タグを除いた文章のうち、注意書き・見出しの行を外し、
// 文章として読めるものだけを短く抜粋する。キーワードの羅列と判断したものは出さない(空文字を返す)。
// 説明の内容は出品者の記載であり、サイトとして保証しない旨は表示側で添える。

/** 「関連Word:」「★関連キーワード★」以降は検索用のタグ羅列なので落とす */
const TAG_SECTION = /(関連word|関連ワード|関連キーワード|関連情報|検索ワード)/i;

/** 商品説明ではなく、販売条件・案内を述べる文に含まれる語 */
const NOTICE_WORDS =
  /(在庫状況|在庫切れ|発送|配達|配送|お届け|納期|送料|返品|返金|交換|キャンセル|ご了承|ご注意|ご確認ください|お問い合わせ|予めご|沖縄|離島|北海道|時間指定|領収書|レビュー投稿|クーポン|ポイント)/;

const MAX_LENGTH = 140;
const MIN_LENGTH = 20;

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** キーワードの羅列に見えるか: 句読点がほとんどなく、空白区切りの短い語が多い */
function looksLikeKeywordList(text: string): boolean {
  const punctuation = (text.match(/[。、.,!?！？]/g) ?? []).length;
  const tokens = text.split(/\s+/).filter(Boolean);
  return punctuation === 0 && tokens.length >= 6;
}

/**
 * 説明文から抜粋を作る。使えるもの(20字以上の文章)が無ければ空文字。
 * 先頭の注意書き行(※・★・【...】だけの行)や仕様の表(「項目 値」の行)は読みにくいため、文章らしい行を選ぶ。
 */
export function descriptionExcerpt(raw: string | null | undefined): string {
  if (!raw) return "";
  const cut = raw.search(TAG_SECTION);
  const body = cut === -1 ? raw : raw.slice(0, cut);
  const lines = decodeEntities(body.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, " "))
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 0)
    // 注意書き・見出し・記号だけの行を外す
    .filter((l) => !/^[※★☆●■□◆◇▼▲【\[「*＊・]/.test(l))
    // 商品そのものの説明ではない、配送・在庫・返品・保証などの案内文を外す
    .filter((l) => !NOTICE_WORDS.test(l))
    // 「AC出力:…」「入力:…」のように項目と値が並ぶ仕様の行(コロンが2つ以上)は説明文ではない
    .filter((l) => (l.match(/[:：]/g) ?? []).length < 2)
    // 使い方・手順の指示文(「〜してください」)は商品の説明ではない
    .filter((l) => !/ください/.test(l));
  const prose = lines.filter((l) => l.length >= MIN_LENGTH && /[。、]/.test(l));
  // 仕様の羅列(「AC出力:…」「保護機能 …」)は説明として読みにくいため、句読点のある文章だけを使う
  const picked = prose.join(" ");
  if (picked.length < MIN_LENGTH || looksLikeKeywordList(picked)) return "";
  return picked.length > MAX_LENGTH ? `${picked.slice(0, MAX_LENGTH)}…` : picked;
}

// Up-T(A8.net)の広告コード。docs/upt_ads_1_15_74.csv から機械的に転記した原文(素材ID 1・15・74)。
// A8.netの規約上、広告コード(URL・パラメーター・計測用1x1画像を含む)は改変禁止。
// 一切書き換えず、描画側は set:html でそのまま出力すること。
export const UPT_AD_TEXT_1 = "<a href=\"https://px.a8.net/svt/ejp?a8mat=4BEE12+5ZJ2EA+34VM+BWVTE\" rel=\"nofollow\">ご自由にお造り下さい。</a>\n<img border=\"0\" width=\"1\" height=\"1\" src=\"https://www12.a8.net/0.gif?a8mat=4BEE12+5ZJ2EA+34VM+BWVTE\" alt=\"\">";
export const UPT_AD_BANNER_74_PC = "<a href=\"https://px.a8.net/svt/ejp?a8mat=4BEE12+5ZJ2EA+34VM+CCJ35\" rel=\"nofollow\">\n<img border=\"0\" width=\"728\" height=\"90\" alt=\"\" src=\"https://www20.a8.net/svt/bgt?aid=261011846362&wid=007&eno=01&mid=s00000014629002074000&mc=1\"></a>\n<img border=\"0\" width=\"1\" height=\"1\" src=\"https://www17.a8.net/0.gif?a8mat=4BEE12+5ZJ2EA+34VM+CCJ35\" alt=\"\">";
export const UPT_AD_BANNER_15_MOBILE = "<a href=\"https://px.a8.net/svt/ejp?a8mat=4BEE12+5ZJ2EA+34VM+BZVU9\" rel=\"nofollow\">\n<img border=\"0\" width=\"300\" height=\"250\" alt=\"\" src=\"https://www24.a8.net/svt/bgt?aid=261011846362&wid=007&eno=01&mid=s00000014629002015000&mc=1\"></a>\n<img border=\"0\" width=\"1\" height=\"1\" src=\"https://www11.a8.net/0.gif?a8mat=4BEE12+5ZJ2EA+34VM+BZVU9\" alt=\"\">";

// 素材ID 1 は A8.net の「テキスト広告(自由入力タイプ)」で、リンク文言「ご自由にお造り下さい。」は
// 提携者が自由に書き換えてよいプレースホルダー(2026-10-12、ユーザーの解釈・指示により文言を変更)。
// 書き換えてよいのは <a> の文言だけ。href・rel・a8mat等のパラメーター、計測用の1x1画像は原文のまま維持する。
const UPT_TEXT_AD_PLACEHOLDER = "ご自由にお造り下さい。";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** 素材ID 1 のリンク文言だけを差し替えた広告コードを返す(それ以外は原文のまま) */
export function uptTextAd(label: string): string {
  if (!UPT_AD_TEXT_1.includes(`>${UPT_TEXT_AD_PLACEHOLDER}</a>`)) {
    throw new Error("素材ID 1 の広告コードの形式が想定と異なります(リンク文言のプレースホルダーが見つかりません)");
  }
  return UPT_AD_TEXT_1.replace(`>${UPT_TEXT_AD_PLACEHOLDER}</a>`, `>${escapeHtml(label)}</a>`);
}

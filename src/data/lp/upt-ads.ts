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

/**
 * テキストリンク(ボタン)の遷移先。
 * - "top"    : 素材ID 1 の原文のまま(Up-Tのトップ)
 * - "results": A8「商品リンク」(mat=...HUSFL)が発行する遷移先 up-t.jp/page.php?p=results
 * 2026-10-15、ユーザー指示で "results" に設定。戻す場合はここを "top" にするだけでよい。
 */
export const UPT_TEXT_LINK_DESTINATION: "top" | "results" = "results";

// 商品リンク(UPT_PRODUCT_LINK)をA8のスクリプトが描画した際に、実際に出力されたクリックURLと計測画像(2026-10-15に画面で確認)。
// href のパラメーター(a8mat・a8ejpredirect)は A8 が発行した値のまま。手で組み立てていない。
const UPT_RESULTS_HREF =
  "https://px.a8.net/svt/ejp?a8mat=4BEE12+5ZJ2EA+34VM+HUSFL&amp;a8ejpredirect=https%3A%2F%2Fup-t.jp%2Fpage.php%3Fp%3Dresults";
const UPT_RESULTS_PIXEL =
  '<img border="0" width="1" height="1" src="https://www17.a8.net/0.gif?a8mat=4BEE12+5ZJ2EA+34VM+HUSFL" alt="">';

/** テキストリンクの広告コードを返す(リンク文言のみ差し替え。遷移先は UPT_TEXT_LINK_DESTINATION による) */
export function uptTextAd(label: string): string {
  if (UPT_TEXT_LINK_DESTINATION === "results") {
    return `<a href="${UPT_RESULTS_HREF}" rel="nofollow">${escapeHtml(label)}</a>\n${UPT_RESULTS_PIXEL}`;
  }
  if (!UPT_AD_TEXT_1.includes(`>${UPT_TEXT_AD_PLACEHOLDER}</a>`)) {
    throw new Error("素材ID 1 の広告コードの形式が想定と異なります(リンク文言のプレースホルダーが見つかりません)");
  }
  return UPT_AD_TEXT_1.replace(`>${UPT_TEXT_AD_PLACEHOLDER}</a>`, `>${escapeHtml(label)}</a>`);
}

// A8.net「商品リンク」(素材: mat=4BEE12+5ZJ2EA+34VM+HUSFL)。2026-10-15、ユーザーから受領した原文(遷移先を up-t.jp/item-detail/…/IT340 に差し替えた版)。
// <span>・外部スクリプト(statics.a8.net/ad/ad.js)・インラインスクリプトを一切改変しない。
// キャップ選択時だけ、LPがJSONとして保持し原文のまま実行する。
export const UPT_PRODUCT_LINK = "<span class=\"a8ad 4AUb6FI-g7-vy5hzms\"></span><script type=\"text/javascript\" src=\"//statics.a8.net/ad/ad.js\"></script><script type=\"text/javascript\">a8adscript('body').showAd({\"req\": {\"mat\":\"4BEE12+5ZJ2EA+34VM+HUSFL\",\"alt\":\"商品リンク\",\"id\":\"4AUb6FI-g7-vy5hzms\"},\"goods\": {\"ejp\":\"h\"+\"ttps://up-t.jp/item-detail/%E3%83%8F%E3%83%83%E3%83%94%E3%83%BB%E3%83%96%E3%83%AB%E3%82%BE%E3%83%B3/%E3%83%8F%E3%83%83%E3%83%94%E3%83%BB%E3%81%9D%E3%81%AE%E4%BB%96/IT340\",\"imu\":\"h\"+\"ttps://s3-ap-northeast-1.amazonaws.com/up-t.jp/ProductPreviews/00700-EVM_147.png\"}});</script>";

/**
 * テキストリンクの遷移先(A8が発行したクリックURLと計測画像。値はA8の管理画面で発行されたものをそのまま保持する)。
 * - results: 商品リンク(mat=...HUSFL)の遷移先 up-t.jp/page.php?p=results
 * - cap    : キャップ商品のテキストリンク(mat=...HUKPU)。キャップ選択時のLPのCTAだけで使う(2026-10-15、ユーザー指示)
 */
export const UPT_LINKS = {
  results: {
    href: "https://px.a8.net/svt/ejp?a8mat=4BEE12+5ZJ2EA+34VM+HUSFL&a8ejpredirect=https%3A%2F%2Fup-t.jp%2Fpage.php%3Fp%3Dresults",
    pixel: "https://www17.a8.net/0.gif?a8mat=4BEE12+5ZJ2EA+34VM+HUSFL",
  },
  cap: {
    href: "https://px.a8.net/svt/ejp?a8mat=4BEE12+5ZJ2EA+34VM+HUKPU&a8ejpredirect=https%3A%2F%2Fup-t.jp%2Fitem-detail%2F%25E3%2583%258F%25E3%2583%2583%25E3%2583%2594%25E3%2583%25BB%25E3%2583%2596%25E3%2583%25AB%25E3%2582%25BE%25E3%2583%25B3%2F%25E3%2583%258F%25E3%2583%2583%25E3%2583%2594%25E3%2583%25BB%25E3%2581%259D%25E3%2581%25AE%25E4%25BB%2596%2FIT340",
    pixel: "https://www17.a8.net/0.gif?a8mat=4BEE12+5ZJ2EA+34VM+HUKPU",
  },
} as const;

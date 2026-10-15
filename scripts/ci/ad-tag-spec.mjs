// 広告タグの検査仕様(仕様変更時は、ここだけを更新する)。
// 各項目: 全HTML(または pages で指定したパスのHTML)に、pattern が expected 回だけ現れること。
// target: "html" = HTML全体 / "inline" = インラインscriptの本文のみ。
// 広告管理ツールで発行されたタグが変わったとき(ID・形式)は、対応する pattern を、変更理由とともに更新する。
export const AD_TAG_CHECKS = [
  {
    id: "yahoo-ytag-loader",
    description: "LINEヤフー広告 ytag.js ローダーは1ページに1つ(共用)",
    target: "html",
    pattern: /<script[^>]*src="https:\/\/s\.yimg\.jp\/images\/listing\/tool\/cv\/ytag\.js"/g,
    expected: 1,
  },
  {
    id: "yahoo-ytag-function",
    description: "function ytag の定義は1つ",
    target: "inline",
    pattern: /function ytag\(\)/g,
    expected: 1,
  },
  {
    id: "yahoo-ycl-cookie",
    description: "ycl_cookie は1回",
    target: "inline",
    pattern: /type:\s*"ycl_cookie"/g,
    expected: 1,
  },
  {
    id: "yahoo-search-retargeting",
    description: "検索広告用リターゲティング(ID 1001413776)の初回呼び出しは1回",
    target: "inline",
    pattern: /yahoo_ss_retargeting_id:\s*"1001413776",\s*yahoo_sstag_custom_params:\s*\{\}/g,
    expected: 1,
  },
  {
    id: "yahoo-display-retargeting",
    description: "ディスプレイ広告用リターゲティング(ID NLEVOMGY4G)の呼び出しは1回",
    target: "inline",
    pattern: /yahoo_retargeting_id:\s*"NLEVOMGY4G"/g,
    expected: 1,
  },
  {
    id: "ga4-loader",
    description: "GA4(gtag.js)ローダーは1ページに1つ",
    target: "html",
    pattern: /<script[^>]*src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-SL36YEB0P6"/g,
    expected: 1,
  },
];

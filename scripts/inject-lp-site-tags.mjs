/**
 * `npm run build` の後(postbuild)に、affiliate-lp-factory から取り込んだLPへ、即納バンク全ページ共通の計測タグを入れる。
 *
 * 背景: ファクトリーのLPは単体の静的HTMLで、即納バンクの Layout.astro(GA4・LINEヤフー広告タグ・LinkSwitch など)を通らない。
 * そのままだとLPの計測(lp_quiz_answer / lp_cta_click など)が飛ばず、広告タグ検査(check:ad-tags)も通らない。
 *
 * 方法: ビルド済みのトップ(dist/index.html)の <head> から、全ページ共通のタグだけを「原文のまま」取り出し、
 *       取り込んだLPの <head> 末尾へ挿入する。タグの内容は一切書き換えない(改変禁止ルールに従う)。
 *   対象(サイト共通のもの): GA4ローダー(gtag/js)とその設定、LINEヤフー広告 ytag.js と設定、ValueCommerce LinkSwitch。
 *   対象外: JSON-LD(サイト構造化データ。LP側に独自のcanonicalあり)、Up-T専用のスクリプト、Astroのhoistedモジュール。
 * 取り込んだLPが無ければ何もしない。冪等(2回実行しても二重にならない)。
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const dist = join(root, "dist");
const stateFile = join(root, "src", "data", "generated", "lp-sync-state.json");
const MARK = "<!--sokunobank-site-tags-->";

if (!existsSync(stateFile) || !existsSync(join(dist, "index.html"))) process.exit(0);
const dirs = JSON.parse(readFileSync(stateFile, "utf8")).dirs ?? [];
if (dirs.length === 0) process.exit(0);

const top = readFileSync(join(dist, "index.html"), "utf8");
const head = top.slice(top.indexOf("<head"), top.indexOf("</head>"));
const wanted = [];
for (const m of head.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/g)) {
  const tag = m[0];
  if (/type="application\/ld\+json"/.test(tag)) continue;
  if (/type="module"/.test(tag)) continue;
  if (/lpItemIds/.test(tag)) continue; // Up-T専用
  if (/googletagmanager\.com\/gtag\/js|window\.dataLayer|s\.yimg\.jp\/images\/listing\/tool\/cv\/ytag\.js|yjDataLayer|vc_pid|aml\.valuecommerce\.com\/vcdal\.js/.test(tag)) wanted.push(tag);
}
if (wanted.length === 0) {
  console.error("[inject-lp-site-tags] トップから共通タグを取り出せませんでした。中止します。");
  process.exit(1);
}
const block = `${MARK}\n${wanted.join("\n")}\n`;

let n = 0;
const walk = (d) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (f.endsWith(".html")) {
      const html = readFileSync(p, "utf8");
      if (html.includes(MARK) || !html.includes("</head>")) continue;
      writeFileSync(p, html.replace("</head>", `${block}</head>`));
      n++;
    }
  }
};
for (const d of dirs) if (existsSync(join(dist, "lp", d))) walk(join(dist, "lp", d));
console.log(`[inject-lp-site-tags] ${n}ページに共通タグ(${wanted.length}個)を挿入`);

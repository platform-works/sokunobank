// ビルド後(dist/)のHTMLから、広告主サイトへ導線を張っているページを一覧する(2026-10-12)。
// 使い方: npm run build の後に node scripts/list-ad-pages.cjs
// - A8.net広告タグ(px.a8.net の a8mat)を直接出力しているページ(広告主ごと)
// - Up-T LP(/lp/original-print/)へ内部リンクしているページ
const fs = require("fs");
const path = require("path");

const SITE = "https://sokunobank.com";
const PROGRAMS = { "4BEE12": "Up-T(オリジナルプリント)", "4BCKBY": "DM発送代行一括.jp" };

function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith(".html")) out.push(p);
  }
  return out;
}
function urlOf(file) {
  const rel = path.relative("dist", file).replace(/\\/g, "/").replace(/index\.html$/, "");
  return `${SITE}/${rel}`;
}

const direct = {};
const viaLp = [];
for (const file of walk("dist")) {
  const raw = fs.readFileSync(file, "utf8");
  const url = urlOf(file);
  // text/plain の<script>(バナー原文)も、そのページが出力する広告なので含める
  for (const m of raw.matchAll(/px\.a8\.net\/svt\/ejp\?a8mat=([0-9A-Z]{6})/g)) {
    const key = m[1];
    (direct[key] ||= new Set()).add(url);
  }
  if (!url.endsWith("/lp/original-print/") && /href="\/lp\/original-print\/"/.test(raw)) viaLp.push(url);
}

for (const [id, name] of Object.entries(PROGRAMS)) {
  console.log(`\n■ ${name}: 広告タグ(アフィリエイトリンク)を出力しているページ`);
  [...(direct[id] ?? [])].sort().forEach((u) => console.log("  " + u));
}
console.log(`\n■ Up-T LP(${SITE}/lp/original-print/)へ内部リンクしているページ`);
viaLp.sort().forEach((u) => console.log("  " + u));

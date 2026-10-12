// 素材ID 1 の広告コードが「リンク文言以外は原文のまま」であることを、ビルド後HTMLで確認する(2026-10-12)。
// 使い方: npm run build の後に node scripts/check-upt-text-ad.cjs
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync("src/data/lp/upt-ads.ts", "utf8");
const m = src.match(/UPT_AD_TEXT_1 = (".*");/);
const original = JSON.parse(m[1]);
const HREF = original.match(/href="([^"]+)"/)[1];
const PIXEL = original.match(/<img[^>]+>/)[0];

function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith(".html")) out.push(p);
  }
  return out;
}

let problems = 0;
for (const file of walk("dist")) {
  const html = fs.readFileSync(file, "utf8").replace(/<script type="text\/plain"[\s\S]*?<\/script>/g, "");
  const links = html.match(/<a href="https:\/\/px\.a8\.net\/svt\/ejp\?a8mat=4BEE12\+5ZJ2EA\+34VM\+BWVTE"[^>]*>[^<]*<\/a>/g) || [];
  if (links.length === 0) continue;
  for (const l of links) {
    const ok = l.includes(`href="${HREF}"`) && l.includes('rel="nofollow"');
    if (!ok) problems++;
    const text = l.replace(/<[^>]+>/g, "");
    console.log(`${ok ? "OK " : "NG "} ${file.replace(/\\/g, "/")}: 「${text}」`);
  }
  const pixels = html.split(PIXEL).length - 1;
  console.log(`   計測画像(1x1)の数: ${pixels} / リンク数: ${links.length}`);
  if (pixels !== links.length) problems++;
}
console.log(problems === 0 ? "問題なし" : `問題あり: ${problems}`);
process.exit(problems === 0 ? 0 : 1);

// 広告タグの重複・欠落を検査する。検査項目は ad-tag-spec.mjs で管理する(構文検査とは別項目)。
// 使い方: npm run build && npm run check:ad-tags
import { AD_TAG_CHECKS } from "./ad-tag-spec.mjs";
import { inlineScripts, listHtml, readHtml } from "./lib.mjs";

const errors = [];
const files = listHtml();
for (const f of files) {
  const html = readHtml(f);
  const inline = inlineScripts(html).map((s) => s.body).join("\n");
  for (const c of AD_TAG_CHECKS) {
    if (c.pages && !c.pages.some((p) => f.split(String.fromCharCode(92)).join("/").endsWith(p))) continue;
    const n = ((c.target === "inline" ? inline : html).match(c.pattern) || []).length;
    if (n !== c.expected) errors.push(`${f}: [${c.id}] ${c.description}: ${n} 回(期待: ${c.expected})`);
  }
}
if (errors.length) {
  console.error(`NG: 広告タグの検査 ${errors.length} 件`);
  for (const e of errors) console.error(" - " + e);
  process.exit(1);
}
console.log(`OK: ${files.length} ページ / 広告タグ検査 ${AD_TAG_CHECKS.length} 項目(重複・欠落なし)`);

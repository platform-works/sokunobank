#!/usr/bin/env node
// 新カテゴリーの requiredKeywords / excludeKeywords を、実際のYahoo!ショッピングAPIの商品名で検証する。
// sample_category.cjs(1クエリ50件・報酬分布の確認用)の次に使う。次の3つを確認できる:
//   1. 除外語が本体を誤って弾いていないか(除外語ごとの件数とサンプル)
//      例: 「ラック」は色名の「ブラック」に部分一致して黒色の本体を大量に誤除外した(プリンターで発生)。
//          「インク」は「インクジェット」に部分一致するため単独では使えない。
//   2. 除外後に消耗品・周辺品が残っていないか(残った商品の名前サンプルと低価格品)
//   3. 検索語の順序・件数・報酬分布(足切りminEstimatedCommissionの影響の目安)
//
// 使い方(プロジェクトルートから):
//   node .claude/skills/add-yahoo-shopping-category/scripts/check_filters.cjs \
//     --queries "レーザー複合機,複合機" --required "プリンタ,複合機" --exclude "互換,トナー,用紙,ラック" [--pages 2] [--show 3]
//
// APIアプリIDは .dev.vars の YAHOO_APP_ID から読む(値は出力しない)。呼び出し回数は クエリ数×ページ数。
// Yahoo!のレート制限は1分30回なので、合計10回を超える指定は避け、連続実行も間隔を空けること
// (制限に達すると取得に失敗し、結果が不完全になる)。

const fs = require("fs");
const path = require("path");

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const list = (s) => (s ? s.split(",").map((x) => x.trim()).filter(Boolean) : []);
const queries = list(arg("queries", ""));
const required = list(arg("required", ""));
const exclude = list(arg("exclude", ""));
const pages = Number(arg("pages", "2"));
const show = Number(arg("show", "3"));

if (queries.length === 0 || required.length === 0) {
  console.error('Usage: node check_filters.cjs --queries "a,b" --required "x,y" [--exclude "p,q"] [--pages 2] [--show 3]');
  process.exit(1);
}
const calls = queries.length * pages;
if (calls > 10) console.error(`警告: API呼び出しが${calls}回になります(レート制限は1分30回)。クエリ数かページ数を減らしてください。`);

const devVarsPath = path.join(process.cwd(), ".dev.vars");
if (!fs.existsSync(devVarsPath)) {
  console.error(`.dev.vars が見つかりません: ${devVarsPath} (プロジェクトルートから実行してください)`);
  process.exit(1);
}
const m = fs.readFileSync(devVarsPath, "utf8").match(/^YAHOO_APP_ID\s*=\s*"?([^"\r\n]+)"?/m);
if (!m) {
  console.error("YAHOO_APP_ID が .dev.vars にありません");
  process.exit(1);
}
const appId = m[1].trim();

async function get(query, start) {
  const u = new URL("https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch");
  const params = { appid: appId, query, in_stock: "true", condition: "new", results: "100", start: String(start) };
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const res = await fetch(u);
  if (!res.ok) throw new Error(`HTTP ${res.status}(レート制限の可能性。1分ほど空けて再実行してください)`);
  return res.json();
}

(async () => {
  const all = new Map();
  for (const q of queries) {
    for (let p = 0; p < pages; p++) {
      const d = await get(q, p * 100 + 1);
      if (p === 0) console.log(`[${q}] 総ヒット ${d.totalResultsAvailable}`);
      for (const h of d.hits || []) all.set(h.code, h);
      if ((d.hits || []).length < 100) break;
    }
  }
  const hits = [...all.values()];
  const passReq = hits.filter((h) => required.some((k) => h.name.includes(k)));
  const excluded = passReq.filter((h) => exclude.some((k) => h.name.includes(k)));
  const kept = passReq.filter((h) => !exclude.some((k) => h.name.includes(k)));
  console.log(`\n取得${hits.length}件 / 必須語を通過${passReq.length} / 除外${excluded.length} / 残り${kept.length}`);

  console.log("\n===== 除外語ごとの件数とサンプル(本体が混ざっていないか目視で確認すること)");
  const by = {};
  for (const h of excluded) for (const k of exclude) if (h.name.includes(k)) (by[k] = by[k] || []).push(h);
  for (const [k, arr] of Object.entries(by).sort((a, b) => b[1].length - a[1].length)) {
    const share = Math.round((arr.length / Math.max(1, excluded.length)) * 100);
    const warn = arr.length >= 8 && share >= 25 ? "  ← 件数が多い語。一般語・色名・仕様語に部分一致していないか要確認" : "";
    console.log(`■ ${k}  ${arr.length}件${warn}`);
    for (const h of arr.slice(0, show)) console.log(`     ${h.price}円 ${h.name.replace(/【[^】]*】/g, "").slice(0, 72)}`);
  }

  console.log("\n===== 残った商品のうち、本体らしくないもの(3,000円未満)");
  const cheap = kept.filter((h) => h.price < 3000);
  if (cheap.length === 0) console.log("(なし)");
  for (const h of cheap.slice(0, 15)) console.log(`${h.price}円 ${h.name.replace(/【[^】]*】/g, "").slice(0, 72)}`);

  console.log("\n===== 残った商品の想定報酬(price × affiliateRate / 100)");
  const com = kept.map((h) => (h.price || 0) * ((h.affiliateRate || 0) / 100)).sort((a, b) => a - b);
  const pct = (p) => Math.round(com[Math.floor(com.length * p)] || 0);
  console.log(`中央値${pct(0.5)} / p75=${pct(0.75)} / p90=${pct(0.9)} / 最大${Math.round(com[com.length - 1] || 0)}円`);
  for (const t of [100, 200, 300, 500]) console.log(`  ${t}円以上: ${com.filter((c) => c >= t).length}件`);

  console.log("\n===== 残った商品の名前サンプル(等間隔30件)");
  const step = Math.max(1, Math.floor(kept.length / 30));
  for (let i = 0; i < kept.length; i += step) console.log(`${kept[i].price}円 ${kept[i].name.replace(/【[^】]*】/g, "").slice(0, 80)}`);
})().catch((e) => {
  console.error("失敗:", e.message);
  process.exit(1);
});

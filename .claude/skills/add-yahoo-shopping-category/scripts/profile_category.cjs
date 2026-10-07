#!/usr/bin/env node
// 候補カテゴリを「作る前に」評価する。Yahoo!ショッピングAPIで商品を取得して、次を一覧にする:
//   - 検索語ごとの総ヒット数、ユニーク商品数、価格の中央値
//   - 想定報酬(price × affiliateRate / 100)の分布と、足切り額ごとに残る割合(報酬が低いカテゴリかを早く判断する)
//   - 長納期表記の件数、ジャンル・ブランド・商品名の頻出語(除外語・必須語の候補探し、メーカーが突出しているかの判断)
//   - 商品名サンプル(消耗品・周辺品・無関係な商品が混ざっていないか目視する)
//
// 使い方(プロジェクトルートから):
//   node .claude/skills/add-yahoo-shopping-category/scripts/profile_category.cjs --queries "ホワイトボード,ホワイトボード 脚付き" [--pages 1]
//
// APIアプリIDは .dev.vars の YAHOO_APP_ID から読む(値は出力しない)。呼び出し回数は クエリ数×ページ数。
// レート制限は1分30回なので、合計10回を超える指定は避け、続けて実行するときは間隔を空けること。
// 除外語・必須語の検証は check_filters.cjs、東京宛ての実際の件数・足切りの影響は measure_candidates.cjs を使う。

const fs = require("fs");
const path = require("path");

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const queries = (arg("queries", "") || "").split(",").map((x) => x.trim()).filter(Boolean);
const pages = Number(arg("pages", "1"));
if (queries.length === 0) {
  console.error('Usage: node profile_category.cjs --queries "a,b" [--pages 1]');
  process.exit(1);
}
if (queries.length * pages > 10) console.error(`警告: API呼び出しが${queries.length * pages}回になります(レート制限は1分30回)。`);

const devVars = path.join(process.cwd(), ".dev.vars");
if (!fs.existsSync(devVars)) {
  console.error(`.dev.vars が見つかりません: ${devVars} (プロジェクトルートから実行してください)`);
  process.exit(1);
}
const m = fs.readFileSync(devVars, "utf8").match(/^YAHOO_APP_ID\s*=\s*"?([^"\r\n]+)"?/m);
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
const top = (obj, n) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);

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
  console.log(`\nユニーク商品 ${hits.length}件`);
  const prices = hits.map((h) => h.price || 0).sort((a, b) => a - b);
  console.log(`価格の中央値 ${prices[Math.floor(prices.length / 2)]}円`);

  const com = hits.map((h) => (h.price || 0) * ((h.affiliateRate || 0) / 100)).sort((a, b) => a - b);
  const pct = (p) => Math.round(com[Math.floor(com.length * p)] || 0);
  console.log(`\n===== 想定報酬(円): 中央値${pct(0.5)} / p75=${pct(0.75)} / p90=${pct(0.9)} / 最大${Math.round(com[com.length - 1] || 0)}`);
  for (const t of [50, 100, 200, 300, 500]) {
    const n = com.filter((c) => c >= t).length;
    console.log(`  ${String(t).padStart(3)}円以上: ${n}件 (${Math.round((n / Math.max(1, com.length)) * 100)}%)`);
  }
  console.log("  → 500円以上が1割未満なら低報酬カテゴリー。足切り(minEstimatedCommission)を下げる必要がある");
  const lead = hits.filter((h) => /お取り寄せ|取り寄せ|予約|入荷|受注生産|メーカー取寄/.test(`${h.headLine} ${h.description}`)).length;
  console.log(`\n長納期表記のある商品: ${lead}件`);

  const genre = {}, brand = {}, token = {};
  for (const h of hits) {
    const g = `${h.genreCategory && h.genreCategory.id}:${h.genreCategory && h.genreCategory.name}`;
    genre[g] = (genre[g] || 0) + 1;
    const b = (h.brand && h.brand.name) || "(なし)";
    brand[b] = (brand[b] || 0) + 1;
    for (const t of new Set(h.name.replace(/【[^】]*】/g, "").split(/[\s　/／,、・()（）\[\]［］「」『』|｜+*★☆※]+/))) {
      if (t.length >= 2 && t.length <= 12) token[t] = (token[t] || 0) + 1;
    }
  }
  console.log("\n===== ジャンル上位(同名の別ジャンル・無関係なジャンルが多くないか)");
  top(genre, 8).forEach(([k, v]) => console.log(`  ${v}件  ${k}`));
  console.log("\n===== ブランド上位(メーカーが突出していればブランドセクション候補。ストアブランドばかりなら付けない)");
  top(brand, 10).forEach(([k, v]) => console.log(`  ${v}件  ${k}`));
  console.log("\n===== 商品名の頻出語(除外語・必須語の候補。ただし本体にも併記される語は除外語にしないこと)");
  console.log("  " + top(token, 40).map(([k, v]) => `${k}(${v})`).join(" "));

  console.log("\n===== 商品名サンプル(等間隔35件。消耗品・周辺品・無関係な商品が混ざっていないか目視)");
  const step = Math.max(1, Math.floor(hits.length / 35));
  for (let i = 0; i < hits.length; i += step) {
    const h = hits[i];
    console.log(`${h.price}円 率${h.affiliateRate} ${h.name.replace(/【[^】]*】/g, "").slice(0, 78)}`);
  }
})().catch((e) => {
  console.error("失敗:", e.message);
  process.exit(1);
});

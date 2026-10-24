// Up-T LPの商品カテゴリー一覧(リスティング・回遊LP・記事内リンク用)をCSVに出力する。
// 使い方: node scripts/export-lp-items.mjs   → docs/lp-original-print-items.csv
// 列: item_id / 商品名 / グループ / 法人向け / LP URL(?item=) / 広告用UTM付きURLの例 / 流入キーワードの候補
import fs from "node:fs";
import { PRODUCTS, PRODUCT_GROUPS } from "../src/data/lp/original-print-products.ts";

const SITE = "https://sokunobank.com";
const groupLabel = Object.fromEntries(PRODUCT_GROUPS.map((g) => [g.id, g.label]));
const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;

const rows = [["item_id", "商品名", "グループ", "法人向け", "LP URL", "広告用URL(例)", "流入キーワード候補(部分一致)"]];
for (const p of PRODUCTS.filter((x) => x.publish)) {
  const lp = `${SITE}/lp/original-print/?item=${p.id}`;
  const ad = `${lp}&utm_source=yahoo&utm_medium=cpc&utm_campaign=<campaign>&utm_content=ag_${p.id}`;
  rows.push([p.id, p.name, groupLabel[p.group], p.corporate ? "○" : "", lp, ad, p.keywords.join(" / ")]);
}
const csv = "﻿" + rows.map((r) => r.map(esc).join(",")).join("\r\n") + "\r\n";
fs.mkdirSync("docs", { recursive: true });
fs.writeFileSync("docs/lp-original-print-items.csv", csv);
console.log(`出力: docs/lp-original-print-items.csv(${rows.length - 1}商品、法人向け ${rows.filter((r) => r[3] === "○").length})`);

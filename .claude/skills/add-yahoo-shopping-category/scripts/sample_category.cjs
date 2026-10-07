#!/usr/bin/env node
// Samples live Yahoo!ショッピング itemSearch results for one or more queries and prints
// the data needed to calibrate a new commerce category's config:
//   - estimated commission (price * affiliateRate / 100) distribution (median/max)
//   - a sample of product names (to sanity-check requiredKeywords)
//   - any hits whose description/headLine mentions long-lead-time language
//
// Usage (from the project root):
//   node .claude/skills/add-yahoo-shopping-category/scripts/sample_category.js "query one" "query two"
//
// Reads YAHOO_APP_ID from .dev.vars in the current directory (must be run from the
// sokunobank project root, same as `npm run build`).

const fs = require("fs");
const path = require("path");

const queries = process.argv.slice(2);
if (queries.length === 0) {
  console.error('Usage: node sample_category.js "query one" "query two" ...');
  process.exit(1);
}

const devVarsPath = path.join(process.cwd(), ".dev.vars");
if (!fs.existsSync(devVarsPath)) {
  console.error(`Could not find .dev.vars at ${devVarsPath} — run this from the sokunobank project root.`);
  process.exit(1);
}
const devVars = fs.readFileSync(devVarsPath, "utf8");
const match = devVars.match(/YAHOO_APP_ID=(.*)/);
if (!match) {
  console.error("YAHOO_APP_ID not found in .dev.vars");
  process.exit(1);
}
const appId = match[1].trim();

const LEAD_TIME_PATTERN = /お取り寄せ|取り寄せ|予約|入荷|受注生産|メーカー取寄/;

async function fetchQuery(query) {
  const url =
    "https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch" +
    `?appid=${appId}&query=${encodeURIComponent(query)}&results=50&in_stock=true&condition=new`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.hits) {
    console.error(`No hits for query "${query}":`, JSON.stringify(data).slice(0, 300));
    return [];
  }
  return data.hits;
}

(async () => {
  const allHits = (await Promise.all(queries.map(fetchQuery))).flat();
  console.log(`\nTotal hits across ${queries.length} quer${queries.length === 1 ? "y" : "ies"}: ${allHits.length}\n`);

  const commissions = allHits
    .map((h) => ({
      name: h.name,
      price: h.price,
      rate: h.affiliateRate || 0,
      commission: (h.price || 0) * ((h.affiliateRate || 0) / 100),
    }))
    .sort((a, b) => b.commission - a.commission);

  if (commissions.length > 0) {
    const median = commissions[Math.floor(commissions.length / 2)].commission;
    const max = commissions[0].commission;
    console.log("=== Estimated commission (price * affiliateRate / 100) ===");
    console.log(`median: ${median.toFixed(0)}円   max: ${max.toFixed(0)}円`);
    console.log(
      `Suggested revenueScoreReferenceMax: somewhere near the max (${Math.round(max)}) — NOT an arbitrary round number like 10000 unless the sampled max genuinely supports it.\n`
    );
    console.log("Top 5 by commission:");
    commissions.slice(0, 5).forEach((c) => console.log(`  ${c.commission.toFixed(0)}円 (${c.rate}%, ¥${c.price})  ${c.name.slice(0, 50)}`));
    console.log();
  }

  const leadTimeHits = allHits.filter(
    (h) => LEAD_TIME_PATTERN.test(h.description || "") || LEAD_TIME_PATTERN.test(h.headLine || "")
  );
  console.log(`=== Long-lead-time hits found (${leadTimeHits.length}) — confirm these get excluded ===`);
  leadTimeHits.slice(0, 10).forEach((h) => console.log(`  ${h.name.slice(0, 50)}  |  ${(h.description || "").slice(0, 60)}`));
  console.log();

  console.log("=== Sample of product names (check your requiredKeywords against these) ===");
  allHits.slice(0, 20).forEach((h) => console.log(`  ${h.name.slice(0, 70)}`));
})();

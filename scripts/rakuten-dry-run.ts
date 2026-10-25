// 楽天市場API DRY_RUN検証スクリプト(読み取りのみ。DB・本番への書き込み、デプロイは一切しない)
// 実行: npx vite-node scripts/rakuten-dry-run.ts
// 認証情報は .dev.vars から読む。値は出力しない。
import { readFileSync } from "node:fs";
import { searchRakuten, isTrustedRakutenUrl } from "../src/lib/rakuten/client";
import { formatRakutenRating, matchYahooRakuten } from "../src/lib/rakuten/match";
import type { RankableProduct } from "../src/lib/commerce/types";

const env: Record<string, string> = {};
for (const line of readFileSync(".dev.vars", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const CATEGORIES = [
  { name: "発電機", keyword: "インバーター発電機" },
  { name: "ドライヤー", keyword: "ヘアドライヤー" },
  { name: "オフィスチェア", keyword: "オフィスチェア" },
];

async function yahooSample(keyword: string): Promise<RankableProduct[]> {
  if (!env.YAHOO_APP_ID) return [];
  const u = new URL("https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch");
  u.searchParams.set("appid", env.YAHOO_APP_ID);
  u.searchParams.set("query", keyword);
  u.searchParams.set("in_stock", "true");
  u.searchParams.set("results", "30");
  const res = await fetch(u);
  if (!res.ok) return [];
  const data = (await res.json()) as { hits?: any[] };
  return (data.hits ?? []).map((h) => ({
    code: h.code, janCode: h.janCode || null, name: h.name, descriptionText: "", url: h.url, image: h.image?.medium ?? "",
    price: h.price ?? 0, reviewRate: h.review?.rate ?? 0, reviewCount: h.review?.count ?? 0, storeName: "", storeIsBestSeller: false,
    storeReviewRate: 0, storeReviewCount: 0, affiliateRate: 0, deliveryDay: null, brand: null,
  }));
}

if (!env.RAKUTEN_APPLICATION_ID || !env.RAKUTEN_ACCESS_KEY) {
  console.log("RAKUTEN_APPLICATION_ID / RAKUTEN_ACCESS_KEY が .dev.vars に未設定のため、実APIの検証はスキップ");
  process.exit(0);
}

for (const c of CATEGORIES) {
  try {
    const items = await searchRakuten(env, { keyword: c.keyword, hits: 30 });
    const yahoo = await yahooSample(c.keyword);
    const matches = matchYahooRakuten(yahoo, items);
    const n = (f: (p: (typeof items)[number]) => unknown) => items.filter(f).length;
    console.log(
      `${c.name}: 楽天${items.length}件 / 価格${n((p) => p.price !== null)} 画像${n((p) => p.imageUrl)} 評価${n((p) => p.reviewAverage !== null)} ` +
        `JAN${n((p) => p.janCode)} 型番${n((p) => p.modelNumber)} URL信頼${n((p) => isTrustedRakutenUrl(p.itemUrl))} アフィリURL${n((p) => p.affiliateUrl)} / ` +
        `Yahoo${yahoo.length}件 一致候補${matches.length}(JAN${matches.filter((m) => m.basis === "jan").length})`
    );
    if (items[0]) console.log("  例:", items[0].name.slice(0, 40), items[0].price, formatRakutenRating(items[0]) ?? "評価なし");
  } catch (e) {
    console.log(`${c.name}: 失敗 ${e instanceof Error ? e.message : e}`);
  }
}

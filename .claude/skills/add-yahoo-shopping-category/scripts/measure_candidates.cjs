#!/usr/bin/env node
// 実際の fetchCandidates(本番と同じ取得・絞り込みロジック)を使い、東京宛て(area=13・翌々日まで)で
// 「検索語の順序・取得目標件数・報酬の足切り」の組み合わせごとに、最終件数と構成を測る。
// カテゴリーの設定値(searchQueries / candidatesTargetCount / minEstimatedCommission /
// revenueScoreReferenceMax)を、勘ではなく実測で決めるためのスクリプト。
//
// 使い方(プロジェクトルートから):
//   node .claude/skills/add-yahoo-shopping-category/scripts/measure_candidates.cjs \
//     --queries "スチール書庫,オフィスデスク" --required "デスク,書庫" --exclude "チェア,椅子" \
//     --target 100,200 --min none,150 [--area 13] [--delivery 2] [--top 4] [--tag "書庫|キャビネット"]
//
//   --target / --min はカンマ区切りで複数指定でき、全組み合わせを測る。--min の none は足切りなし。
//   --tag は正規表現。最終候補のうちその名前に一致する件数も表示する(複数品目を1カテゴリーにするときの
//     バランス確認用。例: 書庫系 vs デスク系)。
//   --top は報酬の高い順に表示する件数(外れ値の正体確認用)。
//
// 注意:
//   - 1回の測定でAPIをクエリ数×最大3ページ(本番と同じ)呼ぶ。レート制限(1分30回)に近づくと、
//     自動で60秒待ってから続ける。組み合わせを増やしすぎないこと。
//   - 内部で node_modules の esbuild(astro/vite の依存)を使い、fetchCandidates.ts を一時ファイルへバンドルする。
//   - APIアプリIDは .dev.vars の YAHOO_APP_ID から読む(値は出力しない)。

const fs = require("fs");
const os = require("os");
const path = require("path");
const { pathToFileURL } = require("url");

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const list = (s) => (s ? s.split(",").map((x) => x.trim()).filter(Boolean) : []);
const queries = list(arg("queries", ""));
const required = list(arg("required", ""));
const exclude = list(arg("exclude", ""));
const targets = list(arg("target", "100")).map(Number);
const mins = list(arg("min", "none")).map((x) => (x === "none" ? undefined : Number(x)));
const area = arg("area", "13");
const delivery = Number(arg("delivery", "2"));
const topN = Number(arg("top", "4"));
const tag = arg("tag", "") ? new RegExp(arg("tag", "")) : null;

if (queries.length === 0 || required.length === 0) {
  console.error('Usage: node measure_candidates.cjs --queries "a,b" --required "x" [--exclude "p"] [--target 100,200] [--min none,200] [--area 13] [--tag "regex"]');
  process.exit(1);
}

const devVars = path.join(process.cwd(), ".dev.vars");
const m = fs.existsSync(devVars) && fs.readFileSync(devVars, "utf8").match(/^YAHOO_APP_ID\s*=\s*"?([^"\r\n]+)"?/m);
if (!m) {
  console.error("YAHOO_APP_ID が .dev.vars から読めません(プロジェクトルートから実行してください)");
  process.exit(1);
}
const appId = m[1].trim();

const src = path.join(process.cwd(), "src", "lib", "commerce", "fetchCandidates.ts");
const out = path.join(os.tmpdir(), `fetchCandidates.measure.${process.pid}.mjs`);
try {
  require(path.join(process.cwd(), "node_modules", "esbuild")).buildSync({
    entryPoints: [src],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: out,
    logLevel: "error",
  });
} catch (e) {
  console.error("esbuild に失敗しました(npm install 済みか確認してください):", e.message);
  process.exit(1);
}

let calls = 0;
let windowCalls = 0;
const realFetch = globalThis.fetch;
globalThis.fetch = (...a) => {
  calls++;
  windowCalls++;
  return realFetch(...a);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const { fetchCandidates } = await import(pathToFileURL(out).href);
  for (const target of targets) {
    for (const min of mins) {
      if (windowCalls >= 18) {
        console.log("  (レート制限を避けるため60秒待機)");
        await sleep(60000);
        windowCalls = 0;
      }
      calls = 0;
      let res;
      try {
        res = await fetchCandidates({
          appId,
          queries,
          area,
          deliveryDay: delivery,
          requiredKeywords: required,
          excludeKeywords: exclude,
          longLeadTimeExcludeKeywords: ["お取り寄せ", "取り寄せ", "予約商品", "入荷次第", "入荷未定", "受注生産", "メーカー取寄"],
          minEstimatedCommission: min,
          targetCount: target,
          maxPagesPerQuery: 3,
        });
      } catch (e) {
        console.log(`target${target} 足切り${min === undefined ? "なし" : min}: 失敗(${e.message})。1分ほど空けて再実行してください`);
        continue;
      }
      const c = res.candidates;
      const comm = c.map((p) => (p.price * p.affiliateRate) / 100).sort((a, b2) => a - b2);
      const q = (x) => Math.round(comm[Math.floor(comm.length * x)] || 0);
      const tagged = tag ? c.filter((p) => tag.test(p.name)).length : null;
      console.log(
        `目標${target} / 足切り${min === undefined ? "なし" : min}円: 最終${c.length}件 (明日到着対象${c.filter((p) => p.deliveryDay === 1).length}` +
          `${tagged === null ? "" : ` / --tag一致${tagged}・それ以外${c.length - tagged}`}) ` +
          `API${calls}回 / 報酬 中央値${q(0.5)} p75=${q(0.75)} p90=${q(0.9)} 最大${Math.round(comm[comm.length - 1] || 0)}円 ` +
          `[取得${res.diagnostics.apiFetched} 除外後${res.diagnostics.afterExcludeKeywords}]`
      );
      if (topN > 0) {
        [...c]
          .sort((a, b2) => b2.price * b2.affiliateRate - a.price * a.affiliateRate)
          .slice(0, topN)
          .forEach((p) => console.log(`    報酬上位: ${Math.round((p.price * p.affiliateRate) / 100)}円 (${p.price}円 率${p.affiliateRate}) ${p.name.replace(/【[^】]*】/g, "").slice(0, 46)}`));
      }
    }
  }
  fs.rmSync(out, { force: true });
  console.log("\n判断の目安: 報酬の最大が通常品の p90 の数倍に跳ね上がる場合は外れ値(別種の高額機器など)。正体を確認し、別物なら除外語に入れる。revenueScoreReferenceMax は外れ値を除いた最大付近にする。");
})().catch((e) => {
  console.error("失敗:", e.message);
  process.exit(1);
});

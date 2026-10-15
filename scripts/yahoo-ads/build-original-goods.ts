/**
 * 即納バンク: オリジナルグッズ(アイテム別・法人需要。Up-T 送客LP)向け Yahoo!検索広告のインポート用ファイルを生成・検証する。
 * 実行: npm run ads:goods:build(esbuild でバンドルして node で実行)。
 * 生成先: docs/ads/original-goods/generated/ 。広告管理ツールへのアップロード・配信開始は行わない(全行オフ)。
 * 既存キャンペーン(オリジナルTシャツ)とは別の、新規キャンペーンとして取り込む。
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildAll, type BuildContext } from "./build-original-tshirt";
import { GOODS_ACCOUNT_ID, GOODS_CAMPAIGN_NAME, GOODS_SETTINGS, ORIGINAL_GOODS } from "./original-goods/master";

export const GOODS_CONTEXT: BuildContext = {
  settings: GOODS_SETTINGS,
  campaignName: GOODS_CAMPAIGN_NAME,
  accountId: GOODS_ACCOUNT_ID,
  title: "オリジナルグッズ(アイテム別・法人)",
  dir: "original-goods",
  masterPath: "scripts/yahoo-ads/original-goods/master.ts",
  itemNote: "/lp/original-print/?item=<商品ID>&utm_source=yahoo…（広告グループごとに item=<商品ID>。utm_content は広告グループ名）",
};

export function buildGoods() {
  return buildAll(ORIGINAL_GOODS, GOODS_CONTEXT);
}

function main() {
  const out = join(process.cwd(), "docs", "ads", GOODS_CONTEXT.dir, "generated");
  const { files, issues } = buildGoods();
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  for (const f of files) writeFileSync(join(out, f.name), f.content);
  const errors = issues.filter((i) => i.level === "error");
  console.log(`生成: ${out}（${files.length}ファイル）`);
  console.log(`検証: エラー ${errors.length} / 警告 ${issues.length - errors.length}`);
  for (const i of issues) console.log(`  [${i.level}] ${i.code} ${i.where}: ${i.message}`);
  process.exit(errors.length ? 1 : 0);
}

// テストから import されたときは、実行しない
if (process.argv[1] && /build-original-goods/.test(process.argv[1])) main();

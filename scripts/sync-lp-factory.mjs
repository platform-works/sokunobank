/**
 * Affiliate LP Factory(別リポジトリ)の「公開済みLP」だけを、即納バンクのビルドへ取り込む(手動コピー不要)。
 *
 *   npm run lp:sync            … ビルド前に実行(cf:deploy / cf:preview には組み込み済み)
 *   LP_FACTORY_DIR=<path>      … ファクトリーの場所(既定: ../affiliate-lp-factory)
 *
 * 仕組み:
 *   1. ファクトリーで `npm run build` → `export-lp.ts` を実行(公開済み・公開可能と判定されたLPだけが出力される)
 *   2. 出力を public/lp/<ジャンル>/ と public/_lp-assets/ に配置(これらは .gitignore 済みの生成物)
 *   3. トップの「サービス選びの確認ガイド」用 src/data/generated/lp-guide.json を生成(.gitignore 済み)
 *
 * 公開済みLPが0本、またはファクトリーが無い場合は、生成物を空にするだけで何も公開されない(安全側)。
 * 今後LPを追加する運用: ファクトリーでLPを作り、ステータスを published にする → 次回のデプロイで自動反映。
 * このスクリプトは、既存の public/lp/ 以下の他のファイル(手書きのLP等)は削除しない(同期した2階層のディレクトリだけ管理)。
 */
import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = process.cwd();
const factory = resolve(root, process.env.LP_FACTORY_DIR ?? "../affiliate-lp-factory");
const genDir = join(root, "src", "data", "generated");
const guideFile = join(genDir, "lp-guide.json");
const stateFile = join(genDir, "lp-sync-state.json");
const publicLp = join(root, "public", "lp");
const publicAssets = join(root, "public", "_lp-assets");

mkdirSync(genDir, { recursive: true });

// 前回同期した生成物だけを削除する(手書きの public/lp/* は触らない)
function cleanPrevious() {
  if (existsSync(stateFile)) {
    try {
      const prev = JSON.parse(readFileSync(stateFile, "utf8"));
      for (const dir of prev.dirs ?? []) rmSync(join(publicLp, dir), { recursive: true, force: true });
    } catch {
      /* 壊れていれば無視 */
    }
  }
  rmSync(publicAssets, { recursive: true, force: true });
}

function writeEmpty(reason) {
  cleanPrevious();
  writeFileSync(guideFile, JSON.stringify({ generatedBy: "sync-lp-factory", genres: [] }, null, 2));
  writeFileSync(stateFile, JSON.stringify({ dirs: [] }, null, 2));
  console.log(`[lp:sync] 取り込むLPはありません(${reason})。`);
}

if (!existsSync(join(factory, "package.json"))) {
  writeEmpty(`ファクトリーが見つからない: ${factory}`);
  process.exit(0);
}

const out = join(factory, "dist-export");
try {
  execSync("npm run build", { cwd: factory, stdio: "pipe" });
  execSync(`npx tsx scripts/export-lp.ts --out dist-export`, { cwd: factory, stdio: "pipe" });
} catch (e) {
  console.error("[lp:sync] ファクトリーのビルド/書き出しに失敗しました。デプロイを中止します。");
  console.error(String(e.stdout ?? "") + String(e.stderr ?? ""));
  process.exit(1);
}

const guide = JSON.parse(readFileSync(join(out, "lp-guide.json"), "utf8"));
const lpRoot = join(out, "lp");
const genres = existsSync(lpRoot) ? readdirSync(lpRoot) : [];
if (genres.length === 0 || guide.genres.length === 0) {
  writeEmpty("公開済みのLPが0本");
  process.exit(0);
}

cleanPrevious();
mkdirSync(publicLp, { recursive: true });
const dirs = [];
for (const g of genres) {
  // 既存のファイル/ディレクトリと衝突する場合は中止(上書きしない)
  const dest = join(publicLp, g);
  if (existsSync(dest)) {
    console.error(`[lp:sync] public/lp/${g} が既に存在します(同期対象ではない)。衝突のため中止します。`);
    process.exit(1);
  }
  cpSync(join(lpRoot, g), dest, { recursive: true });
  dirs.push(g);
}
if (existsSync(join(out, "_lp-assets"))) cpSync(join(out, "_lp-assets"), publicAssets, { recursive: true });
writeFileSync(guideFile, JSON.stringify(guide, null, 2));
writeFileSync(stateFile, JSON.stringify({ dirs }, null, 2));
console.log(`[lp:sync] 取り込み: ${dirs.length}ジャンル / ${guide.genres.reduce((n, g) => n + g.lps.length, 0)}本のLP`);

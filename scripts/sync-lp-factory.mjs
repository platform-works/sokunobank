/**
 * Affiliate LP Factory(別リポジトリ)の「公開済みLP」だけを、即納バンクのビルドへ取り込む(手動コピー不要)。
 *
 *   npm run lp:sync            … ビルド前に実行(cf:deploy / cf:preview には組み込み済み)
 *   LP_FACTORY_DIR=<path>      … ファクトリーの場所(既定: ../affiliate-lp-factory)
 *   LP_FACTORY_REF=<ref>       … 取り込むコミット(既定: HEAD)
 *
 * 仕組み:
 *   1. ファクトリーの「コミット済みの状態(LP_FACTORY_REF、既定 HEAD)」を一時 worktree に取り出し、`npm run build` → `export-lp.ts` を実行
 *      (公開済み・公開可能と判定されたLPだけが出力される)。未コミットの変更(公開承認前の編集・下書き)は取り込まれない
 *   2. 出力を public/lp/<ジャンル>/ と public/_lp-assets/ に配置(これらは .gitignore 済みの生成物)
 *   3. トップ用 src/data/generated/lp-guide.json を生成(.gitignore 済み)
 *
 * 公開済みLPが0本、またはファクトリーが無ければ、生成物を空にするだけで何も公開されない(安全側)。
 * ファクトリーのコミットが取り出せない場合は、未コミットの状態にフォールバックせず中止する。
 * このスクリプトは、既存の public/lp/ 以下の他のファイル(手書きのLP等)は削除しない(同期した2階層のディレクトリだけ管理)。
 */
import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = process.cwd();
const factory = resolve(root, process.env.LP_FACTORY_DIR ?? "../affiliate-lp-factory");
const ref = process.env.LP_FACTORY_REF ?? "HEAD";
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

const sh = (cmd, cwd) => execSync(cmd, { cwd, stdio: "pipe", encoding: "utf8" });

let dirty = "";
try {
  dirty = sh("git status --porcelain", factory).trim();
} catch {
  console.error(`[lp:sync] ファクトリーがgit管理下ではありません: ${factory}。コミット済みの状態を特定できないため中止します。`);
  process.exit(1);
}

const tmp = mkdtempSync(join(tmpdir(), "lp-factory-"));
const wt = join(tmp, "wt");

function cleanupWorktree() {
  try {
    rmSync(join(wt, "node_modules"), { recursive: true, force: true });
  } catch {
    /* ignore */
  }
  try {
    sh(`git worktree remove --force "${wt}"`, factory);
  } catch {
    /* ignore */
  }
  rmSync(tmp, { recursive: true, force: true });
}

try {
  sh(`git worktree add --detach "${wt}" ${ref}`, factory);
} catch (e) {
  console.error(`[lp:sync] ファクトリーのコミット(${ref})を取り出せません。未コミットの状態は使わず、中止します。`);
  console.error(String(e.stderr ?? e));
  rmSync(tmp, { recursive: true, force: true });
  process.exit(1);
}
if (dirty) console.warn(`[lp:sync] 警告: ファクトリーに未コミットの変更があります。取り込むのは ${ref} のコミット済みの状態だけです。\n${dirty.split("\n").slice(0, 8).join("\n")}`);

// 依存(node_modules)は、元のファクトリーのものを共有する(ジャンクション)
try {
  symlinkSync(join(factory, "node_modules"), join(wt, "node_modules"), "junction");
} catch (e) {
  console.error("[lp:sync] node_modules の共有に失敗: " + e.message);
  cleanupWorktree();
  process.exit(1);
}

const out = join(wt, "dist-export");
try {
  execSync("npm run build", { cwd: wt, stdio: "pipe" });
  execSync("npx tsx scripts/export-lp.ts --out dist-export", { cwd: wt, stdio: "pipe" });
} catch (e) {
  console.error("[lp:sync] ファクトリーのビルド/書き出しに失敗しました。デプロイを中止します。");
  console.error(String(e.stdout ?? "") + String(e.stderr ?? ""));
  cleanupWorktree();
  process.exit(1);
}

const guide = JSON.parse(readFileSync(join(out, "lp-guide.json"), "utf8"));
const lpRoot = join(out, "lp");
const genres = existsSync(lpRoot) ? readdirSync(lpRoot) : [];
if (genres.length === 0 || guide.genres.length === 0) {
  cleanupWorktree();
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
    cleanupWorktree();
    process.exit(1);
  }
  cpSync(join(lpRoot, g), dest, { recursive: true });
  dirs.push(g);
}
if (existsSync(join(out, "_lp-assets"))) cpSync(join(out, "_lp-assets"), publicAssets, { recursive: true });
writeFileSync(guideFile, JSON.stringify(guide, null, 2));
writeFileSync(stateFile, JSON.stringify({ dirs }, null, 2));
cleanupWorktree();
console.log(`[lp:sync] 取り込み(${ref}): ${dirs.length}ジャンル / ${guide.genres.reduce((n, g) => n + g.lps.length, 0)}本のLP${dirty ? "(ファクトリーに未コミットの変更あり・無視)" : ""}`);

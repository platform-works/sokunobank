/**
 * 本番デプロイ前の隔離検証。実際のデプロイ・書き込みは一切しない。
 *
 *   node scripts/verify-clean-deploy.mjs [--baseline <commit>] [--factory <dir>] [--sim-publish LP-WTR-FAM,...] [--report <file>]
 *
 * やること:
 *   1. 「いま本番に出ているコミット(--baseline、既定 8a6b50d)」と「コミット済みのHEAD」を、それぞれ別々の一時 worktree でビルドする
 *      (作業ツリーの未コミットファイル=旧 /lp/affiliate/ などは、一切含まれない)
 *   2. dist のファイルを1つずつ比較し、本番との差分(追加・変更・削除)を出す
 *   3. 次を検査する: 未コミットLPの混入なし/robots.txt 不変/既存コンテンツ(UP-T・DM・印刷・commerce)が不変/
 *      公開済みLPのindex可否・canonical・sitemap・計測タグ・トップのリンク/下書きLPの非混入
 *   --sim-publish: ファクトリーの作業ツリーをコピーした「模擬」で、指定LPを公開済みにして上記を検査する(本物のデータは変更しない)
 */
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";

const root = process.cwd();
const args = process.argv.slice(2);
const opt = (name, dflt) => (args.includes(name) ? args[args.indexOf(name) + 1] : dflt);
const baseline = opt("--baseline", "8a6b50d");
const factoryDir = resolve(root, opt("--factory", process.env.LP_FACTORY_DIR ?? "../affiliate-lp-factory"));
const simPublish = (opt("--sim-publish", "") || "").split(",").filter(Boolean);
const reportPath = opt("--report", "");
// 実データでの公開検証用: --expect は公開されているべきLP、--expect-cta はA8タグが1つ出るべきLP、--absent は出てはいけないLP(カンマ区切りのパス)
const csv = (n) => (opt(n, "") || "").split(",").filter(Boolean);
const expectPaths = csv("--expect");
const expectCta = csv("--expect-cta");
const absentPaths = csv("--absent");
// 意図して追加する、LP以外の新規ページ(例: guides/xxx/)。--allow-add は公開されるファイルのパスの先頭(カンマ区切り。先頭の / は不要)
const allowAdd = csv("--allow-add").map((p) => p.replace(/^\//, ""));

const sh = (cmd, cwd, env = {}) => execSync(cmd, { cwd, stdio: "pipe", encoding: "utf8", env: { ...process.env, ...env }, maxBuffer: 64 * 1024 * 1024 });
const tmp = mkdtempSync(join(tmpdir(), "sk-verify-"));
const cleanups = [];
const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok, detail });

function worktree(commit, label) {
  const wt = join(tmp, label);
  sh(`git worktree add --detach "${wt}" ${commit}`, root);
  symlinkSync(join(root, "node_modules"), join(wt, "node_modules"), "junction");
  cleanups.push(() => {
    try { rmSync(join(wt, "node_modules"), { recursive: true, force: true }); } catch { /* ignore */ }
    try { sh(`git worktree remove --force "${wt}"`, root); } catch { /* ignore */ }
  });
  return wt;
}

function snapshot(dist) {
  const m = new Map();
  const walk = (d) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else {
        const rel = p.slice(dist.length + 1).split(sep).join("/");
        m.set(rel, createHash("sha256").update(readFileSync(p)).digest("hex"));
      }
    }
  };
  walk(dist);
  return m;
}

/** ファクトリーの作業ツリーを複製し、指定LPを「公開済み」にした模擬リポジトリを作る */
function makeSimFactory(lpIds) {
  const dir = join(tmp, "factory-sim");
  mkdirSync(dir, { recursive: true });
  cpSync(factoryDir, dir, { recursive: true, filter: (src) => !/[\\/](node_modules|dist|dist-export|\.git)([\\/]|$)/.test(src) });
  const files = readdirSync(join(dir, "config", "intents")).filter((f) => f.endsWith(".ts") && !f.startsWith("_"));
  const REVIEW = "status: \"published\", review: { contentSourcesChecked: true, operatorInfoChecked: true, complianceChecked: true, publishApproved: true, notes: [\"模擬\"] },";
  let n = 0;
  for (const f of files) {
    const p = join(dir, "config", "intents", f);
    let s = readFileSync(p, "utf8");
    for (const id of lpIds) {
      const code = id.replace(/^LP-/, "");
      // 模擬: 該当LPの `content: {` の直前に、公開済み・確認記録あり・保留なしの指定を足す(後に書いた同名のキーが優先される)
      const codeIdx = s.indexOf(`code: "${code}"`);
      if (codeIdx >= 0) {
        const contentIdx = s.indexOf("\n    content: {", codeIdx);
        if (contentIdx < 0) throw new Error(`content が見つかりません: ${code}`);
        s = s.slice(0, contentIdx) + `\n    ${REVIEW}\n    holdReasons: [],` + s.slice(contentIdx);
        n++;
      }
    }
    writeFileSync(p, s);
  }
  if (n !== lpIds.length) throw new Error(`模擬公開の対象LPが見つかりません(${n}/${lpIds.length})`);
  sh("git init -q && git add -A && git -c user.name=sim -c user.email=sim@example.invalid commit -q -m sim", dir);
  symlinkSync(join(factoryDir, "node_modules"), join(dir, "node_modules"), "junction");
  cleanups.push(() => rmSync(join(dir, "node_modules"), { recursive: true, force: true }));
  return dir;
}

let exitCode = 0;
try {
  const head = sh("git rev-parse --short HEAD", root).trim();
  const untracked = sh("git status --porcelain", root).split("\n").filter((l) => l.startsWith("??")).map((l) => l.slice(3));
  console.log(`HEAD=${head} baseline=${baseline} sim=${simPublish.join(",") || "なし"}`);

  // 1. 本番相当(baseline)
  const base = worktree(baseline, "baseline");
  console.log("[1/2] baseline をビルド中…");
  sh("npm run build", base);
  const baseDist = join(base, "dist");

  // 2. 候補(HEAD のコミット済みファイルのみ)
  const cand = worktree("HEAD", "candidate");
  const factoryForSync = simPublish.length ? makeSimFactory(simPublish) : factoryDir;
  console.log("[2/2] 候補(HEAD)を lp:sync → ビルド → check:dist 中…");
  const syncOut = sh("npm run lp:sync", cand, { LP_FACTORY_DIR: factoryForSync });
  sh("npm run build", cand);
  const checkOut = sh("npm run check:dist", cand);
  const candDist = join(cand, "dist");

  const A = snapshot(baseDist);
  const B = snapshot(candDist);
  const isCode = (p) => p.startsWith("_worker.js/");
  const added = [...B.keys()].filter((k) => !A.has(k) && !isCode(k));
  const removed = [...A.keys()].filter((k) => !B.has(k) && !isCode(k));
  const changed = [...B.keys()].filter((k) => A.has(k) && A.get(k) !== B.get(k) && !isCode(k));
  const codeChanged = [...B.keys()].some((k) => isCode(k) && A.get(k) !== B.get(k));

  // --- 検査 ---
  check("check:dist(広告タグ・インラインJS構文)が合格", /OK: \d+ ページ/.test(checkOut), (checkOut.match(/OK:[^\n]*/) ?? [""])[0]);
  // 旧Affiliate LP(/lp/affiliate/)は、別のセッションのコミットで追跡対象になり、本番にも出ている(2026-10-17確認: noindex・A8リンクなし・sitemap非掲載)。
  // ここでは「今回の候補が、baseline(本番相当)に無い /lp/affiliate/ を新たに増やしていないこと」だけを検査する
  const affNew = [...B.keys()].filter((k) => k.startsWith("lp/affiliate/") && !A.has(k));
  check("旧Affiliate LP(/lp/affiliate/)を、baselineに無いものとして新たに増やしていない", affNew.length === 0, `新規: ${affNew.slice(0, 5).join(", ") || "なし"} / 作業ツリーの未コミット: ${untracked.join(", ") || "なし"}`);
  const robotsHead = sh("git show HEAD:public/robots.txt", root).replace(/\r\n/g, "\n");
  check("robots.txt が本番(baseline)・コミット済みと一致", B.get("robots.txt") === A.get("robots.txt") || readFileSync(join(candDist, "robots.txt"), "utf8").replace(/\r\n/g, "\n") === robotsHead, "");
  // _routes.json は、Cloudflareアダプタが「静的配信するパス」を列挙するファイル。LPが増えると、そのパスが追加されるだけのはず
  const allowedChange = (k) => k === "index.html" || k === "sitemap.xml" || k === "_routes.json" || k === "llms.txt";
  const unexpected = changed.filter((k) => !allowedChange(k));
  check("既存コンテンツ(トップ・sitemap以外)が本番とバイト単位で同一", unexpected.length === 0, unexpected.slice(0, 8).join(", "));
  if (changed.includes("_routes.json")) {
    const ra = JSON.parse(readFileSync(join(baseDist, "_routes.json"), "utf8"));
    const rb = JSON.parse(readFileSync(join(candDist, "_routes.json"), "utf8"));
    const lost = (ra.exclude ?? []).filter((p) => !(rb.exclude ?? []).includes(p));
    const gained = (rb.exclude ?? []).filter((p) => !(ra.exclude ?? []).includes(p));
    check("_routes.json: 既存の静的パスが失われず、追加は取り込んだLP・アセットのパスだけ", lost.length === 0 && gained.every((p) => /^\/(lp\/[^/]+\/|_lp-assets\/)/.test(p) || allowAdd.some((a) => p.replace(/^\//, "").startsWith(a))) && JSON.stringify(ra.include) === JSON.stringify(rb.include), `追加: ${gained.join(", ") || "なし"} / 失われた: ${lost.join(", ") || "なし"}`);
  }
  const factoryDirs = existsSync(join(cand, "src/data/generated/lp-sync-state.json")) ? JSON.parse(readFileSync(join(cand, "src/data/generated/lp-sync-state.json"), "utf8")).dirs : [];
  // トップページ(index.astro)のスコープCSSは、トップを変更するとハッシュ名が変わる(旧1つ→新1つの入れ替えだけを許容)
  const topCssAdded = added.filter((k) => /^_astro\/index\.[^/]+\.css$/.test(k));
  const topCssRemoved = removed.filter((k) => /^_astro\/index\.[^/]+\.css$/.test(k));
  const topCssSwap = topCssAdded.length === topCssRemoved.length && topCssAdded.length <= 1;
  if (topCssAdded.length || topCssRemoved.length) check("トップのスコープCSSの入れ替え(旧1つ→新1つ)で、トップがその新CSSを参照している", topCssSwap && (topCssAdded.length === 0 || readFileSync(join(candDist, "index.html"), "utf8").includes(topCssAdded[0].replace("_astro/", ""))), `${topCssRemoved.join(",")} → ${topCssAdded.join(",")}`);
  const unexpectedAdded = added.filter((k) => !(factoryDirs.some((d) => k.startsWith(`lp/${d}/`)) || k.startsWith("_lp-assets/") || topCssAdded.includes(k) || allowAdd.some((a) => k.startsWith(a))));
  check(allowAdd.length ? "追加されたファイルは、取り込んだ公開済みLPとそのアセット、--allow-add で許可した新規ページだけ" : "追加されたファイルは、取り込んだ公開済みLPとそのアセットだけ", unexpectedAdded.length === 0, unexpectedAdded.slice(0, 8).join(", "));
  check("削除されたファイルがない(トップのスコープCSSの入れ替えを除く)", removed.filter((k) => !topCssRemoved.includes(k)).length === 0, removed.filter((k) => !topCssRemoved.includes(k)).slice(0, 8).join(", "));
  for (const must of ["lp/original-print/index.html", "categories/index.html", "index.html"]) check(`存在する: ${must}`, B.has(must), "");
  check("UP-T導線(トップの UptPromoBanner)が保持されている", /original-print/.test(readFileSync(join(candDist, "index.html"), "utf8")), "");
  check("GA4ローダーがトップに1つ(既存計測を維持)", (readFileSync(join(candDist, "index.html"), "utf8").match(/googletagmanager\.com\/gtag\/js/g) ?? []).length === 1, "");

  const top = readFileSync(join(candDist, "index.html"), "utf8");
  const sitemap = readFileSync(join(candDist, "sitemap.xml"), "utf8");
  // 2階層(/lp/<ジャンル>/<意図>/)に加え、ジャンル直下(/lp/<ジャンル>/。例: /lp/fx/)のLPも数える。手書きのLP([slug] の dm など)は、取り込み対象のジャンルディレクトリだけを数える
  const lpFiles = [...B.keys()].filter((k) => /^lp\/[^/]+(\/[^/]+)?\/index\.html$/.test(k) && !["original-print", "affiliate"].includes(k.split("/")[1]) && factoryDirs.includes(k.split("/")[1]));
  if (simPublish.length === 0 && expectPaths.length === 0) {
    check("公開済みLPが0本のとき、トップにガイド枠が出ない(「準備中」カードも出さない)", !/SERVICE GUIDES/.test(top) && !/サービス選びの確認ガイド/.test(top), "");
    check("公開済みLPが0本のとき、sitemap は本番と同一", A.get("sitemap.xml") === B.get("sitemap.xml"), "");
    check("LPが1本も取り込まれていない", lpFiles.length === 0, lpFiles.join(", "));
  } else {
    const expected = simPublish.length || expectPaths.length;
    check(`取り込まれたLPが${simPublish.length ? "模擬公開の" : "公開承認済みの"} ${expected} 本だけ(下書き・保留LPの非混入)`, lpFiles.length === expected, lpFiles.join(", "));
    for (const p of expectPaths) check(`公開されるべきLPが dist にある: ${p}`, B.has(p.replace(/^\//, "") + "index.html"), "");
    for (const p of absentPaths) check(`公開してはいけないLPが dist にない: ${p}`, !B.has(p.replace(/^\//, "") + "index.html") && !sitemap.includes(p) && !top.includes(`href="${p}"`), "");
    for (const f of lpFiles) {
      const path = "/" + f.replace(/index\.html$/, "");
      const html = readFileSync(join(candDist, f), "utf8");
      check(`${path}: index可能(noindexなし)`, !/name="robots"[^>]*noindex/.test(html), "");
      check(`${path}: canonical が https://sokunobank.com${path}`, html.includes(`<link rel="canonical" href="https://sokunobank.com${path}"`), "");
      check(`${path}: sitemap に掲載`, sitemap.includes(`<loc>https://sokunobank.com${path}</loc>`), "");
      check(`${path}: トップからリンクされている`, top.includes(`href="${path}"`), "");
      check(`${path}: GA4ローダーが1つ(計測タグが共通で入っている)`, (html.match(/googletagmanager\.com\/gtag\/js/g) ?? []).length === 1, "");
      check(`${path}: PR表記がある`, /class="pr"/.test(html), "");
      check(`${path}: 下書きバナーがない`, !/data-draft="true"/.test(html), "");
      const a8 = (html.match(/https:\/\/px\.a8\.net\/svt\/ejp\?a8mat=/g) ?? []).length;
      check(`${path}: A8タグのリンクが設置ルール内(0個、または 上段バナー+テキスト・カード内・中段・下段の5個)`, a8 === 0 || a8 === 5, `a8リンク ${a8} 個`);
      if (expectCta.length) check(`${path}: A8タグ(CTA)が${expectCta.includes(path) ? "ちょうど5つ(上段2・カード内・中段・下段)" : "ない(無効)"}`, a8 === (expectCta.includes(path) ? 5 : 0), `a8リンク ${a8} 個`);
    }
    const draftInSitemap = [...sitemap.matchAll(/<loc>https:\/\/sokunobank\.com(\/lp\/[^<]+)<\/loc>/g)].map((m) => m[1]).filter((p) => !lpFiles.some((f) => "/" + f.replace(/index\.html$/, "") === p) && !/original-print/.test(p));
    check("sitemap に、公開していないLPが混入していない", draftInSitemap.length === 0, draftInSitemap.join(", "));
  }

  // --- レポート ---
  const md = [
    "# 本番デプロイ差分と隔離検証(自動生成。デプロイはしていない)",
    "",
    `- 比較: 本番相当 \`${baseline}\` ⇔ 候補 \`HEAD(${head})\`(どちらも、コミット済みのファイルだけを別の一時 worktree でビルド)`,
    `- 取り込むLP: ${simPublish.length ? `**模擬**(${simPublish.join(", ")} を公開済みにしたファクトリーの複製)` : `実データ(ファクトリーのコミット済みで公開承認済みのLP: ${lpFiles.length}本 ${lpFiles.map((f) => "/" + f.replace(/index\.html$/, "")).join(", ")})`}`,
    `- lp:sync: ${syncOut.trim().split("\n").slice(-1)[0]}`,
    `- 作業ツリーの未コミット(デプロイに含まれない・変更も削除もしていない): ${untracked.join(", ") || "なし"}`,
    "",
    `## 検査結果(${results.filter((r) => r.ok).length}/${results.length} 合格)`,
    ...results.map((r) => `- ${r.ok ? "✅" : "❌"} ${r.name}${r.detail ? ` — ${r.detail}` : ""}`),
    "",
    "## dist の差分(本番 → 候補)",
    `- 追加 ${added.length} / 変更 ${changed.length} / 削除 ${removed.length}(Worker コード _worker.js は${codeChanged ? "変更あり(トップ・sitemapの再ビルドに伴う)" : "変更なし"})`,
    ...changed.map((k) => `- 変更: ${k}`),
    ...added.slice(0, 40).map((k) => `- 追加: ${k}`),
    ...(added.length > 40 ? [`- …ほか ${added.length - 40} 件`] : []),
    ...removed.map((k) => `- 削除: ${k}`),
    "",
  ].join("\n");
  if (reportPath) {
    mkdirSync(join(resolve(reportPath), ".."), { recursive: true });
    writeFileSync(resolve(reportPath), md);
  }
  console.log(md);
  if (results.some((r) => !r.ok)) exitCode = 1;
} catch (e) {
  console.error("検証の実行に失敗: " + (e.stdout ?? "") + (e.stderr ?? "") + e.message);
  exitCode = 2;
} finally {
  for (const c of cleanups.reverse()) c();
  rmSync(tmp, { recursive: true, force: true });
}
process.exit(exitCode);

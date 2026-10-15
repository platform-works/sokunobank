// CI検査の共通処理: dist 配下の全HTMLの列挙と、インラインscriptの抽出。
import fs from "node:fs";
import path from "node:path";

export const DIST = "dist";

export function listHtml(dir = DIST) {
  if (!fs.existsSync(dir)) {
    console.error(`${dir} がありません。先に npm run build を実行してください。`);
    process.exit(2);
  }
  const walk = (d) =>
    fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
      const p = path.join(d, e.name);
      return e.isDirectory() ? walk(p) : e.name.endsWith(".html") ? [p] : [];
    });
  return walk(dir);
}

/** HTMLコメントを除いたHTML本文(コメント内の「<script」の誤検出を防ぐ) */
export function readHtml(file) {
  return fs.readFileSync(file, "utf8").replace(/<!--[\s\S]*?-->/g, "");
}

/** src を持たない実行可能なインラインscript(JSON-LD・text/plain等のデータは除く) */
export function inlineScripts(html) {
  const out = [];
  for (const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
    const attrs = m[1];
    const body = m[2];
    if (/\bsrc=/.test(attrs) || !body.trim()) continue;
    if (/type="(application\/ld\+json|application\/json|text\/plain|text\/template)"/.test(attrs)) continue;
    out.push({ attrs, body, isModule: /type="module"/.test(attrs) });
  }
  return out;
}

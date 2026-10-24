// LP用画像のビルド: assets/lp-master/<lp>/manifest.json のマスター画像から、
// public/images/lp/<lp>/ に WebP・AVIF(複数幅)を生成し、管理者向け一覧 assets/lp-master/<lp>/index.html を作る。
// 使い方: node scripts/build-lp-images.mjs [lp名=original-print]
// - マスター画像は元の解像度・ファイル名のまま assets/lp-master/ に保管する(Webには公開されない)
// - 元画像より大きい幅は生成しない(単純拡大をしない)
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const lp = process.argv[2] ?? "original-print";
const root = process.cwd();
const masterDir = path.join(root, "assets", "lp-master", lp);
const outDir = path.join(root, "public", "images", "lp", lp);
const manifest = JSON.parse(fs.readFileSync(path.join(masterDir, "manifest.json"), "utf8"));
fs.mkdirSync(outDir, { recursive: true });

const rows = [];
for (const img of manifest.images) {
  const src = path.join(masterDir, img.file);
  const meta = await sharp(src).metadata();
  const base = path.parse(img.file).name;
  const outputs = [];
  for (const w of img.widths ?? [meta.width]) {
    if (w > meta.width) continue; // 拡大しない
    for (const fmt of ["webp", "avif"]) {
      const name = `${base}-${w}.${fmt}`;
      const pipeline = sharp(src).resize({ width: w, withoutEnlargement: true });
      await (fmt === "webp" ? pipeline.webp({ quality: 80 }) : pipeline.avif({ quality: 55 })).toFile(path.join(outDir, name));
      outputs.push({ name, size: fs.statSync(path.join(outDir, name)).size });
    }
  }
  rows.push({ ...img, width: meta.width, height: meta.height, masterSize: fs.statSync(src).size, outputs });
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const html = `<!doctype html><html lang="ja"><meta charset="utf-8"><title>${esc(lp)} 画像一覧(管理者用)</title>
<style>body{font:14px/1.6 system-ui,sans-serif;margin:24px;color:#10243e}table{border-collapse:collapse;width:100%}td,th{border:1px solid #dceee4;padding:8px;vertical-align:top;text-align:left}img{max-width:220px;height:auto;display:block}a.dl{display:inline-block;margin-top:6px;padding:4px 10px;background:#05815b;color:#fff;border-radius:6px;text-decoration:none}</style>
<h1>${esc(lp)} 画像一覧(管理者用・非公開)</h1>
<p>${esc(manifest._readme)}</p>
<table><tr><th>プレビュー</th><th>情報</th><th>出典・ライセンス・利用条件</th><th>Web用の出力</th></tr>
${rows
  .map(
    (r) => `<tr><td><img src="${esc(r.file)}" alt="${esc(r.title)}" loading="lazy"></td>
<td><strong>${esc(r.title)}</strong><br>${esc(r.file)}<br>${r.width}×${r.height}px / ${(r.masterSize / 1024).toFixed(0)}KB<br>
<a class="dl" href="${esc(r.file)}" download="${esc(r.file)}">原寸をダウンロード</a></td>
<td>出典: ${esc(r.source)}<br>ライセンス: ${esc(r.license)}<br>利用条件: ${esc(r.usage)}<br>${esc(r.notes ?? "")}</td>
<td>${r.outputs.map((o) => `${esc(o.name)} (${(o.size / 1024).toFixed(0)}KB)`).join("<br>")}</td></tr>`,
  )
  .join("\n")}
</table></html>`;
fs.writeFileSync(path.join(masterDir, "index.html"), html);
console.log(rows.map((r) => `${r.file}: ${r.width}x${r.height} -> ${r.outputs.map((o) => o.name).join(", ")}`).join("\n"));

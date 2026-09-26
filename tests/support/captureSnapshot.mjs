// リファクタ前の dist/<category>/index.html から「巻き戻り防止」用スナップショットを
// 一度だけ生成するスクリプト。以後は再実行しない(スナップショットの自動更新はしない方針のため)。
// ロジックは tests/support/extractPageSnapshot.ts と同一のものをここに複製している
// (このスクリプト自体はビルド前の一度きりの実行用で、テストからは呼ばれないため)。
//
// 実行: node tests/support/captureSnapshot.mjs <dist内のhtmlパス> <出力先jsonパス>
import { readFileSync, writeFileSync } from "node:fs";
import { Window } from "happy-dom";

const [, , htmlPath, outPath] = process.argv;
if (!htmlPath || !outPath) {
  console.error("Usage: node captureSnapshot.mjs <html-path> <out-json-path>");
  process.exit(1);
}

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, " ").trim();
}

function extractPageSnapshot(html) {
  const window = new Window();
  const document = window.document;
  document.write(html);

  const title = document.querySelector("title")?.textContent ?? "";
  const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute("content") ?? null;
  const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null;

  const ogTags = {};
  document.querySelectorAll('meta[property^="og:"]').forEach((el) => {
    const property = el.getAttribute("property");
    const content = el.getAttribute("content");
    if (property && content !== null) ogTags[property] = content;
  });

  const twitterTags = {};
  document.querySelectorAll('meta[name^="twitter:"]').forEach((el) => {
    const name = el.getAttribute("name");
    const content = el.getAttribute("content");
    if (name && content !== null) twitterTags[name] = content;
  });

  const jsonLd = [];
  document.querySelectorAll('script[type="application/ld+json"]').forEach((el) => {
    const text = el.textContent?.trim();
    if (!text) return;
    try {
      jsonLd.push(JSON.parse(text));
    } catch {
      jsonLd.push({ __parseError: true, raw: text });
    }
  });

  const h1 = Array.from(document.querySelectorAll("h1")).map((el) => normalizeWhitespace(el.textContent ?? ""));
  const h2 = Array.from(document.querySelectorAll("h2")).map((el) => normalizeWhitespace(el.textContent ?? ""));
  const bodyText = normalizeWhitespace(document.body?.textContent ?? "");

  const selectOptions = {};
  document.querySelectorAll("select").forEach((el) => {
    const key = el.getAttribute("id") ?? el.getAttribute("data-role") ?? `select-${Object.keys(selectOptions).length}`;
    selectOptions[key] = Array.from(el.querySelectorAll("option")).map((o) => normalizeWhitespace(o.textContent ?? ""));
  });

  window.close();

  const adTags = [
    ...(html.match(/<script[^>]*valuecommerce[^>]*><\/script>/g) ?? []),
    ...(html.match(/<noscript>.*?<\/noscript>/gs) ?? []),
  ].sort();

  return { title: normalizeWhitespace(title), metaDescription, canonical, ogTags, twitterTags, jsonLd, h1, h2, bodyText, selectOptions, adTags };
}

const html = readFileSync(htmlPath, "utf-8");
const snapshot = extractPageSnapshot(html);
writeFileSync(outPath, JSON.stringify(snapshot, null, 2) + "\n", "utf-8");
console.log(`Wrote snapshot to ${outPath}`);
console.log(`  title: ${snapshot.title}`);
console.log(`  h1: ${JSON.stringify(snapshot.h1)}`);
console.log(`  select keys: ${Object.keys(snapshot.selectOptions).join(", ")}`);
console.log(`  adTags count: ${snapshot.adTags.length}`);

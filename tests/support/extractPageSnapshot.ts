import { Window } from "happy-dom";

// 「見た目・文言・URL・meta・挙動を一切変えない」ことを検証するためのスナップショット抽出。
// 生HTML丸ごとの文字列比較はしない: Astroのscoped CSS用 data-astro-cid-* ハッシュは
// コンポーネント構造(このリファクタで意図的に変える部分)を変えると値が変わってしまい、
// 見た目に無関係な差分でテストが壊れるため。ここでは意味のある内容だけを抜き出して比較する。

export interface PageSnapshot {
  title: string;
  metaDescription: string | null;
  canonical: string | null;
  ogTags: Record<string, string>;
  twitterTags: Record<string, string>;
  jsonLd: unknown[];
  h1: string[];
  h2: string[];
  bodyText: string;
  /** <select>ごとの選択肢テキスト一覧。key は id (フィルターパネルの各項目・並び順を含む) */
  selectOptions: Record<string, string[]>;
  /** ValueCommerce等の広告タグが無改変で存在するかのバイト単位チェック用。生HTML文字列から直接抽出する
   *  (happy-domのDOM解析を経由すると <noscript> の扱いがブラウザと異なる可能性があるため) */
  adTags: string[];
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function extractPageSnapshot(html: string): PageSnapshot {
  const window = new Window();
  const document = window.document;
  document.write(html);

  const title = document.querySelector("title")?.textContent ?? "";
  const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute("content") ?? null;
  const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null;

  const ogTags: Record<string, string> = {};
  document.querySelectorAll('meta[property^="og:"]').forEach((el) => {
    const property = el.getAttribute("property");
    const content = el.getAttribute("content");
    if (property && content !== null) ogTags[property] = content;
  });

  const twitterTags: Record<string, string> = {};
  document.querySelectorAll('meta[name^="twitter:"]').forEach((el) => {
    const name = el.getAttribute("name");
    const content = el.getAttribute("content");
    if (name && content !== null) twitterTags[name] = content;
  });

  const jsonLd: unknown[] = [];
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

  const selectOptions: Record<string, string[]> = {};
  document.querySelectorAll("select").forEach((el) => {
    const key = el.getAttribute("id") ?? el.getAttribute("data-role") ?? `select-${Object.keys(selectOptions).length}`;
    selectOptions[key] = Array.from(el.querySelectorAll("option")).map((o) => normalizeWhitespace(o.textContent ?? ""));
  });

  window.close();

  const adTags = [
    ...(html.match(/<script[^>]*valuecommerce[^>]*><\/script>/g) ?? []),
    ...(html.match(/<noscript>.*?<\/noscript>/gs) ?? []),
  ].sort();

  return {
    title: normalizeWhitespace(title),
    metaDescription,
    canonical,
    ogTags,
    twitterTags,
    jsonLd,
    h1,
    h2,
    bodyText,
    selectOptions,
    adTags,
  };
}

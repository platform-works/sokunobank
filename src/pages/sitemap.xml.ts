import type { APIRoute } from "astro";
import { getPublishedCategories } from "../data/loadCategories";

// 静的ページ + 公開カテゴリー + ガイド記事を毎回集めてsitemapを生成する。
// カテゴリーを追加してもこのファイル自体の変更は不要(ガイド記事は今のところ手動追加)。
const staticPaths = ["/", "/about/", "/privacy/", "/advertising/", "/categories/", "/categories/projector/"];
const guidePaths = ["/guides/dm-self-shipping/"];

export const GET: APIRoute = ({ site }) => {
  const base = site?.toString().replace(/\/$/, "") ?? "https://sokunobank.com";
  const categoryPaths = getPublishedCategories().map((c) => `/categories/${c.slug}/`);
  const allPaths = [...staticPaths, ...categoryPaths, ...guidePaths];

  const urls = allPaths
    .map((p) => `  <url><loc>${base}${p}</loc></url>`)
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};

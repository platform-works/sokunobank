import type { APIRoute } from "astro";
import { getPublishedCategories } from "../data/loadCategories";
import { getAllCommerceCategoryConfigs } from "../lib/commerce/registry";

// affiliate-lp-factory で公開済みのLP(npm run lp:sync が生成。公開済みのものだけが入る)
const guideModules = import.meta.glob("../data/generated/lp-guide.json", { eager: true }) as Record<string, { default?: { genres?: { lps: { path: string }[] }[] } }>;
const factoryLpPaths: string[] = (Object.values(guideModules)[0]?.default?.genres ?? []).flatMap((g) => g.lps.map((l) => l.path));

// 静的ページ + 公開カテゴリー(DM型・commerce型どちらも)+ ガイド記事を毎回集めてsitemapを生成する。
// カテゴリーを追加してもこのファイル自体の変更は不要(ガイド記事は今のところ手動追加)。
const staticPaths = ["/", "/about/", "/privacy/", "/advertising/", "/categories/"];
const guidePaths = [
  "/guides/dm-self-shipping/",
  "/guides/flyer-printing/",
  "/guides/business-card-printing/",
  "/guides/envelope-printing/",
  "/guides/poster-printing/",
  "/guides/novelty-goods/",
  "/guides/company-brochure/",
  "/guides/recruitment-brochure/",
  "/guides/office-supplies/",
  "/guides/greeting-cards/",
  "/guides/internal-print-materials/",
  "/guides/dm-same-day-shipping/",
  "/guides/dm-1000-fastest/",
  "/guides/dm-address-list/",
];

export const GET: APIRoute = ({ site }) => {
  const base = site?.toString().replace(/\/$/, "") ?? "https://sokunobank.com";
  const categoryPaths = getPublishedCategories().map((c) => `/categories/${c.slug}/`);
  const commercePaths = getAllCommerceCategoryConfigs().map((c) => `/categories/${c.slug}/`);
  const allPaths = [...staticPaths, ...categoryPaths, ...commercePaths, ...guidePaths, ...factoryLpPaths];

  const urls = allPaths
    .map((p) => `  <url><loc>${base}${p}</loc></url>`)
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};

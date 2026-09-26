import type { CommerceCategoryConfig } from "./types";
import { projectorConfig } from "./categories/projector.config";
import { orchidConfig } from "./categories/orchid.config";

// 新カテゴリーを追加するときは、ここに1行追加するだけでページ(薄いラッパーファイル経由)と
// APIルート(動的ルート経由)の両方から使えるようになる。
// (docs/new-category-checklist.md も参照)
const configs: CommerceCategoryConfig[] = [projectorConfig, orchidConfig];

function assertValidCommerceCategoryConfig(config: CommerceCategoryConfig): void {
  const missing: string[] = [];
  const requiredNonEmptyStrings: (keyof CommerceCategoryConfig)[] = [
    "slug",
    "name",
    "apiPath",
    "pageTitle",
    "metaDescription",
    "h1",
    "subheadline",
    "deliveryNote",
    "intro",
  ];
  for (const key of requiredNonEmptyStrings) {
    const value = config[key];
    if (typeof value !== "string" || value.trim() === "") missing.push(String(key));
  }

  const requiredNonEmptyArrays: (keyof CommerceCategoryConfig)[] = [
    "searchQueries",
    "requiredKeywords",
    "sortOptions",
    "seoSections",
    "faq",
  ];
  for (const key of requiredNonEmptyArrays) {
    const value = config[key];
    if (!Array.isArray(value) || value.length === 0) missing.push(String(key));
  }

  if (!config.weights) {
    missing.push("weights");
  } else {
    const weightKeys: (keyof CommerceCategoryConfig["weights"])[] = [
      "delivery",
      "conversionProxy",
      "review",
      "store",
      "revenue",
    ];
    for (const key of weightKeys) {
      if (typeof config.weights[key] !== "number") missing.push(`weights.${key}`);
    }
  }

  if (typeof config.revenueScoreReferenceMax !== "number" || config.revenueScoreReferenceMax <= 0) {
    missing.push("revenueScoreReferenceMax (正の数である必要があります)");
  }

  if (!config.apiPath?.endsWith("/")) {
    missing.push('apiPath (末尾に "/" が必要です。このプロジェクトは trailingSlash: "always" のため)');
  }

  if (missing.length > 0) {
    throw new Error(
      `[commerce/registry] カテゴリー設定 "${config.slug || "(slug未設定)"}" に不備があります: ${missing.join(", ")}`
    );
  }
}

const registry = new Map<string, CommerceCategoryConfig>();
for (const config of configs) {
  assertValidCommerceCategoryConfig(config);
  if (registry.has(config.slug)) {
    throw new Error(`[commerce/registry] slug "${config.slug}" が複数の設定ファイルで重複しています。`);
  }
  registry.set(config.slug, config);
}

export function getCommerceCategoryConfig(slug: string): CommerceCategoryConfig | undefined {
  return registry.get(slug);
}

export function getAllCommerceCategoryConfigs(): CommerceCategoryConfig[] {
  return Array.from(registry.values());
}

import type { CategoryData } from "./schema";

// カテゴリーを追加する際は /src/data/categories/<slug>.json を置くだけでよい。
// ルーティングやコンポーネント側の変更は不要な設計にしている。
const modules = import.meta.glob<{ default: CategoryData }>(
  "./categories/*.json",
  { eager: true }
);

const all: CategoryData[] = Object.values(modules).map((m) => m.default);

export function getAllCategories(): CategoryData[] {
  return all;
}

export function getPublishedCategories(): CategoryData[] {
  return all.filter((c) => c.status === "published");
}

export function getCategoryBySlug(slug: string): CategoryData | undefined {
  return all.find((c) => c.slug === slug);
}

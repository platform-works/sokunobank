import type { APIRoute } from "astro";
import { getCommerceCategoryConfig } from "../../../lib/commerce/registry";
import { handleProductsRequest } from "../../../lib/commerce/handleProductsRequest";

// 「Yahoo!ショッピング商品ランキング型」カテゴリー共通の動的APIルート。
// 新カテゴリーを追加してもこのファイル自体の変更は不要(レジストリに設定を登録するだけでよい)。
export const prerender = false;

export const GET: APIRoute = async (context) => {
  const slug = context.params.slug;
  const config = slug ? getCommerceCategoryConfig(slug) : undefined;
  if (!config) {
    return new Response(JSON.stringify({ products: [], error: "不明なカテゴリーです" }), {
      status: 404,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }
  return handleProductsRequest(config, context);
};

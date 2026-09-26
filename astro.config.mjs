import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";

// 基本は静的サイトとしてビルドし、Cloudflare Workers の Static Assets 機能でホスティングする。
// projectorカテゴリー等、外部APIキーをサーバー側でのみ使うページ(src/pages/api/**)だけ
// `export const prerender = false` で個別に動的化するため、hybrid出力+Cloudflareアダプタを使用。
// 上記以外の既存ページは今まで通りビルド時に静的prerenderされる(挙動は変わらない)。
export default defineConfig({
  site: "https://sokunobank.com",
  output: "hybrid",
  adapter: cloudflare(),
  trailingSlash: "always",
});

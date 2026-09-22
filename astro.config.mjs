import { defineConfig } from "astro/config";

// 静的サイトとしてビルドし、Cloudflare Workers の Static Assets 機能でホスティングする前提。
// (SSRが必要になった場合は @astrojs/cloudflare アダプタの追加を検討)
export default defineConfig({
  site: "https://sokunobank.com",
  output: "static",
  trailingSlash: "always",
});

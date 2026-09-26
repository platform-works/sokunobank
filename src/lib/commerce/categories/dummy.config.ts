import type { CommerceCategoryConfig } from "../types";

// テンプレート化リファクタの動作確認用ダミーカテゴリー。
// 「設定ファイル1つ + ページの薄いラッパー1つ + レジストリ登録」だけで
// 新カテゴリーが動くことを確認するためのもの。確認後に削除する。
export const dummyConfig: CommerceCategoryConfig = {
  slug: "dummy",
  name: "ダミーカテゴリー(確認用)",
  apiPath: "/api/dummy/products/",
  pageTitle: "ダミーカテゴリー即納比較｜明日には届く商品を探す",
  metaDescription: "テンプレート化リファクタの動作確認用ダミーカテゴリーです。",
  h1: "ダミーカテゴリーを最短で届く商品から比較",
  subheadline: "動作確認用のダミーページです。",
  deliveryNote: "在庫・配送予定は変動します。購入前にYahoo!ショッピングの商品ページで最新のお届け予定をご確認ください。",
  intro: "選択したお届け先に対して、配送スピード・レビュー・ストア評価・価格などを総合して商品を掲載しています。",
  searchQueries: ["プロジェクター"],
  requiredKeywords: ["プロジェクター"],
  excludeKeywords: ["お取り寄せ", "取り寄せ", "予約商品", "入荷次第", "入荷未定", "受注生産", "メーカー取寄"],
  sortOptions: [
    { key: "recommended", label: "即納おすすめ" },
    { key: "trust", label: "売れ筋・安心重視" },
    { key: "reviewCount", label: "レビュー件数" },
    { key: "priceAsc", label: "価格が安い順" },
  ],
  weights: { delivery: 0.2, conversionProxy: 0.15, review: 0.09, store: 0.06, revenue: 0.5 },
  revenueScoreReferenceMax: 3000,
  seoSections: [{ heading: "確認用セクション", body: ["確認用の説明文です。"] }],
  faq: [{ question: "これは何ですか？", answer: "テンプレート化リファクタの動作確認用ダミーです。" }],
};

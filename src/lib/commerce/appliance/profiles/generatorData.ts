// 発電機・ポータブル電源ページの絞り込み用データ(帯・ブランド・種類・用途の語)。
// 以前は generatorClient.ts にあった値をそのまま移した(値の根拠は各コメントのとおり)。
import type { BrandOption, Range } from "../types";

export type ProductType = "portable" | "gasoline" | "cassette";

// 帯は閉区間(境界の値は両隣の帯に含まれる)。「500Wh以下」「1,000Wh以上」といった
// CTAの表記とそのまま一致させるため。
export const capacityBands: Range[] = [
  { min: 0, max: 500, label: "〜500Wh" },
  { min: 500, max: 1000, label: "500〜1,000Wh" },
  { min: 1000, max: 2000, label: "1,000〜2,000Wh" },
  { min: 2000, max: null, label: "2,000Wh以上" },
];

export const powerBands: Range[] = [
  { min: 0, max: 500, label: "〜500W" },
  { min: 500, max: 1000, label: "500〜1,000W" },
  { min: 1000, max: 1500, label: "1,000〜1,500W" },
  { min: 1500, max: null, label: "1,500W以上" },
];

// 予算の帯(税込の表示価格・円)。2026-10-24に取得済みの150件(最安約2.3万円〜最高約42万円、中央値約11万円)の
// 分布を測り、各帯におおむね同程度(32〜46件)が入るよう区切った。閉区間で、境界の値は両隣の帯に含まれる。
export const budgetBands: Range[] = [
  { min: 0, max: 70000, label: "〜7万円" },
  { min: 70000, max: 120000, label: "7〜12万円" },
  { min: 120000, max: 180000, label: "12〜18万円" },
  { min: 180000, max: null, label: "18万円以上" },
];

// ブランドの絞り込み選択肢(2026-10-24)。取得済み150件でブランド名・商品名に現れた件数の多い順(Jackery34・EENOUR18・
// Kareyou16・BLUETTI15・EcoFlow12・JESIMAIK7・Anker6・ホンダ5・工進5・DJI5)。語はカタカナ表記も含める。
// ヤマハは事業終了のため載せない。ブランドは商品名から確実に判定できるため、判定不能(unknown)は発生しない。
export const brandOptions: BrandOption[] = [
  { id: "jackery", label: "Jackery", words: ["jackery", "ジャクリ"] },
  { id: "eenour", label: "EENOUR", words: ["eenour", "イーノウ"] },
  { id: "kareyou", label: "Kareyou", words: ["kareyou"] },
  { id: "bluetti", label: "BLUETTI", words: ["bluetti", "ブルーティ"] },
  { id: "ecoflow", label: "EcoFlow", words: ["ecoflow", "エコフロー"] },
  { id: "jesimaik", label: "JESIMAIK", words: ["jesimaik"] },
  { id: "anker", label: "Anker", words: ["anker", "アンカー"] },
  { id: "honda", label: "Honda", words: ["honda", "ホンダ"] },
  { id: "koshin", label: "工進", words: ["工進", "koshin"] },
  { id: "dji", label: "DJI", words: ["dji"] },
];

export const typeLabels: Record<ProductType, string> = {
  portable: "ポータブル電源",
  gasoline: "ガソリン発電機",
  cassette: "カセットガス発電機",
};

// 用途は商品の属性として取得できないため、商品名に用途を示す語が明記されている商品だけを対象にする
// (推測で「防災向け」等に分類しない)。
export const useCaseKeywords: Record<string, string[]> = {
  disaster: ["防災", "災害", "非常用", "停電", "BCP"],
  home: ["家庭用", "家庭", "自宅"],
  work: ["工事", "業務用", "現場", "作業"],
  camp: ["キャンプ", "アウトドア"],
  vehicle: ["車中泊", "車載"],
};

export function isEngineType(t: string | null): boolean {
  return t === "gasoline" || t === "cassette";
}

/**
 * 車内(車中泊)で使う用途では、エンジン式発電機(ガソリン・カセットガス)を選べない。自動車内やテント内での
 * エンジン式発電機の使用は、屋内と同等以上の危険があるとされている(NITE・消費者庁)ため、
 * 種類の選択も、商品の絞り込み(エンジン式・種類が確認できない商品を除外)も、バッテリー式に限定する。
 */
export function isEngineBlocked(useCase: string | null): boolean {
  return useCase === "vehicle";
}

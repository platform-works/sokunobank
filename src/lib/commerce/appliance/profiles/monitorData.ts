// PCモニターページの絞り込み用データ(帯・ブランド・種類・用途の語)。2026-10-24に Yahoo!ショッピングの
// 「PCモニター」検索の先頭500件(必須語・除外語の適用後に重複を除いた347件)を取得して分布を測り、決めた。
import type { BrandOption, Range } from "../types";

export type MonitorResolution = "4k" | "qhd" | "fhd";

// 画面サイズ(インチ)の帯。実測の最頻値は27(75件)・23.8(63件)・21.5(31件)・31.5(23件)・15.6(20件)。
// 帯の間に入る値(例: 26.5、29)が出ないよう、整数で連続させた閉区間にしている。
export const capacityBands: Range[] = [
  { min: 0, max: 20.9, label: "〜20インチ(モバイル・小型)" },
  { min: 21, max: 25.9, label: "21〜25インチ" },
  { min: 26, max: 30.9, label: "26〜30インチ(27が主流)" },
  { min: 31, max: 33.9, label: "31〜33インチ" },
  { min: 34, max: null, label: "34インチ以上(ウルトラワイド・大型)" },
];

// 出力(W)では絞り込まない
export const powerBands: Range[] = [];

// 予算の帯(税込の表示価格・円)。347件の価格は10%点1.2万・25%点1.6万・中央値2.4万・75%点4.0万・90%点5.6万円。
// おおむね同程度の件数に分かれるよう区切った。閉区間で、境界の値は両隣の帯に含まれる。
export const budgetBands: Range[] = [
  { min: 0, max: 15000, label: "〜1.5万円" },
  { min: 15000, max: 25000, label: "1.5〜2.5万円" },
  { min: 25000, max: 40000, label: "2.5〜4万円" },
  { min: 40000, max: null, label: "4万円以上" },
];

// ブランドの絞り込み選択肢。取得した347件で商品名・ブランド名に現れた件数の多い順(JAPANNEXT116・I-O DATA21・Lenovo18・アイリスオーヤマ17・DELL14・LG13・Philips12・ASUS11・富士通8・EIZO7・MAXZEN6・MSI6)。判定は商品名とYahoo!のブランド名の部分一致。
// 短い語(LG・MSI・デル)は他の語に含まれやすい(「モデル」に「デル」)ため、実データ347件で誤判定を確認した語に限る。
export const brandOptions: BrandOption[] = [
  { id: "japannext", label: "JAPANNEXT", words: ["japannext", "ジャパンネクスト"] },
  { id: "iodata", label: "I-O DATA", words: ["i-o data", "iodata", "アイ・オー・データ", "アイオーデータ"] },
  { id: "dell", label: "DELL", words: ["dell", " デル "] },
  { id: "irisohyama", label: "アイリスオーヤマ", words: ["アイリスオーヤマ", "iris ohyama", "irisohyama"] },
  { id: "lenovo", label: "Lenovo", words: ["lenovo", "レノボ"] },
  { id: "philips", label: "Philips", words: ["philips", "フィリップス"] },
  { id: "lg", label: "LG", words: ["lg", "エルジー"] },
  { id: "asus", label: "ASUS", words: ["asus", "エイスース"] },
  { id: "eizo", label: "EIZO", words: ["eizo", "ナナオ"] },
  { id: "maxzen", label: "MAXZEN", words: ["maxzen", "マクスゼン"] },
  { id: "msi", label: "MSI", words: ["msi"] },
  { id: "fujitsu", label: "富士通", words: ["富士通", "fujitsu"] },
];

// 種類は解像度の区分。商品名に解像度が明記された商品だけが対象(推測しない)。
export const typeLabels: Record<MonitorResolution, string> = {
  "4k": "4K",
  qhd: "WQHD・QHD",
  fhd: "フルHD",
};

// 用途は商品の属性として取得できないため、商品名に用途を示す語が明記されている商品だけを対象にする
// (推測で「ゲーミング向け」等に分類しない)。実測の件数: ゲーミング74・モバイル50・在宅/テレワーク/リモート7(2026-10-24、在宅・テレワークはゲーミングに統合)。
export const useCaseKeywords: Record<string, string[]> = {
  gaming: ["ゲーミング", "ゲームモニター", "在宅", "テレワーク", "リモート"],
  mobile: ["モバイル", "携帯"],
};

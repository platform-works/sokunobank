// 炊飯器ページの絞り込み用データ(帯・ブランド・種類・用途の語)。2026-10-24に Yahoo!ショッピングの
// 「炊飯器」検索の先頭500件(重複除去後約480件)を取得して分布を測り、決めた。
import type { BrandOption, Range } from "../types";

export type RiceCookerType = "pressure-ih" | "ih" | "micom" | "gas";

// 炊飯容量(合)の帯。商品名の表記は0.5合刻み。閉区間で、3.5合・4.5合のように帯の間に入る値が出ないよう区切りを決めた。
// 販売者は5合炊きと5.5合炊きを同じ機種に併記することが多いため、5〜9合を1つの帯(実態は5.5合が主流)にまとめている。
export const capacityBands: Range[] = [
  { min: 0, max: 3, label: "〜3合" },
  { min: 3.5, max: 4.5, label: "3.5〜4.5合" },
  { min: 5, max: 9.5, label: "5〜9合(5.5合が主流)" },
  { min: 10, max: null, label: "1升(10合)" },
];

// 出力(W)では絞り込まない
export const powerBands: Range[] = [];

// 予算の帯(税込の表示価格・円)。想定報酬50円以上の約280件(最安約3,200円〜、中央値約1.6万円)の分布を測り、
// おおむね 25%/38%/25%/12% に分かれるよう区切った。閉区間で、境界の値は両隣の帯に含まれる。
export const budgetBands: Range[] = [
  { min: 0, max: 10000, label: "〜1万円" },
  { min: 10000, max: 20000, label: "1〜2万円" },
  { min: 20000, max: 35000, label: "2〜3.5万円" },
  { min: 35000, max: null, label: "3.5万円以上" },
];

// ブランドの絞り込み選択肢。取得した約480件で商品名に現れた件数の多い順(タイガー123・象印76・アイリスオーヤマ69・
// パナソニック29・東芝21・ベルソス16・ティファール15・山善14・マクスゼン14・三菱13・シャープ12・日立11)。
// 語はカタカナ・英字の表記を含める。ブランドは商品名から確実に判定できるため、判定不能(unknown)は発生しない。
export const brandOptions: BrandOption[] = [
  { id: "tiger", label: "タイガー", words: ["タイガー", "tiger"] },
  { id: "zojirushi", label: "象印", words: ["象印", "zojirushi"] },
  { id: "irisohyama", label: "アイリスオーヤマ", words: ["アイリスオーヤマ", "iris ohyama", "irisohyama"] },
  { id: "panasonic", label: "パナソニック", words: ["パナソニック", "panasonic"] },
  { id: "toshiba", label: "東芝", words: ["東芝", "toshiba"] },
  { id: "versos", label: "ベルソス", words: ["ベルソス", "versos"] },
  { id: "tefal", label: "ティファール", words: ["ティファール", "t-fal", "tefal"] },
  { id: "yamazen", label: "山善", words: ["山善", "yamazen"] },
  { id: "maxzen", label: "MAXZEN", words: ["maxzen", "マクスゼン"] },
  { id: "mitsubishi", label: "三菱電機", words: ["三菱", "mitsubishi"] },
  { id: "sharp", label: "シャープ", words: ["シャープ", "sharp"] },
  { id: "hitachi", label: "日立", words: ["日立", "hitachi"] },
];

export const typeLabels: Record<RiceCookerType, string> = {
  "pressure-ih": "圧力IH",
  ih: "IH",
  micom: "マイコン",
  gas: "ガス",
};

// 用途は商品の属性として取得できないため、商品名に用途を示す語が明記されている商品だけを対象にする
// (推測で「一人暮らし向け」等に分類しない)。「家族向け」「業務用」は商品名に書かれることが少ない(実測で1〜5件)ため設けない。
export const useCaseKeywords: Record<string, string[]> = {
  single: ["一人暮らし", "ひとり暮らし", "1人暮らし", "単身", "ミニ"],
  newlife: ["新生活", "引っ越し", "引越"],
};

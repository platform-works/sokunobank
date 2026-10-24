// PCモニターページの静的コンテンツ(用途・解像度の区分の説明)。
// 外部の一次情報は参照していないため、載せるのは「本ページがどう分類しているか」(商品名の表記に基づく区分)だけ。
// 用途別の推奨サイズ・性能の優劣など、出典の本文で確認していない主張は載せない。

export const CONTENT_UPDATED_ON = "2026-10-24";
export const CONTENT_UPDATED_LABEL = "2026年10月24日";

export interface UseCase {
  id: "gaming" | "mobile" | "remote";
  label: string;
  description: string;
  note?: string;
  /** 用途ごとの容量(画面サイズ)の目安は出典で確認していないため空 */
  guide: { label: string; desc: string; capacityBand: number }[];
}

export const useCases: UseCase[] = [
  {
    id: "gaming",
    label: "ゲーミング",
    description: "商品名に「ゲーミング」などの表記がある商品で絞り込みます。リフレッシュレート(Hz)や応答速度は、商品ページの仕様欄で確認してください。",
    guide: [],
  },
  {
    id: "mobile",
    label: "モバイル(持ち運び)",
    description: "商品名に「モバイル」などの表記がある商品で絞り込みます。接続端子(USB Type-C・miniHDMI等)が手持ちの機器に対応しているかを、商品ページで確認してください。",
    guide: [],
  },
  {
    id: "remote",
    label: "在宅・テレワーク",
    description: "商品名に「在宅」「テレワーク」「リモート」などの表記がある商品で絞り込みます。該当する商品は多くありません。",
    guide: [],
  },
];

export interface ResolutionInfo {
  id: "4k" | "qhd" | "fhd";
  label: string;
  description: string;
}

// 本ページの解像度の区分。商品名の表記(4K・UHD、WQHD・QHD・UWQHD、フルHD・FHD)から分類しており、画素数の表記が商品名にある場合も同じ区分に入れる。
export const resolutions: ResolutionInfo[] = [
  { id: "4k", label: "4K", description: "商品名に「4K」「UHD」または3840×2160の表記がある商品です。" },
  { id: "qhd", label: "WQHD・QHD", description: "商品名に「WQHD」「QHD」「UWQHD」または2560×1440・3440×1440の表記がある商品です。" },
  { id: "fhd", label: "フルHD", description: "商品名に「フルHD」「FHD」または1920×1080の表記がある商品です。" },
];

export function yahooSearchUrl(query: string): string {
  return `https://shopping.yahoo.co.jp/search/${query.split(" ").map(encodeURIComponent).join("+")}/0/?astk=2`;
}

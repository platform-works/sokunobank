// 炊飯器ページの静的コンテンツ(用途・炊飯容量の目安・加熱方式の説明)。
// 数値や説明は、必ず下記の出典ページ本文で確認できた内容だけを載せる(推測・一般知識での補完は禁止)。
// 確認日は SOURCES_CONFIRMED_ON。出典を変更・追加する場合は、実際にページを取得して本文を確認してから更新すること。

export const CONTENT_UPDATED_ON = "2026-10-24";
export const CONTENT_UPDATED_LABEL = "2026年10月24日";
export const SOURCES_CONFIRMED_ON = "2026-10-24";

export interface RiceCookerSource {
  org: string;
  title: string;
  url: string;
}

// 2026-10-24に本文を確認。メーカー各社の「選び方」ページのうち、取得できたのはパナソニックのみ。
export const sources: RiceCookerSource[] = [
  { org: "パナソニック", title: "炊飯器の選び方", url: "https://panasonic.jp/suihan/select.html" },
];

export interface UseCase {
  id: "single" | "newlife";
  label: string;
  description: string;
  note?: string;
  /** その用途で目安になる炊飯容量(出典: パナソニック「炊飯器の選び方」) */
  guide: { label: string; desc: string; capacityBand: number }[];
}

// 人数と炊飯容量の目安は、パナソニック公式の記載(1〜2人暮らし:〜3合炊き、3〜5人家族:5.5合炊き、大家族:1升炊き。
// 「0.5合でお茶碗約1杯分」を目安に選ぶ)による。capacityBand は capacityBands の番号。
const sizeGuide = {
  small: { label: "1〜2人暮らし:〜3合炊き", desc: "パナソニック公式の目安です。0.5合でお茶碗約1杯分として、普段炊く量に合わせて選びます。", capacityBand: 0 },
  family: { label: "3〜5人家族:5.5合炊き", desc: "パナソニック公式の目安です。", capacityBand: 2 },
  large: { label: "大家族:1升炊き", desc: "パナソニック公式の目安です。", capacityBand: 3 },
};

export const useCases: UseCase[] = [
  {
    id: "single",
    label: "一人暮らし",
    description: "少人数で使う場合は、普段炊くご飯の量から炊飯容量を選びます。商品名に「一人暮らし」「ミニ」などの表記がある商品で絞り込みます。",
    guide: [sizeGuide.small],
  },
  {
    id: "newlife",
    label: "新生活",
    description: "引っ越しや新生活で揃える場合は、世帯の人数から炊飯容量を選びます。商品名に「新生活」などの表記がある商品で絞り込みます。",
    guide: [sizeGuide.small, sizeGuide.family, sizeGuide.large],
  },
];

export interface MethodInfo {
  id: "micom" | "ih" | "pressure-ih" | "gas";
  label: string;
  description: string;
}

// 加熱方式の説明は、パナソニック公式の記載(マイコン:内釜の底のヒーターで加熱、IH:IHで内釜を発熱させて加熱、
// 圧力機能のある機種:加圧して水の沸点を上げ、より高い火力で炊き上げる)の範囲に限る。価格・味・炊きムラの比較は出典で確認できていないため載せない。
export const methods: MethodInfo[] = [
  { id: "micom", label: "マイコン", description: "内釜の底にあるヒーターで加熱して炊き上げる方式です(パナソニック公式)。" },
  { id: "ih", label: "IH", description: "IHで内釜を発熱させて加熱する方式です(パナソニック公式)。" },
  { id: "pressure-ih", label: "圧力IH", description: "IHで加熱し、圧力機能で加圧して水の沸点を上げ、より高い火力で炊き上げる方式です(パナソニック公式)。" },
  {
    id: "gas",
    label: "ガス",
    description: "ガスで加熱する炊飯器です。都市ガス用・プロパンガス用など対応するガスの種類が商品ごとに決まっているため、商品ページで確認してください。",
  },
];

export function yahooSearchUrl(query: string): string {
  return `https://shopping.yahoo.co.jp/search/${query.split(" ").map(encodeURIComponent).join("+")}/0/?astk=2`;
}

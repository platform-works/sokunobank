// 発電機・ポータブル電源ページの静的コンテンツ(用途・出典付き安全情報・家電の消費電力目安)。
// 安全情報と消費電力の数値は、必ず下記の出典ページ本文で確認できた内容だけを載せる
// (推測・一般知識での補完は禁止)。確認日は CONFIRMED_ON。出典を変更・追加する場合は
// 実際にページを取得して本文を確認してから更新すること。

export const CONTENT_UPDATED_ON = "2026-09-30";
export const CONTENT_UPDATED_LABEL = "2026年9月30日";
export const SOURCES_CONFIRMED_ON = "2026-09-30";

export function yahooSearchUrl(query: string): string {
  return `https://shopping.yahoo.co.jp/search/${query.split(" ").map(encodeURIComponent).join("+")}/0/?astk=2`;
}

export interface UseCaseLink {
  label: string;
  query: string;
  type: "portable" | "engine";
}

export interface UseCase {
  id: "disaster" | "home" | "work" | "camp" | "vehicle";
  label: string;
  description: string;
  /** 公的機関・メーカー公式で確認できた事実に基づく注意(あれば) */
  note?: string;
  links: UseCaseLink[];
  guide?: { href: string; label: string };
}

// 検索クエリは2026-09-30にYahoo!ショッピングAPIで商品数を確認済み(すべて1,000件以上、
// 「発電機 工事用」のみ約150件)。「発電機 車中泊」はエンジン発電機を車内で使えない
// (NITE・消費者庁)ため、車中泊にはリンクを設けない。
export const useCases: UseCase[] = [
  {
    id: "disaster",
    label: "災害・防災",
    description:
      "停電時に動かしたい機器(冷蔵庫・照明・通信機器など)を洗い出し、必要な出力(W)と使う時間から容量(Wh)を見積もります。屋内で使うならバッテリー式のポータブル電源、屋外に使える場所があり長く使いたいなら発電機が候補になります。",
    links: [
      { label: "防災向けのポータブル電源", query: "ポータブル電源 防災", type: "portable" },
      { label: "防災向けの発電機", query: "発電機 防災", type: "engine" },
    ],
    guide: { href: "/guides/urgent-power-outage-prep/", label: "停電対策を今日中にやる(必需品まで)" },
  },
  {
    id: "home",
    label: "家庭用",
    description:
      "在宅中の停電に備える防災用途のほか、家電のバックアップにも使われます。使いたい家電の消費電力と時間から、必要な容量と出力の目安を確認できます。",
    links: [
      { label: "家庭用のポータブル電源", query: "ポータブル電源 家庭用", type: "portable" },
      { label: "家庭用の発電機", query: "発電機 家庭用", type: "engine" },
    ],
    guide: { href: "/guides/urgent-handle-generator-today/", label: "今日中に発電機を手配する方法" },
  },
  {
    id: "work",
    label: "工事・業務用",
    description:
      "電動工具や照明、業務機器の電源として使われます。使う機器の消費電力は製品ラベルや取扱説明書で確認し、合計の出力(W)に余裕のある機種を選びます。",
    links: [
      { label: "工事用の発電機", query: "発電機 工事用", type: "engine" },
      { label: "業務用の発電機", query: "発電機 業務用", type: "engine" },
    ],
    guide: { href: "/guides/urgent-construction-supplies/", label: "工事現場の急な必要物資を用意する" },
  },
  {
    id: "camp",
    label: "キャンプ",
    description:
      "アウトドアでは、照明・調理家電・スマートフォンの充電などに使われます。エンジン式発電機をテント内で使うのは危険とされているため、置き場所と換気に注意が必要です。",
    note: "屋外でも、自動車内やテント内でのエンジン式発電機の使用は屋内と同等以上の危険があります(NITE・消費者庁)。",
    links: [
      { label: "キャンプ向けのポータブル電源", query: "ポータブル電源 キャンプ", type: "portable" },
      { label: "キャンプ向けの発電機", query: "発電機 キャンプ", type: "engine" },
    ],
    guide: { href: "/guides/urgent-event-generator/", label: "イベント・屋外用の発電機を選ぶ" },
  },
  {
    id: "vehicle",
    label: "車中泊",
    description:
      "車中泊では、照明・扇風機・スマートフォンの充電などの電源として、バッテリー式のポータブル電源が検討されます。エンジン式発電機を車内で使うことはできません。",
    note: "自動車内でのエンジン式発電機の使用は、屋内と同等以上の危険があります(NITE・消費者庁)。ポータブル電源は高温になる場所で使用・保管しないでください(NITE)。",
    links: [{ label: "車中泊向けのポータブル電源", query: "ポータブル電源 車中泊", type: "portable" }],
  },
];

export interface AppliancePower {
  id: string;
  label: string;
  /** 初期値(W)。確認済みの値がない場合はnull(利用者が入力する) */
  watts: number | null;
  /** 表に出す目安の表記 */
  note: string;
  source: string;
  defaultHours: number;
}

// 出典はすべて2026-09-30に本文を確認。電力会社の表は「各機器を使用した場合の想定値/参考値」で、
// 機種により異なる。初期値には確認できた幅の上限側(余裕を見る側)を使っている。
export const appliances: AppliancePower[] = [
  { id: "fridge", label: "冷蔵庫", watts: 250, note: "250W(450Lクラス)", source: "東京電力エナジーパートナー / 東北電力", defaultHours: 8 },
  { id: "router", label: "Wi-Fiルーター", watts: 30, note: "11.5〜30W(最大消費電力。Aterm 3機種)", source: "NECプラットフォームズ(Aterm仕様)", defaultHours: 24 },
  { id: "phone", label: "スマートフォン(充電)", watts: null, note: "確認できた公的な目安値なし。充電器の出力表示(W)を入力してください", source: "—", defaultHours: 2 },
  { id: "led", label: "LED照明(1基)", watts: 10, note: "4〜10W", source: "東京電力エナジーパートナー / 東北電力", defaultHours: 6 },
  { id: "fan", label: "扇風機", watts: 50, note: "30〜50W(ACモーター)、5〜20W(DCモーター)", source: "東京電力エナジーパートナー / 東北電力", defaultHours: 8 },
  { id: "blanket", label: "電気毛布", watts: 100, note: "40〜100W(設定・使用時間で変動)", source: "大阪ガス(Daigasコラム)", defaultHours: 8 },
  { id: "tv", label: "テレビ(液晶42型)", watts: 210, note: "210W", source: "東京電力エナジーパートナー / 東北電力", defaultHours: 4 },
  { id: "microwave", label: "電子レンジ", watts: 1500, note: "500〜1,500W(30L)、700W(20L)", source: "東京電力エナジーパートナー / 東北電力", defaultHours: 0.2 },
  { id: "kettle", label: "電気ケトル", watts: 1300, note: "1,300W(メーカー1機種の仕様値。機種により異なります)", source: "タイガー魔法瓶(製品仕様)", defaultHours: 0.1 },
];

export interface SafetyFact {
  text: string;
  source: string;
}

export interface SafetySource {
  org: string;
  title: string;
  url: string;
}

// 2026-09-30に各ページ本文を確認した内容のみ。ガレージ・車庫・軒下の可否、開口部からの距離(m)の
// 公的基準、CO濃度の数値、エンジン冷却後の給油、ポータブル電源の純正ケーブル・充電に関する
// 公的機関の注意は、確認できていないため載せない。
export const safetyEngine: SafetyFact[] = [
  { text: "発電機は屋内では絶対に使用しないでください。排ガスに一酸化炭素(CO)が含まれ、屋内で使うとCO中毒になるおそれがあります。", source: "NITE・消費者庁" },
  { text: "屋外であっても、自動車内やテント内で使うと屋内と同等以上の危険性があります。", source: "NITE・消費者庁" },
  { text: "排ガスが逆流しないよう、出入口や窓などの開口部から離れた、風通しの良い場所で使用してください。", source: "NITE・消費者庁" },
  { text: "屋外でも換気の悪い場所では使用しないでください。排気は建物や設備から1m以上離してください。", source: "本田技研工業(Honda)公式" },
  { text: "給油はエンジンを停止し、換気の良い火気のない場所で行います。ガソリンは金属製の携行缶で扱い、こぼしたときは拭き取って乾いてから始動します。", source: "本田技研工業(Honda)公式" },
  { text: "使用中や停止直後はマフラーが非常に熱くなります。触れたり物をのせたりしないでください。", source: "本田技研工業(Honda)公式" },
  { text: "ガソリン携行缶を直射日光の当たる車内に置くと内容物が60℃以上になり、内圧の上昇でガソリンが噴出するおそれがあります。", source: "国民生活センター" },
  { text: "停電から復旧した際は、電熱器具が可燃物に触れて発火する「通電火災」や、水没・破損した家電のショートによる発火にも注意してください。", source: "消費者庁" },
];

export const safetyPortable: SafetyFact[] = [
  { text: "ポータブル電源には可燃性の電解液を含むリチウムイオン電池が複数入っており、一度発火すると次々に発火して大きな火災につながるおそれがあります。", source: "NITE" },
  { text: "リコール対象の製品は、異常が認められなくても直ちに使用を中止し、販売店や製造事業者に連絡してください。", source: "NITE" },
  { text: "落下などの衝撃を与えないでください。衝撃後に発熱や変形が生じた場合は使用を中止し、事業者に相談してください。", source: "国民生活センター" },
  { text: "高温になる場所での使用・保管は控えてください。屋外で使う場合は、防水・防塵性能のある製品の使用を検討してください。", source: "国民生活センター" },
];

export const safetySources: SafetySource[] = [
  { org: "NITE(製品評価技術基盤機構)", title: "停電時の発電機によるCO中毒や、復旧後の通電火災に注意!", url: "https://www.nite.go.jp/jiko/chuikanki/press/2023fy/prs230829.html" },
  { org: "消費者庁", title: "停電時の発電機によるCO中毒や、復旧後の通電火災に注意!", url: "https://www.caa.go.jp/policies/policy/consumer_safety/caution/caution_070/" },
  { org: "NITE", title: "ポータブル電源「1.リコール製品に注意」", url: "https://www.nite.go.jp/jiko/chuikanki/poster/kaden/20240829.html" },
  { org: "国民生活センター", title: "災害時にも活躍 携帯発電機やポータブル電源の取り扱いに注意", url: "https://www.kokusen.go.jp/mimamori/mj_mailmag/mj-shinsen519.html" },
  { org: "国民生活センター", title: "ガソリン携行缶の取り扱いに注意", url: "https://www.kokusen.go.jp/news/data/n-20210218_2.html" },
  { org: "本田技研工業(Honda)", title: "発電機をご利用の際の注意事項", url: "https://www.honda.co.jp/generator/guide/" },
];

export interface ApplianceSource {
  org: string;
  title: string;
  url: string;
}

export const applianceSources: ApplianceSource[] = [
  { org: "東京電力エナジーパートナー", title: "家電製品の消費電力について知りたい", url: "https://support.tepco.co.jp/hc/ja/articles/10341601364889" },
  { org: "東北電力", title: "ご家庭のアンペアチェック", url: "https://www.tohoku-epco.co.jp/dprivate/inquery/ampere_check/" },
  { org: "NECプラットフォームズ", title: "Aterm WX6000HP / WX3000HP / WX1500HP 製品仕様", url: "https://www.aterm.jp/function/wx6000hp/appendix/spec.html" },
  { org: "大阪ガス", title: "電気毛布の電気代はいくら?", url: "https://home.osakagas.co.jp/column/electricity/appliance-cost/electric-blanket-electricity-bill/" },
  { org: "タイガー魔法瓶", title: "蒸気レス電気ケトル PCK-A081", url: "https://www.tiger-corporation.com/ja/jpn/product/kettle-pot/pck-a1/" },
  { org: "シャープ", title: "冷蔵庫 よくあるご質問(停電&省電力)", url: "https://cs.sharp.co.jp/faq/qa?qid=161662" },
];

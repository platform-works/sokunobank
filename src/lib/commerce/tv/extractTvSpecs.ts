// テレビの仕様を、商品名と出品者の商品説明に「明記されている語」から読み取る(2026-10-25)。
// Yahoo!ショッピングAPIは仕様を構造化して返さないため、記載の有無だけを判定する。
// 方針: 記載があれば true、記載がなければ null(= 未確認)。「記載がない = 非対応」とは決めつけない。
// 例外はチューナーレス(商品名に明記)で、放送を受信できないことが明記されているため false にする。
// 判定は保守的に行い、迷う表記(「4K対応」だけ等)は確認済みにしない。

export type TvResolution = "4K" | "フルHD" | "HD";
export type TvPanel = "有機EL" | "Mini LED" | "量子ドット" | "液晶";

export interface TvSpecs {
  /** 画面サイズ(V型/インチ)。商品名に1つだけ明記された場合のみ */
  sizeV: number | null;
  /** 画面の解像度。「4Kチューナー内蔵」だけの記載では4K画面とは決めない */
  resolution: TvResolution | null;
  panel: TvPanel | null;
  /** 地上デジタル放送の受信。チューナーレスは false、記載がなければ null */
  terrestrial: boolean | null;
  /** BS・110度CSデジタル放送の受信 */
  bsCs: boolean | null;
  /** BS4K・110度CS4K放送の受信(4Kチューナー内蔵の記載) */
  bs4k: boolean | null;
  /** 録画: "external" 外付けHDD(別売)に録画 / "built-in" 内蔵HDD・ブルーレイ / true 記載あり(方式は不明) */
  recording: "external" | "built-in" | boolean | null;
  /** 動画配信サービス(YouTube・Netflix等)・スマートテレビの記載 */
  streaming: boolean | null;
  /** ゲーム向け機能(ゲームモード・低遅延・120Hz等)の記載 */
  gaming: boolean | null;
  tunerless: boolean;
  /** 商品名から読み取れた型番(確かでなければnull) */
  model: string | null;
  /** メーカー・ブランド名(商品名またはAPIのブランド名から。判別できなければnull) */
  maker: string | null;
  /** 注意が必要な商品の状態・条件(商品名にある場合) */
  flags: TvFlag[];
  /** 保証の記載(商品名にある場合) */
  warranty: string | null;
  /** 設置サービスの記載(商品名にある場合) */
  installation: string | null;
}

export type TvFlag = "used-or-damaged" | "area-limited" | "pre-order";

const norm = (s: string): string =>
  s
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/　/g, " ");

function extractSize(name: string): number | null {
  const found = new Set<number>();
  const re = /(\d{2,3})\s*(?:[Vv]\s*型|型|インチ|inch|吋)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(name))) {
    const n = Number(m[1]);
    if (n >= 10 && n <= 120) found.add(n);
  }
  // 「32〜65インチ対応」のような幅のある表記(主にテレビ台)や、複数サイズの混在は断定しない
  if (/\d{2,3}\s*[~〜\-－]\s*\d{2,3}\s*(?:V型|型|インチ)/.test(name)) return null;
  return found.size === 1 ? [...found][0] : null;
}

function extractResolution(text: string): TvResolution | null {
  // 「4Kチューナー内蔵」「4K放送」は放送の受信機能であり、画面が4Kとは限らない表記のため除く
  const withoutTuner = text.replace(/4K\s*(?:ダブル|W)?\s*チューナー|BS\s*4K|110度CS\s*4K|4K\s*(?:衛星)?放送|新4K衛星放送|4K\s*8K/gi, "");
  if (/4K|UHD|2160p|3840/i.test(withoutTuner)) return "4K";
  if (/フルハイビジョン|フルHD|FHD|1080p|1920/i.test(text)) return "フルHD";
  if (/ハイビジョン|(?<![A-Za-z])HD(?![A-Za-z])/.test(text)) return "HD";
  return null;
}

function extractPanel(text: string): TvPanel | null {
  if (/有機EL|OLED/i.test(text)) return "有機EL";
  if (/mini\s*-?\s*LED|ミニLED/i.test(text)) return "Mini LED";
  if (/量子ドット|QLED|Quantum/i.test(text)) return "量子ドット";
  if (/液晶/.test(text)) return "液晶";
  return null;
}

const MAKERS: [string, RegExp][] = [
  ["REGZA(レグザ)", /REGZA|レグザ|東芝|TOSHIBA/i],
  ["ソニー", /BRAVIA|ブラビア|ソニー|SONY/i],
  ["パナソニック", /VIERA|ビエラ|パナソニック|Panasonic/i],
  ["シャープ", /AQUOS|アクオス|シャープ|SHARP/i],
  ["ハイセンス", /ハイセンス|Hisense/i],
  ["TCL", /\bTCL\b/i],
  ["LG", /\bLG\b|エルジー/i],
  ["三菱電機", /三菱|REAL\b/i],
  ["JVC", /\bJVC\b/i],
  ["FUNAI(フナイ)", /FUNAI|フナイ|船井/i],
  ["アイリスオーヤマ", /アイリスオーヤマ|IRIS/i],
  ["MAXZEN(マクスゼン)", /MAXZEN|マクスゼン/i],
  ["山善", /山善|YAMAZEN/i],
  ["Xiaomi", /Xiaomi|シャオミ/i],
  ["CHiQ", /CHiQ/i],
  ["TEES", /\bTEES\b/i],
  ["ドウシシャ", /ドウシシャ|DOSHISHA/i],
  ["オリオン", /ORION|オリオン/i],
];

export function detectMaker(name: string, apiBrand?: string | null): string | null {
  // 商品名の中で最も先に出てくるメーカー名を採る(「MAXZEN … 東芝ボード内蔵」のように他社名が後ろに入る商品があるため)。
  const text = `${norm(name)} ${apiBrand ?? ""}`;
  let best: { label: string; index: number } | null = null;
  for (const [label, re] of MAKERS) {
    const m = re.exec(text);
    if (m && (best === null || m.index < best.index)) best = { label, index: m.index };
  }
  return best ? best.label : null;
}

const MODEL_STOP = /^(?:4K|8K|HDMI|USB|UHD|YOUTUBE|NETFLIX|BLUETOOTH|WIFI|WI-FI|ANDROID|GOOGLE|CHROMECAST|AIRPLAY|FIRE|AMAZON|PRIME|ABEMA|LED|HDR|HDR10|BS|CS|TV|DVD|WIDE)/i;

function extractModel(name: string): string | null {
  const n = norm(name);
  const re = /(?<![A-Za-z0-9-])(?=[A-Z0-9-]*[A-Z])(?=[A-Z0-9-]*\d)[A-Z0-9][A-Z0-9-]{4,}(?![A-Za-z0-9-])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(n))) {
    const t = m[0].replace(/-+$/, "");
    if (t.length < 5 || MODEL_STOP.test(t)) continue;
    if (/^\d+(?:V|K)?$/i.test(t)) continue;
    return t;
  }
  return null;
}

export function extractTvSpecs(rawName: string, rawDescription = "", apiBrand?: string | null): TvSpecs {
  const name = norm(rawName);
  const desc = norm(rawDescription);
  // 仕様の判定は商品名を優先し、説明文は補助にする。説明文には他機種の仕様や関連語の羅列が混ざることがあるため、
  // 説明文だけを根拠にするのは「放送・録画・配信」のような一般的な機能語に限り、サイズ・解像度・型番は商品名だけで読む。
  const both = `${name} ${desc}`;

  const tunerless = /チューナーレス|チューナー\s*(?:無し|なし|レス|非搭載)|地デジ\s*(?:非対応|なし)/.test(name);

  const bs4kPositive = /BS\s*4K|110度CS\s*4K|4K\s*(?:ダブル|W|ツイン)?\s*チューナー\s*(?:内蔵|搭載)|4K\s*(?:衛星)?放送|新4K衛星放送|4K\s*チューナー\s*(?:内蔵|搭載)/i;
  const terrestrialPositive = /地上\s*(?:デジタル|D\b|波|・)|地デジ|3波|BS\s*[・/]\s*CS/;
  const bsPositive = /(?:地上[^ ]{0,12})?BS|110度\s*CS|BS\s*・\s*CS|3波/;

  const recordingBuiltIn = /ブルーレイ\s*(?:レコーダー)?\s*内蔵|BD\s*内蔵|HDD\s*内蔵|内蔵\s*HDD/i;
  const recordingExternal = /外付け?\s*HDD|USB\s*-?\s*HDD|USBハードディスク|裏番組録画|裏録|HDD録画|録画対応|録画機能|タイムシフト|録画\s*(?:可能|OK)/i;

  let recording: TvSpecs["recording"] = null;
  if (tunerless) recording = null;
  else if (recordingBuiltIn.test(both)) recording = "built-in";
  else if (recordingExternal.test(name) || /裏番組録画|USB\s*-?\s*HDD|外付け\s*HDD/.test(desc)) recording = "external";

  const streamingRe = /YouTube|Netflix|ネット動画|動画配信|Prime\s*Video|Fire\s*TV|Google\s*TV|Android\s*TV|Googleテレビ|スマートテレビ|スマートTV|TVer|U-NEXT|Hulu|Disney\+|ABEMA|VOD/i;
  const gamingRe = /ゲームモード|ゲーム\s*(?:機能|向け|アシスト)|低遅延|120\s*Hz|144\s*Hz|120p|VRR|ALLM|ゲーミング|ゲーム\s*コントロール/i;

  const flags: TvFlag[] = [];
  if (/B級品|梱包B|訳あり|アウトレット|中古|展示品|箱破損|箱汚れ|開封済|リユース|整備済|ジャンク|難あり/.test(name)) flags.push("used-or-damaged");
  if (/限定エリア|エリア限定|配送エリア|配達エリア|エリアのみ|エリア以外.{0,8}キャンセル/.test(name)) flags.push("area-limited");
  if (/予約|発売予定|入荷待ち/.test(name)) flags.push("pre-order");

  const warranty = (/((?:\d+年|延長|メーカー|長期)\s*保証[^ ]{0,8})/.exec(name) ?? [])[1] ?? null;
  const installation = (/(標準設置(?:無料|料金込み?|込み)?|設置(?:無料|料金込み?|込み)|大型家財便)/.exec(name) ?? [])[1] ?? null;

  return {
    sizeV: extractSize(name),
    resolution: extractResolution(name),
    panel: extractPanel(name),
    terrestrial: tunerless ? false : terrestrialPositive.test(both) ? true : null,
    bsCs: tunerless ? false : bsPositive.test(name) ? true : null,
    bs4k: tunerless ? false : bs4kPositive.test(both) ? true : null,
    recording,
    streaming: streamingRe.test(both) ? true : null,
    gaming: gamingRe.test(both) ? true : null,
    tunerless,
    model: extractModel(rawName),
    maker: detectMaker(rawName, apiBrand),
    flags,
    warranty,
    installation,
  };
}

// 商品名から画面サイズ(インチ)と解像度を抽出する(PCモニターカテゴリー専用、2026-10-24導入)。
// Yahoo!ショッピングAPIに構造化された仕様フィールドは無いため、商品名に明確に書かれている場合だけ拾い、
// 曖昧な場合は推測せずnullを返す(実データ約350件で確認した表記の揺れに合わせている)。
export interface MonitorSpecs {
  /** 画面サイズ(インチ) */
  sizeInch: number | null;
  /** 解像度の区分。4k=4K/UHD(3840×2160)、qhd=WQHD/QHD/UWQHD(2560×1440・3440×1440)、fhd=フルHD(1920×1080) */
  resolution: "4k" | "qhd" | "fhd" | null;
}

export function extractMonitorSpecs(rawName: string): MonitorSpecs {
  const name = String(rawName || "").normalize("NFKC");

  // 画面サイズ。「27インチ」「27型」の表記を拾う。「21〜23インチ」のような範囲(範囲の途中の数字)は採用しない。
  // 販売者が「21.5インチ」と「21.45型」を併記する場合など、0.5インチ以内の差は同じ機種とみなし大きい方を採用する。
  const sizes = new Set<number>();
  const re = /(\d+(?:\.\d+)?)\s*(?:インチ|型|inch)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(name))) {
    const before = name.slice(Math.max(0, m.index - 1), m.index);
    if (/[〜~\-–]/.test(before)) continue;
    sizes.add(Number(m[1]));
  }
  const sorted = Array.from(sizes).sort((a, b) => a - b);
  let sizeInch: number | null = null;
  if (sorted.length > 0 && sorted[sorted.length - 1] - sorted[0] <= 0.5) sizeInch = sorted[sorted.length - 1];
  if (sizeInch !== null && (sizeInch < 7 || sizeInch > 100)) sizeInch = null;

  // 解像度。商品名の語だけで判定し、相反する語が同居する場合は分類しない。
  const has4k = /(?<![A-Za-z0-9])4K(?![A-Za-z0-9])|3840\s*[x×]\s*2160|(?<![A-Za-z])UHD/i.test(name);
  const hasQhd = /WQHD|(?<![A-Za-z])QHD|2560\s*[x×]\s*1440|3440\s*[x×]\s*1440/i.test(name);
  const hasFhd = /フル\s*HD|(?<![A-Za-z])FHD|1920\s*[x×]\s*1080|1080P/i.test(name);
  let resolution: MonitorSpecs["resolution"] = null;
  if (has4k && !hasQhd && !hasFhd) resolution = "4k";
  else if (hasQhd && !has4k && !hasFhd) resolution = "qhd";
  else if (hasFhd && !has4k && !hasQhd) resolution = "fhd";

  return { sizeInch, resolution };
}

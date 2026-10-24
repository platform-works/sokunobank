// 商品名から炊飯容量(合)と加熱方式を抽出する(炊飯器カテゴリー専用、2026-10-24導入)。
// Yahoo!ショッピングAPIに構造化された仕様フィールドは無いため、商品名に明確に書かれている場合だけ拾い、
// 曖昧な場合は推測せずnullを返す(実データ約500件で確認した表記の揺れに合わせている)。
export interface RiceCookerSpecs {
  /** 炊飯容量(合)。0.5合単位 */
  capacityGo: number | null;
  productType: "pressure-ih" | "ih" | "micom" | "gas" | null;
}

export function extractRiceCookerSpecs(rawName: string): RiceCookerSpecs {
  const name = String(rawName || "").normalize("NFKC");

  // 容量。「N合炊き」の表記を優先し、無ければ「N合」が1種類だけのときに採用する。
  // 「1〜3合炊き」のような範囲、「1合 2合 3合」のような炊き分けの列挙は、容量ではないため採用しない。
  const values = new Set<number>();
  const collect = (re: RegExp) => {
    let m: RegExpExecArray | null;
    while ((m = re.exec(name))) {
      const before = name.slice(Math.max(0, m.index - 1), m.index);
      // 範囲の途中、または「レビューで米2合プレゼント」のような景品の量は容量ではない
      if (/[〜~\-–米]/.test(before)) continue;
      values.add(Number(m[1]));
    }
  };
  collect(/(\d+(?:\.\d+)?)\s*合\s*炊/g);
  if (/(?:一升|1升)\s*炊/.test(name)) values.add(10);
  if (values.size === 0) {
    collect(/(\d+(?:\.\d+)?)\s*合/g);
    if (/一升|1升/.test(name)) values.add(10);
  } else if (values.size === 1) {
    // 「3合炊き」と別の箇所の「3.5合」の併記は、同じ機種の正式な容量(3.5合)。一升が別に並ぶ場合は複数機種の併記
    const v = Array.from(values)[0];
    if (new RegExp("(?<![\\d.])" + (v + 0.5) + "\\s*合").test(name)) values.add(v + 0.5);
    else if (v !== 10 && /一升|1升|(?<![\d.])10\s*合/.test(name)) values.add(10);
  }
  // 5合と5.5合、3合と3.5合のように、同じ機種を販売者が両方の表記で書く場合は、大きい方を容量とする
  const sorted = Array.from(values).sort((a, b) => a - b);
  let capacityGo: number | null = null;
  if (sorted.length === 1) capacityGo = sorted[0];
  else if (sorted.length === 2 && sorted[1] - sorted[0] === 0.5) capacityGo = sorted[1];
  if (capacityGo !== null && (capacityGo < 0.5 || capacityGo > 10)) capacityGo = null;

  // 加熱方式。商品名の語だけで判定し、相反する語が同居する場合は分類しない。
  const hasGas = /ガス炊飯|都市ガス|プロパンガス|LPG/i.test(name);
  const hasPressure = /圧力\s*IH|圧力式/i.test(name);
  const hasIh = /(?<![A-Za-z])IH(?![A-Za-z])/i.test(name);
  const hasMicom = /マイコン/.test(name);
  let productType: RiceCookerSpecs["productType"] = null;
  if (hasGas && !hasPressure && !hasIh && !hasMicom) productType = "gas";
  else if (hasPressure && !hasMicom && !hasGas) productType = "pressure-ih";
  else if (hasIh && !hasPressure && !hasMicom && !hasGas) productType = "ih";
  else if (hasMicom && !hasIh && !hasPressure && !hasGas) productType = "micom";

  return { capacityGo, productType };
}

// 商品名から容量(Wh)・定格出力(W)・タイプを抽出する(発電機カテゴリー専用、2026-09-30導入)。
// Yahoo!ショッピングAPIに構造化された仕様フィールドは無いため、商品名に「単位付きの明確な数値」が
// 書かれている場合だけ拾い、曖昧な場合は推測せずnullを返す。
//
// この関数はソース文字列としてブラウザへ埋め込む(GeneratorCardExtension.astro)ため、
// 外部の変数・関数を一切参照しない自己完結にしておくこと。
export interface ExtractedSpecs {
  capacityWh: number | null;
  ratedPowerW: number | null;
  /** 表示用の出力表記("2200W" または W換算しない"3.05kVA")。抽出できなければnull */
  outputLabel: string | null;
  productType: "portable" | "gasoline" | "cassette" | null;
}

export function extractSpecs(rawName: string): ExtractedSpecs {
  const name = String(rawName || "").normalize("NFKC");
  const num = "(\\d+(?:,\\d{3})*(?:\\.\\d+)?)";
  const toNum = (s: string) => Number(s.replace(/,/g, ""));
  const uniq = (xs: number[]) => Array.from(new Set(xs));
  const isPanelContext = (text: string, index: number) => /(パネル|ソーラー|太陽光)$/.test(text.slice(Math.max(0, index - 8), index).replace(/\s+/g, ""));
  const isMaxContext = (text: string, index: number) => /最大|瞬間|瞬時|ピーク|サージ|最高/.test(text.slice(Math.max(0, index - 6), index));

  // 容量(Wh / kWh)。値が複数(拡張バッテリー同梱等)の場合は曖昧なので採用しない。
  const whVals: number[] = [];
  const whRe = new RegExp(num + "\\s*(k?)Wh(?![a-zA-Z])", "gi");
  let m: RegExpExecArray | null;
  while ((m = whRe.exec(name))) {
    whVals.push(toNum(m[1]) * (m[2] ? 1000 : 1));
  }
  const whU = uniq(whVals);
  const capacityWh = whU.length === 1 && whU[0] >= 10 && whU[0] <= 100000 ? Math.round(whU[0]) : null;

  // タイプ。商品名の語だけで判定し、相反する語が同居する場合は分類しない。
  const hasCassette = /カセットボンベ|カセットガス/.test(name);
  const hasEngine = /ガソリン|エンジン発電機|4ストローク|ディーゼル/.test(name);
  const hasPortable = /ポータブル電源|ポータブルバッテリー|蓄電池/.test(name);
  let productType: ExtractedSpecs["productType"] = null;
  if (hasCassette && !hasPortable) productType = "cassette";
  else if (hasEngine && !hasCassette && !hasPortable) productType = "gasoline";
  else if (hasPortable && !hasEngine && !hasCassette) productType = "portable";

  // 出力(W / kVA)。Whの記述は先に取り除き、"2048Wh"が"W"として誤検出されないようにする。
  const noWh = name.replace(new RegExp(num + "\\s*k?Wh(?![a-zA-Z])", "gi"), " ");
  const wVals: number[] = [];
  const kvaVals: number[] = [];

  const labeledRe = new RegExp("(定格出力|連続出力|AC出力|定格|出力)\\s*[:：]?\\s*" + num + "\\s*(kVA|kW|W)(?![a-zA-Z])", "gi");
  let anyLabeled = false;
  while ((m = labeledRe.exec(noWh))) {
    const label = m[1];
    if (isMaxContext(noWh, m.index)) continue;
    if (isPanelContext(noWh, m.index)) continue;
    // "USB-C出力100W"のような付属ポート出力を拾わないよう、素の"出力"の直前が英数字・ハイフンなら除外
    if (label === "出力" && m.index > 0 && /[A-Za-z0-9-]/.test(noWh.charAt(m.index - 1))) continue;
    anyLabeled = true;
    const unit = m[3].toLowerCase();
    const v = toNum(m[2]);
    if (unit === "kva") kvaVals.push(v);
    else wVals.push(unit === "kw" ? v * 1000 : v);
  }

  // ラベル付きが無い場合のみ、単位付き数値が1種類だけのときに限って採用する。ポータブル電源の商品名には
  // ソーラーパネル(例:200W)やUSB出力(例:65W)のWが混在するため、ラベル無しのWはエンジン式発電機に限る。
  // ポータブル電源は「1024Wh/1800W」「2048Wh 2400W」のようにWhの直後に出力Wを続ける表記が慣用的なため、
  // Whの直後(区切りは空白・スラッシュ・読点のみ)に置かれたWだけを採用する。Whが複数ある場合は採用しない。
  if (!anyLabeled && productType === "portable" && whVals.length === 1) {
    const adj = new RegExp(num + "\\s*k?Wh(?![a-zA-Z])[\\s/・,、]{0,3}" + num + "\\s*(kW|W)(?![a-zA-Z])", "i").exec(name);
    // 区切りは記号・空白のみなので「最大」「瞬間」等の語を挟む表記(=定格ではない値)はここにマッチしない
    // ソーラーパネル(例:「1070Wh 100W ソーラーパネル」)のWを取り違えないよう、出力が容量(Wh)の
    // 0.2倍に満たない値は採用しない(実データ約340件の目視確認で、パネル出力の誤検出をこれで除外できた)。
    if (adj) {
      const w = adj[3].toLowerCase() === "kw" ? toNum(adj[2]) * 1000 : toNum(adj[2]);
      const after = name.slice((adj.index || 0) + adj[0].length, (adj.index || 0) + adj[0].length + 8);
      // 直後にUSB/PD/ポートやソーラーパネルの語が続く値は、本体の出力ではなく付属ポート・パネルの出力
      const isAccessory = /^\s*(USB|PD|Type|ポート|充電|ソーラー|パネル|太陽光)/i.test(after);
      if (w >= whVals[0] * 0.2 && !isAccessory) wVals.push(w);
    }
  }
  if (!anyLabeled && (productType === "gasoline" || productType === "cassette")) {
    const bareRe = new RegExp(num + "\\s*(kVA|kW|W)(?![a-zA-Z])", "gi");
    while ((m = bareRe.exec(noWh))) {
      if (isMaxContext(noWh, m.index)) continue;
      if (m.index > 0 && /[A-Za-z-]/.test(noWh.charAt(m.index - 1))) continue; // "PD60W"等
      const unit = m[2].toLowerCase();
      const v = toNum(m[1]);
      if (unit === "kva") kvaVals.push(v);
      else wVals.push(unit === "kw" ? v * 1000 : v);
    }
  }

  const wU = uniq(wVals);
  const ratedPowerW = wU.length === 1 && wU[0] >= 50 && wU[0] <= 30000 ? Math.round(wU[0]) : null;
  const kvaU = uniq(kvaVals);
  const outputLabel = ratedPowerW !== null ? ratedPowerW.toLocaleString("en-US") + "W" : kvaU.length === 1 ? kvaU[0] + "kVA" : null;

  return { capacityWh, ratedPowerW, outputLabel, productType };
}

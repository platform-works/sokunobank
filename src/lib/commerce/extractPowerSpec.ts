// 商品名から出力(W/kVA)表記を抽出する表示補助関数(2026-09-28、発電機カテゴリー専用に導入)。
// 商品データに構造化された出力フィールドは無いため、実際の商品名に含まれている表記を
// そのまま抜き出すだけで、値を推測・生成することは一切しない。抽出できない場合はnullを返し、
// 呼び出し側はその商品の出力表示を自然に省略する(架空のスペックを表示しないため)。
//
// "2048Wh"(バッテリー容量、Whの誤検出)を"W"表記と混同しないよう否定先読みで除外している。
export function extractPowerSpec(name: string): string | null {
  const patterns = [
    /定格出力\s*([0-9.]+\s*(?:kVA|kW|W))/i,
    /定格\s*([0-9.]+\s*(?:kVA|kW|W))/i,
    /出力\s*([0-9.]+\s*(?:kVA|kW|W))/i,
    /([0-9.]+\s*kVA)/i,
    /([0-9]{3,5}\s*W)(?!h)/i,
  ];
  for (const pattern of patterns) {
    const m = name.match(pattern);
    if (m && m[1]) return m[1].replace(/\s+/g, "");
  }
  return null;
}

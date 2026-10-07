import { describe, expect, it } from "vitest";
import { extractSpecs } from "../src/lib/commerce/extractSpecs";

describe("extractSpecs", () => {
  it("容量と定格出力を単位付き数値から抽出する", () => {
    const r = extractSpecs("Jackery ポータブル電源 2000 New 2042Wh 定格2200W 瞬間最大4400W");
    expect(r.capacityWh).toBe(2042);
    expect(r.ratedPowerW).toBe(2200);
    expect(r.productType).toBe("portable");
  });

  it("ソーラーパネルのWを本体の定格出力として拾わない(ポータブル電源のラベル無しWは採用しない)", () => {
    const r = extractSpecs("Jackery Solar Generator 1500 New 1536Wh ポータブル電源 200W ソーラーパネル 1枚 2点セット");
    expect(r.capacityWh).toBe(1536);
    expect(r.ratedPowerW).toBeNull();
    expect(extractSpecs("ポータブル電源 1024Wh 160Wソーラーパネル付き 定格出力1500W").ratedPowerW).toBe(1500);
    expect(extractSpecs("ポータブル電源 1024Wh ソーラーパネル 定格出力200W").ratedPowerW).toBeNull();
  });

  it("Whの直後に続くWは出力として採用するが、容量に対して小さすぎる値(パネル出力の疑い)は採用しない", () => {
    expect(extractSpecs("BLUETTI ポータブル電源 AC180 1152Wh 1800W 蓄電池").ratedPowerW).toBe(1800);
    expect(extractSpecs("ポータブル電源 1024Wh/1800W(2700Wリフト)").ratedPowerW).toBe(1800);
    expect(extractSpecs("Jackery Solar Generator 1000 New 1070Wh 100W ポータブル電源 ソーラーパネル").ratedPowerW).toBeNull();
    expect(extractSpecs("Jackery Solar Generator 2000New V2 2048Wh 200W ポータブル電源 ソーラーパネル セット").ratedPowerW).toBeNull();
    expect(extractSpecs("ポータブル電源 1024Wh 最大3000W").ratedPowerW).toBeNull();
  });

  it("エンジン式以外でラベル無しのWだけがある場合は採用しない", () => {
    expect(extractSpecs("発電機 インバーター 2000W").ratedPowerW).toBeNull();
  });

  it("Whを出力Wと取り違えない", () => {
    const r = extractSpecs("ポータブル電源 288Wh 大容量");
    expect(r.capacityWh).toBe(288);
    expect(r.ratedPowerW).toBeNull();
  });

  it("最大出力だけ書かれている場合は定格として採用しない", () => {
    const r = extractSpecs("インバーター発電機 最大出力3500W 定格出力3.05kVA ガソリン");
    expect(r.ratedPowerW).toBeNull();
    expect(r.outputLabel).toBe("3.05kVA");
    expect(r.productType).toBe("gasoline");
  });

  it("ラベル無しの単位付き数値が1種類なら採用する", () => {
    const r = extractSpecs("EENOUR 発電機 インバーター 3000W エンジン発電機 3.0kVA");
    expect(r.ratedPowerW).toBe(3000);
  });

  it("ラベル無しで複数の異なるW値がある場合は採用しない", () => {
    const r = extractSpecs("ポータブル電源 100Wh 65W USB-C 140W");
    expect(r.capacityWh).toBe(100);
    expect(r.ratedPowerW).toBeNull();
  });

  it("付属ポートの出力(USB-C出力)を定格として拾わない", () => {
    const r = extractSpecs("ポータブル電源 500Wh 定格出力300W USB-C出力100W");
    expect(r.ratedPowerW).toBe(300);
  });

  it("Whが複数(拡張バッテリー等)なら採用しない", () => {
    expect(extractSpecs("ポータブル電源 1000Wh 拡張バッテリー 2000Wh").capacityWh).toBeNull();
  });

  it("kWhをWhに換算する", () => {
    expect(extractSpecs("大容量ポータブル電源 2.5kWh").capacityWh).toBe(2500);
  });

  it("mAhは容量Whとして扱わない", () => {
    const r = extractSpecs("モバイルバッテリー 20000mAh");
    expect(r.capacityWh).toBeNull();
    expect(r.ratedPowerW).toBeNull();
  });

  it("全角の数値・単位を正規化して抽出する", () => {
    expect(extractSpecs("ポータブル電源 ２０４８Ｗｈ").capacityWh).toBe(2048);
  });

  it("タイプ: カセットガスとガソリンと相反する語が同居する場合は分類しない", () => {
    expect(extractSpecs("カセットボンベ式 インバーター発電機").productType).toBe("cassette");
    expect(extractSpecs("ポータブル電源 ガソリン発電機の代替").productType).toBeNull();
    expect(extractSpecs("発電機 インバーター").productType).toBeNull();
  });
});

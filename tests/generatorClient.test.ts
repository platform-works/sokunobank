import { describe, expect, it } from "vitest";
import {
  buildTrackParams,
  capacityBands,
  deliveryText,
  filterBySelection,
  inRange,
  powerBands,
  type Selection,
} from "../src/lib/commerce/generatorClient";

const none: Selection = { useCase: null, type: null, capacity: null, power: null };
const mk = (name: string) => ({ name, deliveryDay: 1, storeName: "店" });

describe("generatorClient", () => {
  it("帯は閉区間で、境界値は両隣の帯に含まれる", () => {
    expect(inRange(500, capacityBands[0])).toBe(true);
    expect(inRange(500, capacityBands[1])).toBe(true);
    expect(inRange(2000, capacityBands[3])).toBe(true);
    expect(inRange(null, capacityBands[0])).toBe(false);
    expect(inRange(null, null)).toBe(true);
  });

  it("絞り込みなしなら全件を返す", () => {
    const items = [mk("A"), mk("B")];
    expect(filterBySelection(items, none)).toEqual({ visible: items, unknown: 0 });
  });

  it("容量で絞り込み、値を確認できない商品は分類せずunknownとして数える", () => {
    const a = mk("ポータブル電源 300Wh 定格300W");
    const b = mk("ポータブル電源 1000Wh 定格1000W");
    const c = mk("ポータブル電源 大容量");
    const r = filterBySelection([a, b, c], { ...none, capacity: capacityBands[0] });
    expect(r.visible).toEqual([a]);
    expect(r.unknown).toBe(1);
  });

  it("タイプと出力を組み合わせる", () => {
    const a = mk("ポータブル電源 1000Wh 定格1200W");
    const b = mk("ガソリン インバーター発電機 定格出力2000W");
    const r = filterBySelection([a, b], { ...none, type: "portable", power: powerBands[2] });
    expect(r.visible).toEqual([a]);
  });

  it("配送表示は判定日数とお届け先が分かる場合だけ作り、架空の日付を作らない", () => {
    expect(deliveryText(1, "13")).toBe("東京都宛て:明日お届け対象");
    expect(deliveryText(2, "27")).toBe("大阪府宛て:翌々日お届け対象");
    expect(deliveryText(null, "13")).toBeNull();
    expect(deliveryText(1, "")).toBeNull();
    expect(deliveryText(0, "13")).toBeNull();
  });

  it("GAパラメータは取得できない項目をundefinedにする", () => {
    const p = { name: "ポータブル電源 288Wh", deliveryDay: null, storeName: "" };
    const params = buildTrackParams(p, { ...none, useCase: "disaster" });
    expect(params.use_case).toBe("disaster");
    expect(params.capacity_wh).toBe(288);
    expect(params.power_w).toBeUndefined();
    expect(params.delivery_days).toBeUndefined();
    expect(params.shop_name).toBeUndefined();
  });
});

describe("用途による絞り込み", () => {
  it("商品名に用途の語が明記された商品だけを表示し、推測で分類しない", async () => {
    const { matchesUseCase } = await import("../src/lib/commerce/generatorClient");
    const a = mk("ポータブル電源 1024Wh 防災 停電対策");
    const b = mk("ポータブル電源 1024Wh");
    const r = filterBySelection([a, b], { ...none, useCase: "disaster" });
    expect(r.visible).toEqual([a]);
    expect(matchesUseCase("発電機 工事用 3000W", "work")).toBe(true);
    expect(matchesUseCase("発電機 3000W", "work")).toBe(false);
    expect(matchesUseCase("何でも", null)).toBe(true);
  });
});

describe("種類と容量の矛盾(エンジン式には容量表記がない)", () => {
  it("エンジン式を選ぶと容量を解除し、容量を後から指定すると種類を解除する", async () => {
    const { mergeSelection, capacityBands } = await import("../src/lib/commerce/generatorClient");
    const withCap = { ...none, capacity: capacityBands[0] };
    expect(mergeSelection(withCap, { type: "gasoline" }).capacity).toBeNull();
    expect(mergeSelection(withCap, { type: "portable" }).capacity).toEqual(capacityBands[0]);
    const withType = { ...none, type: "cassette" as const };
    expect(mergeSelection(withType, { capacity: capacityBands[1] }).type).toBeNull();
    expect(mergeSelection(withType, { power: null }).type).toBe("cassette");
  });
});

describe("0件時の案内用の範囲", () => {
  it("用途・種類で絞った商品のうち、値を確認できたものの最小/最大を返す", async () => {
    const { availableRanges } = await import("../src/lib/commerce/generatorClient");
    const items = [mk("ポータブル電源 300Wh 定格300W"), mk("ポータブル電源 2000Wh 定格2000W"), mk("ガソリン 発電機 3.0kVA")];
    const r = availableRanges(items, { ...none, type: "portable", capacity: capacityBands[3] });
    expect(r.capacity).toEqual({ min: 300, max: 2000 });
    expect(r.power).toEqual({ min: 300, max: 2000 });
    expect(availableRanges([mk("ガソリン 発電機 3.0kVA")], { ...none, type: "gasoline" }).power).toBeNull();
  });
});
